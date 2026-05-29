// Instagram Business Login (OAuth) helpers for the "Connect Instagram" flow.
//
// Flow: dashboard → /api/instagram/connect → instagram.com login/consent →
// /api/instagram/callback?code=… → exchange code for a short-lived token →
// exchange that for a long-lived (~60-day) token → store in system_config.
//
// Config comes from env (kept out of git — the app secret is sensitive):
//   INSTAGRAM_APP_ID      the Instagram app ID (NOT the Meta app ID)
//   INSTAGRAM_APP_SECRET  the Instagram app secret
//   APP_PUBLIC_URL        public origin used to build the redirect URI
//
// The redirect URI built here must be registered verbatim in the Meta app
// under "Instagram business login → OAuth redirect URIs".

const IG_APP_ID = process.env.INSTAGRAM_APP_ID
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET
const PUBLIC_URL = (process.env.APP_PUBLIC_URL || 'https://izan.62-171-142-52.nip.io').replace(/\/$/, '')

// Scopes the dashboard actually uses: profile + media (basic), insights
// (views/reach/etc.), and comments (getMediaComments). Matches what the
// account already authorized via the dev-dashboard token generator.
export const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'instagram_business_manage_comments',
].join(',')

export function instagramConfigured(): boolean {
  return Boolean(IG_APP_ID && IG_APP_SECRET)
}

export function redirectUri(): string {
  return `${PUBLIC_URL}/api/instagram/callback`
}

export function buildAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: IG_APP_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: IG_SCOPES,
    state,
    // Force a fresh login so izan authorizes his own account explicitly,
    // rather than silently reusing whatever session is in the browser.
    force_authentication: '1',
  })
  return `https://www.instagram.com/oauth/authorize?${p.toString()}`
}

// code → short-lived token (+ the IG-scoped user id)
export async function exchangeCodeForShortToken(
  code: string
): Promise<{ token: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: IG_APP_ID || '',
    client_secret: IG_APP_SECRET || '',
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    code,
  })
  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    user_id?: string | number
    error_message?: string
    error?: { message?: string }
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      data?.error_message || data?.error?.message || `short-token exchange failed: HTTP ${res.status}`
    )
  }
  return { token: data.access_token, userId: String(data.user_id ?? '') }
}

// short-lived → long-lived (~60-day) token
export async function exchangeForLongToken(
  shortToken: string
): Promise<{ token: string; expiresIn: number | null }> {
  const p = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: IG_APP_SECRET || '',
    access_token: shortToken,
  })
  const res = await fetch(`https://graph.instagram.com/access_token?${p.toString()}`)
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || `long-token exchange failed: HTTP ${res.status}`)
  }
  return { token: data.access_token, expiresIn: data.expires_in ?? null }
}
