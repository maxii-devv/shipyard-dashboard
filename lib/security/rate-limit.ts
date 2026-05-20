// DB-backed sliding-window rate limit for the login endpoint. Login attempts
// are rare enough that hitting Postgres on each one is fine, and DB state
// survives container restarts (in-memory limits would reset on every deploy).
//
// Schema: see migrations/011_login_attempts.sql.

import pool from '@/lib/backend/db'

export interface AttemptDecision {
  allowed: boolean
  recentFailures: number
  retryAfterSec: number
}

// Defaults are conservative: 20 failed attempts per IP per 15-minute window
// locks that IP out until the window slides. Overridable via env so a busy
// shared NAT can be loosened without redeploying code.
const WINDOW_SEC = Number(process.env.LOGIN_LOCKOUT_WINDOW_SEC || 15 * 60)
const MAX_FAILS = Number(process.env.LOGIN_MAX_FAILURES_PER_WINDOW || 20)

export async function checkLoginAttempt(ip: string): Promise<AttemptDecision> {
  const sql = `
    SELECT count(*)::int AS n
    FROM login_attempts
    WHERE ip = $1
      AND success = false
      AND created_at > now() - ($2 || ' seconds')::interval
  `
  try {
    const r = await pool.query(sql, [ip, String(WINDOW_SEC)])
    const n = r.rows[0]?.n ?? 0
    if (n >= MAX_FAILS) {
      return { allowed: false, recentFailures: n, retryAfterSec: WINDOW_SEC }
    }
    return { allowed: true, recentFailures: n, retryAfterSec: 0 }
  } catch {
    // If the DB is unreachable, fail open on the rate-limit decision — we'd
    // rather let a real user in than hard-lock the dashboard when Postgres
    // hiccups. The attempt itself will fail downstream if the DB is truly
    // down, since the session check / data loads also need it.
    return { allowed: true, recentFailures: 0, retryAfterSec: 0 }
  }
}

export async function recordLoginAttempt(ip: string, ua: string, success: boolean): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO login_attempts (ip, ua, success) VALUES ($1, $2, $3)',
      [ip, ua.slice(0, 500), success],
    )
  } catch {
    // Logging failure should never block a real login.
  }
}
