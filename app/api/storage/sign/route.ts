// Issues a short-lived HMAC-signed PUT URL pointing at /api/files/<bucket>/<key>.
// The middleware enforces the session cookie AND a same-origin check before
// this handler runs, so we know the caller is the dashboard.
//
// Locked down to a per-deploy bucket allowlist via `ALLOWED_BUCKETS` (comma-
// separated). Defaults match the buckets the dashboard actually uses. Without
// this, a session-holder could sign uploads against arbitrary bucket names —
// the storage shim itself only protects against path traversal, not "where".
import { NextRequest, NextResponse } from 'next/server'
import { signUpload } from '@/lib/storage-shim'
import { readJsonGuarded } from '@/lib/security/body-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BODY_LIMIT = 4 * 1024 // tiny JSON payload — bucket + path + flag

// Default set covers what the codebase writes to: thumbnails, video assets,
// social-post media, blog assets, knowledge-base attachments. Override with
// ALLOWED_BUCKETS to extend or replace this list per-deploy.
const DEFAULT_BUCKETS = [
  'thumbnails',
  'assets',
  'video-attachments',
  'social-media-files',
  'supporting-media',
  'blog-assets',
  'knowledge-base',
]

function allowedBuckets(): Set<string> {
  const env = (process.env.ALLOWED_BUCKETS || '').split(',').map(s => s.trim()).filter(Boolean)
  return new Set(env.length ? env : DEFAULT_BUCKETS)
}

const MAX_KEY_LEN = 512 // generous; filesystem hard limit is 4 KiB but nobody needs that

export async function POST(req: NextRequest) {
  const parsed = await readJsonGuarded<{ bucket?: string; path?: string; upsert?: boolean }>(req, BODY_LIMIT)
  if (!parsed.ok) return parsed.res

  const bucket = (parsed.data.bucket || '').trim()
  const key = (parsed.data.path || '').replace(/^\/+/, '')

  if (!bucket || !key) {
    return NextResponse.json({ error: 'bucket and path required' }, { status: 400 })
  }
  if (!/^[a-z0-9_\-]+$/i.test(bucket)) {
    return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  }
  if (!allowedBuckets().has(bucket)) {
    return NextResponse.json({ error: 'bucket not allowed' }, { status: 403 })
  }
  if (key.length > MAX_KEY_LEN) {
    return NextResponse.json({ error: 'path too long' }, { status: 400 })
  }
  // Reject paths containing path traversal or NUL bytes early — the storage
  // shim would also reject these, but failing here gives a clearer 400.
  if (key.includes('\0') || /(?:^|\/)\.\.(?:\/|$)/.test(key)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const { token } = signUpload(bucket, key)
  const enc = key.split('/').map(encodeURIComponent).join('/')
  const signedUrl = `/api/files/${encodeURIComponent(bucket)}/${enc}?token=${token}`
  return NextResponse.json({ signedUrl, token, path: key })
}
