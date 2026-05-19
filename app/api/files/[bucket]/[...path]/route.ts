// Serves and accepts uploads for the local-disk Storage shim.
//   GET  /api/files/<bucket>/<key...>            → stream file
//   PUT  /api/files/<bucket>/<key...>?token=...  → write file (signed upload)
//   DELETE /api/files/<bucket>/<key...>          → remove file (requires CRON_SECRET)
import { NextRequest, NextResponse } from 'next/server'
import { readObject, statObject, writeObject, verifyUploadToken } from '@/lib/storage-shim'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads'

// Small extension→MIME table covering everything the app uploads (images,
// video, audio, pdfs). Avoids pulling in mime-types for two dozen entries.
const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', heic: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac',
  pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', json: 'application/json',
  csv: 'text/csv; charset=utf-8', html: 'text/html; charset=utf-8',
  zip: 'application/zip', gz: 'application/gzip',
}

function mimeFor(k: string): string {
  const ext = k.split('.').pop()?.toLowerCase() || ''
  return MIME_MAP[ext] || 'application/octet-stream'
}

function key(parts: string[]) {
  return parts.map(p => decodeURIComponent(p)).join('/')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: parts } = await params
  const k = key(parts)
  try {
    const stat = await statObject(bucket, k)
    const buf = await readObject(bucket, k)
    const ct = mimeFor(k)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': String(ct),
        'Content-Length': String(stat.size),
        // Conservative cache for user-uploaded assets; client can override.
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: parts } = await params
  const k = key(parts)
  const token = req.nextUrl.searchParams.get('token') || ''
  if (!verifyUploadToken(bucket, k, token)) {
    return NextResponse.json({ error: 'invalid or expired token' }, { status: 401 })
  }
  const body = Buffer.from(await req.arrayBuffer())
  await writeObject(bucket, k, body)
  return NextResponse.json({ ok: true, path: k, size: body.length })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { bucket, path: parts } = await params
  const k = key(parts)
  try {
    await fs.unlink(path.resolve(UPLOADS_DIR, bucket, k))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
