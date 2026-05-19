// POST /api/login { password } — sets the `app_session` cookie when the
// supplied password matches DASHBOARD_PASSWORD. Returns 401 on mismatch.
import { NextRequest, NextResponse } from 'next/server'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function expectedPassword(): string | null {
  return process.env.DASHBOARD_PASSWORD || process.env.APP_PASSWORD || null
}

export async function POST(req: NextRequest) {
  const expected = expectedPassword()
  if (!expected) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD not configured' }, { status: 500 })
  }
  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if ((body.password || '') !== expected) {
    // Constant-ish delay would be ideal, but the gate is anti-casual, not
    // anti-credential-stuffing — bots don't reach a Tailscale host.
    return NextResponse.json({ error: 'wrong password' }, { status: 401 })
  }
  const session = await signSession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: SESSION_COOKIE,
    value: session.value,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: session.ttlSec,
    // `secure: true` would block plain-HTTP local dev; rely on the reverse
    // proxy (or Tailscale) to provide transport security in production.
  })
  return res
}
