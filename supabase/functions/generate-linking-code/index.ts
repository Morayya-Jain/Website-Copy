/**
 * Generate a short-lived linking code for desktop app auth.
 * Called by the website after login (?source=desktop). Requires valid JWT - do NOT use --no-verify-jwt.
 * Tokens are encrypted with AES-256-GCM before storage in the linking_codes table.
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

// JWT-like tokens start with "ey" (base64 "ey...")
const MAX_TOKEN_LENGTH = 4096;

// -- Token encryption helpers (AES-256-GCM) --

/** Derive a CryptoKey from the LINKING_CODE_ENCRYPTION_KEY env var. Fails fast if not set. */
async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = Deno.env.get("LINKING_CODE_ENCRYPTION_KEY");
  if (!rawKey) {
    throw new Error("LINKING_CODE_ENCRYPTION_KEY is not set");
  }
  const keyBytes = new TextEncoder().encode(rawKey);
  // Hash to exactly 32 bytes for AES-256
  const hash = await crypto.subtle.digest("SHA-256", keyBytes);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt"]);
}

/** Encrypt a plaintext string. Returns base64(iv + ciphertext). */
async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Concatenate IV (12 bytes) + ciphertext and base64-encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

function isValidToken(s: unknown): s is string {
  if (typeof s !== "string" || !s.length) return false;
  if (s.length > MAX_TOKEN_LENGTH) return false;
  return s.trim().startsWith("ey");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // SECURITY: Only POST allowed
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { access_token?: unknown; refresh_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const access_token = body?.access_token;
  const refresh_token = body?.refresh_token;
  if (!isValidToken(access_token) || !isValidToken(refresh_token)) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = (access_token as string).trim();
  const refreshToken = (refresh_token as string).trim();

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(accessToken);
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: Rejection sampling to avoid modulo bias (chars.length !== 256 divisor)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const maxByte = 256 - (256 % chars.length);
  const randomValues = new Uint8Array(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    let b: number;
    do {
      crypto.getRandomValues(randomValues);
      b = randomValues[i]!;
    } while (b >= maxByte);
    code += chars[b % chars.length];
    if (i === 3) code += "-";
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Clean up expired or already-used codes to prevent unbounded table growth
  await adminClient.from("linking_codes").delete().lt("expires_at", new Date().toISOString());
  await adminClient.from("linking_codes").delete().eq("used", true);

  // SECURITY: Per-user limit — one active code at a time; delete any existing unused for this user
  await adminClient.from("linking_codes").delete().eq("user_id", user.id).eq("used", false);

  // Encrypt tokens before storing (defense-in-depth: protects against DB leaks)
  let encryptedAccess: string;
  let encryptedRefresh: string;
  try {
    encryptedAccess = await encryptToken(accessToken);
    encryptedRefresh = await encryptToken(refreshToken);
  } catch (encryptErr) {
    console.error("[generate-linking-code] Token encryption failed:", encryptErr);
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: insertData, error: insertError } = await adminClient
    .from("linking_codes")
    .insert({
      user_id: user.id,
      code,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select("code")
    .single();

  if (insertError || !insertData) {
    console.error("[generate-linking-code] Insert failed:", insertError);
    return new Response(JSON.stringify({ error: "Failed to create linking code" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ code: insertData.code }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
