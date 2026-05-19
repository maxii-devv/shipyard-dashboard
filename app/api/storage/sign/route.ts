// Issues a short-lived HMAC-signed PUT URL pointing at /api/files/<bucket>/<key>.
// The middleware enforces the session cookie before this handler runs.
import { NextRequest, NextResponse } from 'next/server'
import { signUpload } from '@/lib/storage-shim'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { bucket?: string; path?: string; upsert?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const bucket = (body.bucket || '').trim()
  const key = (body.path || '').replace(/^\/+/, '')
  if (!bucket || !key) {
    return NextResponse.json({ error: 'bucket and path required' }, { status: 400 })
  }
  if (!/^[a-z0-9_\-]+$/i.test(bucket)) {
    return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  }
  const { token } = signUpload(bucket, key)
  const enc = key.split('/').map(encodeURIComponent).join('/')
  const signedUrl = `/api/files/${encodeURIComponent(bucket)}/${enc}?token=${token}`
  return NextResponse.json({ signedUrl, token, path: key })
}
