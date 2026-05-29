import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForShortToken,
  exchangeForLongToken,
} from '@/lib/backend/instagram-oauth'
import { setInstagramToken, validateInstagramToken } from '@/lib/backend/instagram'
import { STATE_COOKIE } from '../connect/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bounce back to the dashboard with a result param the banner reads to show a
// success/error toast. Always clears the one-time state cookie.
function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL('/dashboard', req.nextUrl.origin)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = NextResponse.redirect(url)
  res.cookies.delete(STATE_COOKIE)
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // User declined consent, or Instagram returned an error.
  const oauthError = searchParams.get('error')
  if (oauthError) {
    return back(req, {
      ig: 'error',
      reason: searchParams.get('error_description') || oauthError,
    })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expected = req.cookies.get(STATE_COOKIE)?.value
  if (!code || !state || !expected || state !== expected) {
    return back(req, { ig: 'error', reason: 'invalid_state' })
  }

  try {
    const { token: shortToken } = await exchangeCodeForShortToken(code)
    const { token: longToken } = await exchangeForLongToken(shortToken)

    // Validate before storing so a broken token never replaces a working one.
    const check = await validateInstagramToken(longToken)
    if (!check.valid) {
      return back(req, { ig: 'error', reason: check.error || 'validation_failed' })
    }

    await setInstagramToken(longToken)
    return back(req, { ig: 'connected', user: check.username || '' })
  } catch (err) {
    return back(req, {
      ig: 'error',
      reason: err instanceof Error ? err.message : 'exchange_failed',
    })
  }
}
