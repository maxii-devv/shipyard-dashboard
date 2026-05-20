// Response headers that harden the dashboard against the cheap attacks. Set
// from middleware so every route (including static / API errors) carries them.
//
// HSTS is conditional on the request actually being HTTPS — sending it over
// plain HTTP is a footgun for dev / Tailscale-internal use (no-op for the
// browser, but signals intent we may not yet have). CSP is a single sane
// default; the dashboard has no third-party iframes and only loads its own
// JS/CSS plus a handful of remote images (IG CDN). `unsafe-inline` for
// script-src is required because Next still emits inline init scripts; this
// dashboard is an internal admin tool, so we accept the trade-off.

import type { NextResponse, NextRequest } from 'next/server'

const STATIC_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // CSP — `frame-ancestors 'none'` supersedes X-Frame-Options for modern UAs.
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
}

function isHttps(req: NextRequest): boolean {
  if (req.nextUrl.protocol === 'https:') return true
  return (req.headers.get('x-forwarded-proto') || '').toLowerCase() === 'https'
}

export function applySecurityHeaders(req: NextRequest, res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(STATIC_HEADERS)) res.headers.set(k, v)
  if (isHttps(req)) {
    // 1 year, applies to subdomains, eligible for preload list submission.
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  // Remove the default Next "X-Powered-By: Next.js" leak. `poweredByHeader:
  // false` in next.config covers this for first-party responses; this catch
  // is for cases where it slips through (e.g. error pages from the runtime).
  res.headers.delete('X-Powered-By')
  return res
}
