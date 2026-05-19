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
