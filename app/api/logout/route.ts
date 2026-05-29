// POST /api/logout — clears the session cookie. Cookie attributes must match
// the ones set in /api/login (Path / Secure / SameSite) or some browsers will
// refuse to delete the existing cookie and the user stays logged in.
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, IDENTITY_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  for (const name of [SESSION_COOKIE, IDENTITY_COOKIE]) {
    res.cookies.set({
      name,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === '1',
    })
  }
  return res
}
