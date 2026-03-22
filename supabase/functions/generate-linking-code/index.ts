/**
 * Supabase Edge Function: generate a one-time linking code for desktop app authentication.
 *
 * The web client calls this after login to get a short alphanumeric code.
 * The desktop app redeems this code (via a separate redeem-linking-code function)
 * to obtain the user's auth tokens without requiring browser-based OAuth on desktop.
 *
 * Body: { access_token: string, refresh_token: string }
 * Returns: { code: string } (8-character alphanumeric code)
 *
 * Security: Bearer token auth, CORS restricted, per-user rate limit (5/min),
 * body size limit (4096 bytes), codes expire after 5 minutes.
 * Companion: a redeem-linking-code function is needed for the desktop app side.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Production origins only; localhost is added automatically in local dev via DENO_ENV
const ALLOWED_ORIGINS = ["https://thebraindock.com"]
if (Deno.env.get("DENO_ENV") !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:5173", "http://localhost:4173")
}

const MAX_BODY_BYTES = 4096
const CODE_LENGTH = 8
const CODE_EXPIRY_MINUTES = 5
const CLEANUP_THRESHOLD_MINUTES = 10
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I to avoid confusion

// In-memory per-user rate limit for linking code generation
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // max code generation attempts per minute
const userAttempts = new Map<string, { count: number; resetAt: number }>()

/** Check if a user has exceeded the code generation rate limit. Returns true if blocked. */
function isRateLimited(userId: string): boolean {
  const now = Date.now()

  // Sweep expired entries to prevent unbounded memory growth
  if (userAttempts.size > 50) {
    for (const [key, val] of userAttempts) {
      if (now >= val.resetAt) userAttempts.delete(key)
    }
  }

  const entry = userAttempts.get(userId)
  if (!entry || now >= entry.resetAt) {
    userAttempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  }
  if (allowOrigin) h["Access-Control-Allow-Origin"] = allowOrigin
  return h
}

/** Generate a random alphanumeric code that is easy to type manually. */
function generateCode(): string {
  const values = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => CODE_CHARSET[v % CODE_CHARSET.length]).join("")
}

serve(async (req) => {
  const requestOrigin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(requestOrigin)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }
  const withCors = (body: string, status: number) =>
    new Response(body, { status, headers: jsonHeaders })

  // Reject non-POST methods explicitly
  if (req.method !== "POST") {
    return withCors(JSON.stringify({ error: "Method not allowed" }), 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseAnonKey) {
    return withCors(JSON.stringify({ error: "Server configuration error" }), 500)
  }

  // Service role key is required for DB operations on linking_codes - fail fast if missing
  if (!supabaseServiceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set - linking code storage will fail")
    return withCors(JSON.stringify({ error: "Server configuration error" }), 500)
  }

  // --- Auth validation ---
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return withCors(JSON.stringify({ error: "Not authenticated" }), 401)
  }

  // Read body as text first to enforce size limit regardless of transfer encoding
  let rawText: string
  try {
    rawText = await req.text()
  } catch {
    return withCors(JSON.stringify({ error: "Could not read request body" }), 400)
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return withCors(JSON.stringify({ error: "Request body too large" }), 400)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return withCors(JSON.stringify({ error: "Invalid or expired session" }), 401)
  }

  // --- Rate limit ---
  if (isRateLimited(user.id)) {
    return new Response(
      JSON.stringify({ error: "Too many code requests. Please wait a moment." }),
      {
        status: 429,
        headers: { ...jsonHeaders, "Retry-After": "60" },
      }
    )
  }

  // --- Parse and validate body ---
  let rawBody: unknown
  try {
    rawBody = JSON.parse(rawText)
  } catch {
    return withCors(JSON.stringify({ error: "Invalid JSON body" }), 400)
  }

  if (rawBody === null || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return withCors(JSON.stringify({ error: "Body must be a JSON object" }), 400)
  }
  const body = rawBody as Record<string, unknown>
  const keys = Object.keys(body)
  const allowedKeys = ["access_token", "refresh_token"]
  if (!keys.every((k) => allowedKeys.includes(k))) {
    return withCors(JSON.stringify({ error: "Unexpected fields in body" }), 400)
  }

  const { access_token, refresh_token } = body
  if (typeof access_token !== "string" || access_token.length === 0) {
    return withCors(JSON.stringify({ error: "access_token is required and must be a string" }), 400)
  }
  if (typeof refresh_token !== "string" || refresh_token.length === 0) {
    return withCors(JSON.stringify({ error: "refresh_token is required and must be a string" }), 400)
  }

  // --- Generate code and store ---
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const code = generateCode()
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60_000).toISOString()

  // Clean up expired codes (older than 10 minutes) to prevent table bloat
  const cleanupThreshold = new Date(Date.now() - CLEANUP_THRESHOLD_MINUTES * 60_000).toISOString()
  const { error: cleanupError } = await supabaseAdmin
    .from("linking_codes")
    .delete()
    .lt("expires_at", cleanupThreshold)
  if (cleanupError) {
    // Log but don't fail the request - cleanup is best-effort
    console.error("Linking code cleanup failed:", cleanupError.message)
  }

  const { error: insertError } = await supabaseAdmin
    .from("linking_codes")
    .insert({
      code,
      user_id: user.id,
      access_token,
      refresh_token,
      expires_at: expiresAt,
      used: false,
    })

  if (insertError) {
    console.error("Failed to store linking code:", insertError.message)
    return withCors(JSON.stringify({ error: "Failed to generate linking code. Please try again." }), 500)
  }

  return new Response(JSON.stringify({ code }), {
    status: 200,
    headers: jsonHeaders,
  })
})
