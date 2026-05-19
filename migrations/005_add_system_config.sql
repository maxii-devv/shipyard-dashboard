-- Key/value store for runtime-mutable secrets that can't live in static env vars.
-- Used for the Instagram access token so n8n can auto-refresh it without
-- touching Vercel's env or triggering redeploys.

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
