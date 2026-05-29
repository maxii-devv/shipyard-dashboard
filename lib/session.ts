// Edge-runtime-safe session cookie helpers for the password gate.
// Cookie shape: `<expSec>.<hex hmac>`, signed with SESSION_SECRET via WebCrypto
// SHA-256 HMAC. No JWT lib needed; everything we encode is a single integer.

const COOKIE = 'app_session'
const TTL_SEC = 60 * 60 * 24 * 30 // 30 days; the gate is mostly anti-casual.

function secret(): string {
  return process.env.SESSION_SECRET || process.env.CRON_SECRET || 'change-me-session'
}

// Edge runtime exposes globalThis.crypto.subtle but not node:crypto.
async function hmacHex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input))
  const bytes = new Uint8Array(sig)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

export async function signSession(expSec?: number): Promise<{ value: string; exp: number; name: string; ttlSec: number }> {
  const exp = expSec ?? Math.floor(Date.now() / 1000) + TTL_SEC
  const mac = await hmacHex(String(exp))
  return { value: `${exp}.${mac}`, exp, name: COOKIE, ttlSec: TTL_SEC }
}

export async function verifySession(cookieValue: string | undefined | null): Promise<boolean> {
  if (!cookieValue) return false
  const [expStr, mac] = cookieValue.split('.')
  const exp = Number(expStr)
  if (!exp || !mac) return false
  if (Math.floor(Date.now() / 1000) > exp) return false
  const expected = await hmacHex(expStr)
  // Constant-time compare on hex strings.
  if (mac.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export const SESSION_COOKIE = COOKIE

// ---------------------------------------------------------------------------
// Instagram identity gate (second factor, opt-in via REQUIRE_IG_IDENTITY=1).
//
// On top of the password, viewing the dashboard can require proving you're
// signed in as one of a small allowlist of Instagram accounts. After an
// allowlisted IG OAuth login the callback sets this cookie; middleware then
// requires it for every protected route.
//
// Cookie shape: `<username>|<expSec>|<hex hmac>`, the MAC computed over a
// domain-separated input so it can never be swapped with an app_session value.
// IG usernames only contain [a-z0-9._], so `|` is a safe separator.
// ---------------------------------------------------------------------------

const IDENTITY = 'ig_identity'
const IDENTITY_TTL_SEC = 60 * 60 * 24 * 30 // mirror the password session (30d)

// Whether the IG-identity second factor is enforced at all. Off by default so
// the feature can ship dormant and be flipped on only once every allowlisted
// account is a working Instagram Tester (otherwise it would lock people out).
export function identityRequired(): boolean {
  return process.env.REQUIRE_IG_IDENTITY === '1'
}

// Allowlisted IG usernames (lowercased, no leading @). Env override is
// comma-separated; the default is the two accounts that should ever view the
// dashboard. Keep the default in code so flipping the flag needs no extra env.
export function allowedIgUsers(): string[] {
  const raw = process.env.IG_ALLOWED_USERS || 'pro.devv,madebyizan'
  return raw
    .split(',')
    .map(s => s.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean)
}

export function isAllowedIgUser(username: string | null | undefined): boolean {
  if (!username) return false
  return allowedIgUsers().includes(username.trim().replace(/^@/, '').toLowerCase())
}

export async function signIdentity(
  username: string,
  expSec?: number,
): Promise<{ value: string; name: string; ttlSec: number }> {
  const exp = expSec ?? Math.floor(Date.now() / 1000) + IDENTITY_TTL_SEC
  const user = username.trim().replace(/^@/, '').toLowerCase()
  const mac = await hmacHex(`identity|${user}|${exp}`)
  return { value: `${user}|${exp}|${mac}`, name: IDENTITY, ttlSec: IDENTITY_TTL_SEC }
}

// Returns the verified username when the cookie is valid + unexpired + the
// account is still on the allowlist; null otherwise. Re-checking the allowlist
// here means removing a user from IG_ALLOWED_USERS revokes their access on the
// next request without needing them to log out.
export async function verifyIdentity(cookieValue: string | undefined | null): Promise<string | null> {
  if (!cookieValue) return null
  const parts = cookieValue.split('|')
  if (parts.length !== 3) return null
  const [user, expStr, mac] = parts
  const exp = Number(expStr)
  if (!user || !exp || !mac) return null
  if (Math.floor(Date.now() / 1000) > exp) return null
  if (!isAllowedIgUser(user)) return null
  const expected = await hmacHex(`identity|${user}|${exp}`)
  if (mac.length !== expected.length) return null
  let diff = 0
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0 ? user! : null
}

export const IDENTITY_COOKIE = IDENTITY
export const IDENTITY_TTL = IDENTITY_TTL_SEC
