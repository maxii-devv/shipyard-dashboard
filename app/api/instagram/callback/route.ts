import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForShortToken,
  exchangeForLongToken,
} from '@/lib/backend/instagram-oauth'
import { setInstagramToken, validateInstagramToken } from '@/lib/backend/instagram'
import { STATE_COOKIE, type OAuthMode } from '../connect/route'
import { signIdentity, isAllowedIgUser } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Result = { ok: boolean; mode: OAuthMode; user?: string; reason?: string }

// Return a tiny HTML page that hands the result back to the dashboard.
//
// The flow is opened in a popup window. When the popup lands here it
// postMessages the result to the opener and closes itself — the page that
// opened it never navigates. If there is no opener (the popup was blocked and
// we fell back to a full-page redirect), it navigates instead:
//   - login mode  → /dashboard on success (the identity cookie is now set),
//                    /verify?ig=error on failure (stay on the gate)
//   - connect mode → /dashboard?ig=… either way (the banner reads ?ig=)
// `identityCookie`, when present, is attached so an allowlisted login is
// remembered.
function respond(result: Result, identityCookie?: { name: string; value: string; ttlSec: number }) {
  let fallbackPath: string
  if (result.mode === 'login') {
    if (result.ok) {
      fallbackPath = '/dashboard'
    } else {
      const p = new URLSearchParams({ ig: 'error' })
      if (result.reason) p.set('reason', result.reason)
      fallbackPath = '/verify?' + p.toString()
    }
  } else {
    const p = new URLSearchParams({ ig: result.ok ? 'connected' : 'error' })
    if (result.user) p.set('user', result.user)
    if (result.reason) p.set('reason', result.reason)
    fallbackPath = '/dashboard?' + p.toString()
  }

  // `<` is escaped so a reason string can never break out of the <script>.
  const payload = JSON.stringify({ type: 'ig-oauth', ...result }).replace(/</g, '\\u003c')
  const fallback = JSON.stringify(fallbackPath).replace(/</g, '\\u003c')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Connecting Instagram…</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#262624;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p style="opacity:.7;font-size:14px">Finishing up — you can close this window.</p>
<script>
(function () {
  var result = ${payload};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(result, window.location.origin);
      window.close();
      return;
    }
  } catch (e) {}
  window.location.replace(${fallback});
})();
</script>
</body></html>`

  const res = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  res.cookies.delete(STATE_COOKIE)
  if (identityCookie) {
    res.cookies.set({
      name: identityCookie.name,
      value: identityCookie.value,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === '1',
      path: '/',
      maxAge: identityCookie.ttlSec,
    })
  }
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // Recover the mode + CSRF nonce from the httpOnly state cookie set by
  // /api/instagram/connect (`<mode>.<nonce>`).
  const rawState = req.cookies.get(STATE_COOKIE)?.value || ''
  const dot = rawState.indexOf('.')
  const mode: OAuthMode = rawState.slice(0, dot) === 'login' ? 'login' : 'connect'
  const expectedNonce = dot >= 0 ? rawState.slice(dot + 1) : ''

  // User declined consent, or Instagram returned an error.
  const oauthError = searchParams.get('error')
  if (oauthError) {
    return respond({ ok: false, mode, reason: searchParams.get('error_description') || oauthError })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state || !expectedNonce || state !== expectedNonce) {
    return respond({ ok: false, mode, reason: 'invalid_state' })
  }

  try {
    const { token: shortToken } = await exchangeCodeForShortToken(code)
    const { token: longToken } = await exchangeForLongToken(shortToken)

    // Validate before storing/granting so a broken token never replaces a
    // working one and an unknown account never gets in.
    const check = await validateInstagramToken(longToken)
    if (!check.valid) {
      return respond({ ok: false, mode, reason: check.error || 'validation_failed' })
    }
    const username = check.username || ''

    if (mode === 'login') {
      // Identity gate: only allowlisted accounts get a session. Never store the
      // token — this flow is purely "prove who you are", not "connect sync".
      if (!isAllowedIgUser(username)) {
        return respond({ ok: false, mode, user: username, reason: 'not_allowed' })
      }
      const id = await signIdentity(username)
      return respond({ ok: true, mode, user: username }, { name: id.name, value: id.value, ttlSec: id.ttlSec })
    }

    // connect mode: store the long-lived token for data sync.
    await setInstagramToken(longToken)
    // Bonus: if the connecting account is allowlisted, also grant identity so a
    // sync reconnect doubles as passing the gate (no second login needed).
    const identityCookie = isAllowedIgUser(username)
      ? await signIdentity(username).then(id => ({ name: id.name, value: id.value, ttlSec: id.ttlSec }))
      : undefined
    return respond({ ok: true, mode, user: username }, identityCookie)
  } catch (err) {
    return respond({ ok: false, mode, reason: err instanceof Error ? err.message : 'exchange_failed' })
  }
}
