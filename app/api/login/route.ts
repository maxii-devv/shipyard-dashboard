// POST /api/login { password } — sets the `app_session` cookie when the
// supplied password matches DASHBOARD_PASSWORD. Returns 401 on mismatch.
//
// Hardened against brute force:
//   - 20 failed attempts per IP per 15 min → 429 with Retry-After
//   - Constant-time password compare (no length / similarity timing leak)
//   - Random 100-300ms jitter on every response (success and failure) so
//     timing analysis can't distinguish "wrong password" from "rate-limited"
//     from "right password"
//   - Every attempt logged to login_attempts (IP + UA + outcome)
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { signSession, SESSION_COOKIE } from '@/lib/session'
import { checkLoginAttempt, recordLoginAttempt } from '@/lib/security/rate-limit'
import { readJsonGuarded } from '@/lib/security/body-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BODY_LIMIT = 4 * 1024 // login payload is tiny — 4 KiB is generous

function expectedPassword(): string | null {
  return process.env.DASHBOARD_PASSWORD || process.env.APP_PASSWORD || null
}

// X-Forwarded-For (when behind a reverse proxy) is a comma-separated list;
// the leftmost entry is the original client. Falls back to the connection IP
// the runtime hands us. We trust XFF only when a proxy is in front — set
// `TRUST_PROXY=1` to enable.
function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY === '1') {
    const xff = req.headers.get('x-forwarded-for')
    if (xff) return xff.split(',')[0]!.trim()
  }
  return req.headers.get('x-real-ip') || '0.0.0.0'
}

// Pad the response so all branches (rate-limited, wrong password, success)
// take roughly the same wall-clock time from the attacker's perspective.
async function jitter(): Promise<void> {
  // 100–300 ms. Cryptographically-random just to avoid being predictable.
  const buf = new Uint8Array(1)
  crypto.getRandomValues(buf)
  const ms = 100 + (buf[0]! % 200)
  await new Promise(r => setTimeout(r, ms))
}

function constantTimeStringEq(a: string, b: string): boolean {
  // Equal-length buffers required by timingSafeEqual; if lengths differ we
  // still need to do a comparable amount of work to avoid a length-based
  // timing channel.
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) {
    // Run the compare against a same-length scratch buffer so we still spend
    // CPU on it (negligibly few ns either way, but keeps the shape uniform).
    timingSafeEqual(ab, Buffer.alloc(ab.length))
    return false
  }
  return timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const ua = req.headers.get('user-agent') || ''

  const expected = expectedPassword()
  if (!expected) {
    await jitter()
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD not configured' }, { status: 500 })
  }

  // Rate-limit gate first — no point validating a body from a locked-out IP.
  const decision = await checkLoginAttempt(ip)
  if (!decision.allowed) {
    await jitter()
    return NextResponse.json(
      { error: 'too many attempts, try again later' },
      { status: 429, headers: { 'Retry-After': String(decision.retryAfterSec) } },
    )
  }

  const parsed = await readJsonGuarded<{ password?: string }>(req, BODY_LIMIT)
  if (!parsed.ok) {
    await jitter()
    return parsed.res
  }
  const supplied = String(parsed.data?.password || '')

  const match = supplied.length > 0 && constantTimeStringEq(supplied, expected)
  await recordLoginAttempt(ip, ua, match)

  if (!match) {
    await jitter()
    return NextResponse.json({ error: 'wrong password' }, { status: 401 })
  }

  const session = await signSession()
  const res = NextResponse.json({ ok: true })
  // `Secure` is opt-in via env — locks the cookie to HTTPS in production
  // while still allowing plain-HTTP dev / Tailscale-internal use. When the
  // dashboard sits behind Caddy or nginx-with-TLS, set COOKIE_SECURE=1.
  res.cookies.set({
    name: SESSION_COOKIE,
    value: session.value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === '1',
    path: '/',
    maxAge: session.ttlSec,
  })
  await jitter()
  return res
}
