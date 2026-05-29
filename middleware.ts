// Password-gate middleware + global security posture.
//
// Public (always allowed, never password-gated):
//   - /login                                       (login page)
//   - /api/login, /api/logout                       (session lifecycle)
//   - /api/cron/*                                   (own bearer auth via CRON_SECRET)
//   - /api/files/<bucket>/<key...>                  (GET = public read; PUT = HMAC token)
//   - /_next/*, /favicon.ico, /robots.txt, /icons   (static)
//
// Everything else requires the `app_session` cookie. Unauthenticated browser
// requests are redirected to /login; unauthenticated API requests get 401 JSON.
//
// Optionally (REQUIRE_IG_IDENTITY=1) a second factor is layered on: after the
// password, a route also needs the `ig_identity` cookie — set only after an
// allowlisted Instagram OAuth login. Password-but-no-identity browser requests
// are sent to /verify; API requests get 401. The /verify page and the IG-login
// endpoints are exempt so the identity cookie can actually be obtained.
//
// Beyond auth, this also:
//   - Fast-404s common bot-scanner paths (no auth round-trip, no logs noise)
//   - Enforces same-origin on every state-changing request (POST/PATCH/PUT/DELETE)
//     for session-gated endpoints — CSRF defense in depth on top of SameSite=Lax
//   - Attaches HSTS / X-Frame-Options / CSP / Referrer-Policy / Permissions-Policy
//     to every response

import { NextResponse, type NextRequest } from 'next/server'
import {
  verifySession,
  SESSION_COOKIE,
  verifyIdentity,
  IDENTITY_COOKIE,
  identityRequired,
} from '@/lib/session'
import { isSameOrigin } from '@/lib/security/origin'
import { applySecurityHeaders } from '@/lib/security/headers'

const PUBLIC_PATH_RE = /^\/(login|api\/login|api\/logout)(\/|$)/

// The Instagram identity-login flow itself: reachable with just the password
// session so a password-holder can perform the IG login that grants the
// identity cookie. Without this carve-out the second factor would be a
// chicken-and-egg lockout (can't log in because you're not logged in).
const IG_LOGIN_FLOW_RE = /^\/(verify|api\/instagram\/(connect|callback))(\/|$)/
const CRON_PATH_RE = /^\/api\/cron(\/|$)/
const FILES_PATH_RE = /^\/api\/files(\/|$)/
const STATIC_PATH_RE = /^\/(?:_next\/static|_next\/image|favicon\.ico|robots\.txt|icons?\/)/

// Bot scanners hammer these constantly. 404-ing in middleware avoids dragging
// the whole Next route stack through a `.env` probe. The regex covers the
// classics: env / git / common admin panels / known CMS endpoints.
const SCANNER_PATH_RE =
  /^\/(?:\.env|\.git\/|\.aws\/|\.ssh\/|wp-(?:admin|login|content|includes)|wordpress|administrator|phpmyadmin|pma|adminer|server-status|server-info|HNAP1|owa|manager\/html|jenkins|actuator|console|fckeditor|cgi-bin|boaform|setup\.cgi|vendor\/phpunit|laravel|tinymce|webdav)/i

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // 1. Hard-block scanner noise before doing anything else.
  if (SCANNER_PATH_RE.test(pathname)) {
    return applySecurityHeaders(req, new NextResponse('Not Found', { status: 404 }))
  }

  // 2. Static / always-public paths bypass the session check.
  const isStatic = STATIC_PATH_RE.test(pathname)
  const isPublic = PUBLIC_PATH_RE.test(pathname)
  const isCron = CRON_PATH_RE.test(pathname)
  const isFiles = FILES_PATH_RE.test(pathname)

  if (isStatic) {
    return applySecurityHeaders(req, NextResponse.next())
  }

  // 3. Origin/Referer enforcement on session-mutating endpoints.
  //    /api/cron/* uses Bearer auth so cross-origin POSTs from a script are
  //    legitimate — opt them out. /api/files PUT uses an HMAC token URL
  //    that's bound to (bucket, key, exp) so the cookie is irrelevant.
  if (!isCron && !isFiles && !isStatic) {
    if (!isSameOrigin(req)) {
      // Logout and login pages don't need a cookie, but they do need to be
      // posted from our own origin — same rule applies.
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(req, NextResponse.json({ error: 'cross-origin blocked' }, { status: 403 }))
      }
      // For non-API mutating requests (rare; mostly forms), bounce to /login.
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return applySecurityHeaders(req, NextResponse.redirect(url))
    }
  }

  // 4. Public auth endpoints / cron / files paths skip the cookie check.
  if (isPublic || isCron || isFiles) {
    return applySecurityHeaders(req, NextResponse.next())
  }

  // 5. Session-gated everything else.
  const cookie = req.cookies.get(SESSION_COOKIE)?.value
  if (await verifySession(cookie)) {
    // 5a. Optional Instagram identity second factor. When enabled, every
    //     protected route also needs a verified-allowlisted IG login — except
    //     the IG-login flow itself, which only needs the password (so it can
    //     be used to obtain the identity cookie in the first place).
    if (identityRequired() && !IG_LOGIN_FLOW_RE.test(pathname)) {
      const id = req.cookies.get(IDENTITY_COOKIE)?.value
      if (!(await verifyIdentity(id))) {
        if (pathname.startsWith('/api/')) {
          return applySecurityHeaders(req, NextResponse.json({ error: 'instagram identity required' }, { status: 401 }))
        }
        const url = req.nextUrl.clone()
        url.pathname = '/verify'
        if (method === 'GET') url.searchParams.set('next', pathname + (req.nextUrl.search || ''))
        return applySecurityHeaders(req, NextResponse.redirect(url))
      }
    }
    return applySecurityHeaders(req, NextResponse.next())
  }

  // API → 401 JSON; pages → redirect to /login with ?next=
  if (pathname.startsWith('/api/')) {
    return applySecurityHeaders(req, NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
  }
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  // GETs only — never redirect a POST to /login (the body would be lost and
  // the user-agent would silently downgrade to GET).
  if (method === 'GET') {
    url.searchParams.set('next', pathname + (req.nextUrl.search || ''))
  }
  return applySecurityHeaders(req, NextResponse.redirect(url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
