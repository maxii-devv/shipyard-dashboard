import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForShortToken,
  exchangeForLongToken,
} from '@/lib/backend/instagram-oauth'
import { setInstagramToken, validateInstagramToken } from '@/lib/backend/instagram'
import { STATE_COOKIE } from '../connect/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Result = { ok: boolean; user?: string; reason?: string }

// Return a tiny HTML page that hands the result back to the dashboard.
//
// The Connect button opens this whole flow in a popup window. When the popup
// lands here it postMessages the result to the opener (the dashboard) and
// closes itself — the dashboard never navigates. If there is no opener (the
// popup was blocked and we fell back to a full-page redirect), it instead
// navigates back to /dashboard with the ?ig= param the banner also understands.
function respond(result: Result) {
  const params = new URLSearchParams()
  params.set('ig', result.ok ? 'connected' : 'error')
  if (result.user) params.set('user', result.user)
  if (result.reason) params.set('reason', result.reason)

  // `<` is escaped so a reason string can never break out of the <script>.
  const payload = JSON.stringify({ type: 'ig-oauth', ...result }).replace(/</g, '\\u003c')
  const fallback = JSON.stringify('/dashboard?' + params.toString()).replace(/</g, '\\u003c')

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
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // User declined consent, or Instagram returned an error.
  const oauthError = searchParams.get('error')
  if (oauthError) {
    return respond({ ok: false, reason: searchParams.get('error_description') || oauthError })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expected = req.cookies.get(STATE_COOKIE)?.value
  if (!code || !state || !expected || state !== expected) {
    return respond({ ok: false, reason: 'invalid_state' })
  }

  try {
    const { token: shortToken } = await exchangeCodeForShortToken(code)
    const { token: longToken } = await exchangeForLongToken(shortToken)

    // Validate before storing so a broken token never replaces a working one.
    const check = await validateInstagramToken(longToken)
    if (!check.valid) {
      return respond({ ok: false, reason: check.error || 'validation_failed' })
    }

    await setInstagramToken(longToken)
    return respond({ ok: true, user: check.username || '' })
  } catch (err) {
    return respond({ ok: false, reason: err instanceof Error ? err.message : 'exchange_failed' })
  }
}
