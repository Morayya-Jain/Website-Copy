/**
 * Exchange a linking code for Supabase session tokens (desktop app).
 * Caller has no token yet. Deploy with --no-verify-jwt.
 * Tokens are stored encrypted (AES-256-GCM) and decrypted here before returning.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Production origins only; localhost is added automatically in local dev via DENO_ENV
const ALLOWED_ORIGINS = ["https://thebraindock.com"];
if (Deno.env.get("DENO_ENV") !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:5173", "http://localhost:4173");
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (allowOrigin) h["Access-Control-Allow-Origin"] = allowOrigin;
  return h;
}

// Linking code format: exactly XXXX-XXXX (9 chars: 8 alphanumeric + 1 dash)
const LINKING_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// -- Token decryption helpers (AES-256-GCM, matches generate-linking-code) --

/** Derive the same CryptoKey used during encryption. Fails fast if not set. */
async function getDecryptionKey(): Promise<CryptoKey> {
  const rawKey = Deno.env.get("LINKING_CODE_ENCRYPTION_KEY");
  if (!rawKey) {
    throw new Error("LINKING_CODE_ENCRYPTION_KEY is not set");
  }
  const keyBytes = new TextEncoder().encode(rawKey);
  const hash = await crypto.subtle.digest("SHA-256", keyBytes);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
}

/** Decrypt a base64(iv + ciphertext) string. Returns the original plaintext. */
async function decryptToken(encrypted: string): Promise<string> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// In-memory rate limiting per IP (max attempts per window)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

/** Check if an IP has exceeded the rate limit. Returns true if blocked. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Sweep expired entries to prevent unbounded memory growth
  if (ipAttempts.size > 50) {
    for (const [key, val] of ipAttempts) {
      if (now >= val.resetAt) ipAttempts.delete(key);
    }
  }
  const entry = ipAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_ATTEMPTS;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // SECURITY: Only POST is allowed; reject GET/others to avoid abuse
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: Per-IP rate limiting to prevent brute-force code guessing
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many attempts. Please wait and try again." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      }
    );
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: Destructure only `code`; ignore any other fields to avoid injection
  const rawCode = body?.code;
  const normalized =
    rawCode != null && typeof rawCode === "string"
      ? rawCode.trim().toUpperCase()
      : "";
  if (!normalized || normalized.length !== 9 || !LINKING_CODE_REGEX.test(normalized)) {
    return new Response(JSON.stringify({ error: "Missing or invalid code" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Atomic update: only one caller can claim this code (WHERE used = false)
  const { data, error } = await adminClient
    .from("linking_codes")
    .update({ used: true })
    .eq("code", normalized)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("access_token, refresh_token, user_id")
    .maybeSingle();

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired code" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Decrypt stored tokens before returning
  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = await decryptToken(data.access_token);
    refreshToken = await decryptToken(data.refresh_token);
  } catch (decryptErr) {
    console.error("[exchange-linking-code] Token decryption failed:", decryptErr);
    return new Response(
      JSON.stringify({ error: "Token decryption failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Optional: include email for desktop app display (admin API with service role)
  let email: string | undefined;
  try {
    const { data: userData } = await adminClient.auth.admin.getUserById(data.user_id);
    email = userData?.user?.email ?? undefined;
  } catch {
    // Non-fatal; tokens still valid
  }

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      ...(email != null && { email }),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
