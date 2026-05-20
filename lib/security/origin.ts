// Origin/Referer check for state-changing endpoints. Defense in depth on top
// of SameSite=Lax — covers older browsers and non-browser clients that ignore
// SameSite, and catches cookie reuse from any other origin even if a future
// flag change loosened SameSite to None.
//
// Strategy:
//   - GET/HEAD/OPTIONS: always allowed (not state-changing).
//   - Otherwise: if Origin header is present it MUST match the request's own
//     host. If Origin is absent (rare for cross-origin POSTs in modern
//     browsers, but possible) we fall back to Referer.
//   - If neither is present, we deny — the only realistic source of
//     header-less mutating requests is curl/scripts, which can opt in via the
//     CRON_SECRET Authorization header (handled per-route).
//
// `ALLOWED_ORIGINS` env (comma-separated absolute origins) extends the
// implicit same-host allow. Use it when running behind a reverse proxy that
// rewrites Host but keeps a stable public origin.

import type { NextRequest } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function allowed(req: NextRequest): Set<string> {
  const set = new Set<string>()
  const host = req.headers.get('host')
  if (host) {
    // Trust the proxy-forwarded scheme when present (Caddy/Nginx terminate
    // TLS upstream of us); fall back to the URL's own scheme otherwise.
    const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
    set.add(`${proto}://${host}`)
  }
  const extra = process.env.ALLOWED_ORIGINS || ''
  for (const o of extra.split(',').map(s => s.trim()).filter(Boolean)) set.add(o)
  return set
}

export function isSameOrigin(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true
  const ok = allowed(req)
  const origin = req.headers.get('origin')
  if (origin) return ok.has(origin)
  // Origin absent — fall back to Referer prefix match.
  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const u = new URL(referer)
      return ok.has(`${u.protocol.replace(':', '')}://${u.host}`)
    } catch {
      return false
    }
  }
  // No Origin, no Referer, mutating method — block unless the route opts out
  // (e.g. /api/cron/* authenticates with a Bearer token, not the session).
  return false
}
