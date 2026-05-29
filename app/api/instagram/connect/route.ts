import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildAuthorizeUrl, instagramConfigured } from '@/lib/backend/instagram-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const STATE_COOKIE = 'ig_oauth_state'

// Kicks off the Instagram Business Login flow. Session-gated by middleware, so
// only a logged-in dashboard user can start it. Sets a short-lived state cookie
// for CSRF protection, then 302s to instagram.com for login + consent.
export async function GET() {
  if (!instagramConfigured()) {
    return NextResponse.json(
      { error: 'Instagram OAuth is not configured (missing INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET).' },
      { status: 500 }
    )
  }
  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(buildAuthorizeUrl(state))
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // sent on the top-level GET redirect back from instagram.com
    path: '/',
    maxAge: 600,
  })
  return res
}
