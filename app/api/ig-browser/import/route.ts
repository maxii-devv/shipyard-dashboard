import { NextRequest } from 'next/server'
import { ensureBrowserChild, IG_BROWSER_BASE } from '@/lib/ig-browser-proc'

// Imports an Instagram session into the server browser profile from cookies the
// user exported in a normal browser on a residential IP (the VPS datacenter IP
// gets HTTP 429 on IG's login page). Accepts a Cookie-Editor / EditThisCookie
// JSON array or a Playwright storageState object, normalizes to Playwright's
// cookie shape, injects into the persistent profile, then navigates to IG so the
// caller can see whether the session took. Cookies are never logged or echoed.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PWCookie = {
  name: string; value: string; domain: string; path: string
  httpOnly: boolean; secure: boolean; sameSite: 'Strict' | 'Lax' | 'None'
  expires?: number
}

function mapSameSite(s: unknown): 'Strict' | 'Lax' | 'None' {
  const v = String(s ?? '').toLowerCase()
  if (v === 'strict') return 'Strict'
  if (v === 'no_restriction' || v === 'none') return 'None'
  return 'Lax'
}

function normalize(raw: unknown): PWCookie[] {
  let arr: unknown[]
  if (Array.isArray(raw)) arr = raw
  else if (raw && typeof raw === 'object' && Array.isArray((raw as { cookies?: unknown[] }).cookies)) {
    arr = (raw as { cookies: unknown[] }).cookies
  } else {
    throw new Error('Expected a JSON array of cookies, or a storageState object with a "cookies" array.')
  }

  return arr
    .filter((c): c is Record<string, unknown> =>
      !!c && typeof c === 'object' &&
      typeof (c as Record<string, unknown>).name === 'string' &&
      String((c as Record<string, unknown>).domain ?? '').includes('instagram.com'))
    .map((c) => {
      const sameSite = mapSameSite(c.sameSite)
      const secure = sameSite === 'None' ? true : !!c.secure
      const out: PWCookie = {
        name: String(c.name),
        value: String(c.value ?? ''),
        domain: String(c.domain),
        path: c.path ? String(c.path) : '/',
        httpOnly: !!c.httpOnly,
        secure,
        sameSite,
      }
      const exp = (c.expires ?? c.expirationDate) as unknown
      if (typeof exp === 'number' && exp > 0 && !c.session) out.expires = Math.floor(exp)
      return out
    })
}

export async function POST(req: NextRequest) {
  let body: { raw?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (typeof body.raw !== 'string' || !body.raw.trim()) {
    return Response.json({ error: 'Paste your exported cookie JSON.' }, { status: 400 })
  }

  let parsed: unknown
  try { parsed = JSON.parse(body.raw) } catch {
    return Response.json({ error: 'That is not valid JSON. Use your cookie extension’s "Export as JSON".' }, { status: 400 })
  }

  let cookies: PWCookie[]
  try { cookies = normalize(parsed) } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }

  if (cookies.length === 0) {
    return Response.json({ error: 'No instagram.com cookies found in that export.' }, { status: 400 })
  }
  const hasSession = cookies.some(c => c.name === 'sessionid' && c.value)
  if (!hasSession) {
    return Response.json({
      error: 'No "sessionid" cookie found. Export cookies while logged in, using an extension that can read httpOnly cookies (not document.cookie).',
    }, { status: 400 })
  }

  try {
    await ensureBrowserChild()
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 })
  }

  // Inject cookies.
  try {
    const r = await fetch(`${IG_BROWSER_BASE}/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) return Response.json({ error: `cookie injection failed (${r.status})` }, { status: 502 })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }

  // Navigate to IG so the caller can verify via the live panel. May still 429 if
  // the datacenter IP is hard-blocked even for authenticated requests — report
  // that rather than failing the import (the cookies are already in the profile).
  let navError: string | null = null
  try {
    const r = await fetch(`${IG_BROWSER_BASE}/nav`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.instagram.com/' }),
      signal: AbortSignal.timeout(70000),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) navError = (j as { error?: string }).error ?? `nav failed (${r.status})`
  } catch (e) {
    navError = (e as Error).message
  }

  return Response.json({
    ok: true,
    imported: cookies.length,
    sessionid: true,
    navError,
    note: navError
      ? 'Cookies imported, but Instagram returned an error for this server IP. Open the live browser to inspect; a residential proxy may still be required.'
      : 'Cookies imported. Open the live browser to confirm you are logged in.',
  })
}
