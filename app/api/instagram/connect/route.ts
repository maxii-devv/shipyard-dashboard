import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildAuthorizeUrl, instagramConfigured } from '@/lib/backend/instagram-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const STATE_COOKIE = 'ig_oauth_state'

// Two purposes share this one OAuth round-trip:
//   - mode=connect (default) → store the long-lived token for data sync
//   - mode=login             → identity gate: verify the signed-in account is
//                              allowlisted, set the ig_identity cookie, and
//                              DO NOT touch the sync token
// The mode must survive the bounce to instagram.com, so we keep it server-side
// in the (httpOnly) state cookie as `<mode>.<random>` and only send <random> as
// the OAuth `state`. The callback splits it back out — the client can't forge a
// mode because it never sees the cookie.
export type OAuthMode = 'connect' | 'login'

// Kicks off the Instagram Business Login flow. Session-gated by middleware, so
// only a logged-in dashboard user can start it. Sets a short-lived state cookie
// for CSRF protection, then 302s to instagram.com for login + consent.
export async function GET(req: NextRequest) {
  if (!instagramConfigured()) {
    return NextResponse.json(
      { error: 'Instagram OAuth is not configured (missing INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET).' },
      { status: 500 }
    )
  }
  const mode: OAuthMode = req.nextUrl.searchParams.get('mode') === 'login' ? 'login' : 'connect'
  const nonce = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(buildAuthorizeUrl(nonce))
  res.cookies.set(STATE_COOKIE, `${mode}.${nonce}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // sent on the top-level GET redirect back from instagram.com
    path: '/',
    maxAge: 600,
  })
  return res
}
