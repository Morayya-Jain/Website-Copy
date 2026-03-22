CREATE TABLE IF NOT EXISTS linking_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_linking_codes_code ON linking_codes(code) WHERE used = FALSE;

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_linking_codes_expires ON linking_codes(expires_at);

-- RLS: Only the service role should access this table (Edge Functions use service role key)
ALTER TABLE linking_codes ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role can access (which is what we want)
