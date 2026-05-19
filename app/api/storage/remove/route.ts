// Deletes one or more files from a bucket. Session-gated by middleware.
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { bucket?: string; paths?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const bucket = (body.bucket || '').trim()
  const paths = Array.isArray(body.paths) ? body.paths : []
  if (!bucket || !/^[a-z0-9_\-]+$/i.test(bucket)) {
    return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  }
  const root = path.resolve(UPLOADS_DIR, bucket)
  const removed: string[] = []
  for (const k of paths) {
    const cleaned = k.replace(/^\/+/, '')
    const target = path.resolve(root, cleaned)
    // Defend against path traversal: target must live under the bucket dir.
    if (target !== root && !target.startsWith(root + path.sep)) continue
    try {
      await fs.unlink(target)
      removed.push(cleaned)
    } catch {
      // Match Supabase: missing files are silently ignored.
    }
  }
  return NextResponse.json({ data: removed.map(name => ({ name })), error: null })
}
