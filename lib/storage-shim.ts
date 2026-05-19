// Local-disk replacement for Supabase Storage. Files are written under
// $UPLOADS_DIR/<bucket>/<path> (mounted as a Docker volume in production),
// served via /api/files/<bucket>/<path...>, and uploaded by clients via
// short-lived HMAC-signed PUT URLs to that same path.
//
// Exposed surface matches the .storage.from(bucket).{upload, getPublicUrl,
// remove, createSignedUploadUrl} calls observed in this codebase.

import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads'
// 32-byte secret used to sign upload URLs. Falls back to CRON_SECRET so a
// single env var configures both API auth and upload signing in simple setups.
const SIGN_KEY = process.env.UPLOAD_SIGN_KEY || process.env.CRON_SECRET || 'change-me-uploads'
// Public origin used to build absolute URLs. Optional; relative paths work too.
const PUBLIC_BASE = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')

// Reject path traversal — every storage key must resolve under UPLOADS_DIR.
function resolveSafe(bucket: string, key: string): string {
  if (!/^[a-z0-9_\-]+$/i.test(bucket)) throw new Error(`invalid bucket: ${bucket}`)
  const cleaned = key.replace(/^\/+/, '')
  const root = path.resolve(UPLOADS_DIR, bucket)
  const target = path.resolve(root, cleaned)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`path traversal blocked: ${bucket}/${key}`)
  }
  return target
}

function publicUrl(bucket: string, key: string): string {
  const cleaned = key.replace(/^\/+/, '')
  const rel = `/api/files/${encodeURIComponent(bucket)}/${cleaned.split('/').map(encodeURIComponent).join('/')}`
  return PUBLIC_BASE ? PUBLIC_BASE + rel : rel
}

export function signUpload(bucket: string, key: string, ttlSec = 60 * 30): { token: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  const mac = crypto
    .createHmac('sha256', SIGN_KEY)
    .update(`PUT|${bucket}|${key}|${exp}`)
    .digest('hex')
  return { token: `${exp}.${mac}`, exp }
}

export function verifyUploadToken(bucket: string, key: string, token: string): boolean {
  const [expStr, mac] = (token || '').split('.')
  const exp = Number(expStr)
  if (!exp || Date.now() / 1000 > exp || !mac) return false
  const expected = crypto
    .createHmac('sha256', SIGN_KEY)
    .update(`PUT|${bucket}|${key}|${exp}`)
    .digest('hex')
  // Constant-time compare.
  try {
    return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

async function ensureDir(p: string) {
  await fs.mkdir(path.dirname(p), { recursive: true })
}

// Body shapes Supabase's upload() accepts: ArrayBuffer | Blob | Buffer | File
// | string. Normalize to Buffer/stream and write atomically (.tmp → rename) so
// concurrent reads never see a half-written file.
async function writeFile(target: string, body: unknown) {
  await ensureDir(target)
  const tmp = target + '.tmp-' + crypto.randomBytes(4).toString('hex')
  if (body instanceof Buffer) {
    await fs.writeFile(tmp, body)
  } else if (body instanceof Uint8Array) {
    await fs.writeFile(tmp, Buffer.from(body.buffer, body.byteOffset, body.byteLength))
  } else if (body instanceof ArrayBuffer) {
    await fs.writeFile(tmp, Buffer.from(body))
  } else if (typeof body === 'string') {
    await fs.writeFile(tmp, body, 'utf8')
  } else if (body && typeof (body as Blob).arrayBuffer === 'function') {
    const buf = Buffer.from(await (body as Blob).arrayBuffer())
    await fs.writeFile(tmp, buf)
  } else if (body instanceof Readable) {
    const fh = await fs.open(tmp, 'w')
    try {
      for await (const chunk of body as AsyncIterable<Buffer>) await fh.write(chunk)
    } finally {
      await fh.close()
    }
  } else {
    throw new Error('unsupported upload body type')
  }
  await fs.rename(tmp, target)
}

type UploadOpts = { upsert?: boolean; contentType?: string; cacheControl?: string }
// Discriminated union: when error is null, data is guaranteed present, so
// `if (error) return ...; use(data.foo)` narrows correctly at call sites.
type StorageErr = { message: string; statusCode?: string }
type Ok<T> = { data: T; error: null }
type Err = { data: null; error: StorageErr }
type Result<T> = Ok<T> | Err

class BucketHandle {
  private bucket: string
  constructor(bucket: string) {
    this.bucket = bucket
  }

  async upload(key: string, body: unknown, opts: UploadOpts = {}): Promise<Result<{ path: string; fullPath: string }>> {
    try {
      const target = resolveSafe(this.bucket, key)
      if (!opts.upsert) {
        try {
          await fs.access(target)
          return { data: null, error: { message: 'The resource already exists', statusCode: '409' } }
        } catch {
          // not present — proceed
        }
      }
      await writeFile(target, body)
      return { data: { path: key.replace(/^\/+/, ''), fullPath: `${this.bucket}/${key.replace(/^\/+/, '')}` }, error: null }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }

  getPublicUrl(key: string) {
    return { data: { publicUrl: publicUrl(this.bucket, key) } }
  }

  // No notion of public vs. private here — everything is reachable through the
  // /api/files route. Signed URLs simply embed the bucket+key with a TTL token
  // so links can expire if you want; here we just return the public URL.
  async createSignedUrl(
    key: string,
    _expiresIn?: number,
  ): Promise<Result<{ signedUrl: string }>> {
    void _expiresIn
    return { data: { signedUrl: publicUrl(this.bucket, key) }, error: null }
  }

  async createSignedUploadUrl(
    key: string,
  ): Promise<Result<{ signedUrl: string; path: string; token: string }>> {
    const cleanedKey = key.replace(/^\/+/, '')
    const { token } = signUpload(this.bucket, cleanedKey)
    const rel = `/api/files/${encodeURIComponent(this.bucket)}/${cleanedKey.split('/').map(encodeURIComponent).join('/')}?token=${token}`
    const url = PUBLIC_BASE ? PUBLIC_BASE + rel : rel
    return { data: { signedUrl: url, path: cleanedKey, token }, error: null }
  }

  async remove(paths: string[] | string): Promise<Result<{ name: string }[]>> {
    const list = Array.isArray(paths) ? paths : [paths]
    const removed: string[] = []
    for (const k of list) {
      try {
        await fs.unlink(resolveSafe(this.bucket, k))
        removed.push(k)
      } catch {
        // Matches Supabase: missing files are silently ignored.
      }
    }
    return { data: removed.map(name => ({ name })), error: null }
  }

  async list(prefix = '', _opts?: { limit?: number; offset?: number }): Promise<Result<{ name: string; id: string }[]>> {
    void _opts
    try {
      const dir = resolveSafe(this.bucket, prefix)
      const entries = await fs.readdir(dir, { withFileTypes: true })
      return { data: entries.map(e => ({ name: e.name, id: e.name })), error: null }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }
}

export function storageClient() {
  return {
    from(bucket: string) {
      return new BucketHandle(bucket)
    },
  }
}

// Read helpers for the /api/files serving route.
export async function readObject(bucket: string, key: string): Promise<Buffer> {
  return fs.readFile(resolveSafe(bucket, key))
}

export async function statObject(bucket: string, key: string) {
  return fs.stat(resolveSafe(bucket, key))
}

export async function writeObject(bucket: string, key: string, body: unknown) {
  await writeFile(resolveSafe(bucket, key), body)
}
