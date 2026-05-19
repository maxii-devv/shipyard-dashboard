// Password-gate middleware. Replaces the no-op pass-through.
//
// Public (always allowed):
//   - /login                                       (login page)
//   - /api/login, /api/logout                       (session lifecycle)
//   - /api/cron/*                                   (own bearer auth via CRON_SECRET)
//   - /api/files/<bucket>/<key...>                  (GET = public read; PUT = HMAC token)
//   - /_next/*, /favicon.ico, /robots.txt, /icons   (static)
//
// Everything else requires the `app_session` cookie. Unauthenticated browser
// requests are redirected to /login; unauthenticated API requests get 401 JSON.

import { NextResponse, type NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PATH_RE = /^\/(login|api\/login|api\/logout)(\/|$)/
const CRON_PATH_RE = /^\/api\/cron(\/|$)/
const FILES_PATH_RE = /^\/api\/files(\/|$)/
const STATIC_PATH_RE = /^\/(?:_next\/static|_next\/image|favicon\.ico|robots\.txt|icons?\/)/

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    STATIC_PATH_RE.test(pathname) ||
    PUBLIC_PATH_RE.test(pathname) ||
    CRON_PATH_RE.test(pathname) ||
    FILES_PATH_RE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value
  if (await verifySession(cookie)) return NextResponse.next()

  // API → 401 JSON; pages → redirect to /login with ?next=
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname + (req.nextUrl.search || ''))
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
