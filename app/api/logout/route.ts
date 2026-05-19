// POST /api/logout — clears the session cookie.
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 })
  return res
}
