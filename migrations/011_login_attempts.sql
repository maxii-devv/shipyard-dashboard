-- 011_login_attempts.sql
-- Audit + rate-limit table for the password gate. Every POST /api/login
-- attempt inserts one row; the rate-limit decision counts recent failures
-- per IP in a sliding window (see lib/security/rate-limit.ts).
--
-- Retention: there is no auto-cleanup. A weekly cron can prune old rows:
--   DELETE FROM login_attempts WHERE created_at < now() - interval '90 days';

CREATE TABLE IF NOT EXISTS login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  ip          TEXT        NOT NULL,
  ua          TEXT        NOT NULL DEFAULT '',
  success     BOOLEAN     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimises the rate-limit lookup (`WHERE ip = $1 AND success = false AND
-- created_at > now() - interval`). Partial index on failures only, since
-- successful logins don't gate anything.
CREATE INDEX IF NOT EXISTS login_attempts_ip_failed_recent_idx
  ON login_attempts (ip, created_at DESC)
  WHERE success = false;

-- Forensic queries by recency.
CREATE INDEX IF NOT EXISTS login_attempts_created_at_idx
  ON login_attempts (created_at DESC);
