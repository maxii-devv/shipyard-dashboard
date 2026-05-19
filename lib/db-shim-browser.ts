// BROWSER-SIDE entry of the Supabase-shaped shim. Imported only by
// `lib/supabase/client.ts` and any other `'use client'` module that wants the
// `.from(...).select/insert/update/delete/eq/...` and `.storage.from(...)`
// surface. Every operation rides over HTTP to a server route — there are no
// Node-only imports here, so the client bundle stays clean.

import { QueryBuilder, makeAuthStub, type ExecSpec, type ExecResult } from './db-shim-builder'

async function browserTransport<T>(spec: ExecSpec): Promise<ExecResult<T>> {
  try {
    const res = await fetch('/api/db/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
      credentials: 'include',
    })
    if (!res.ok) {
      return { data: null, error: { message: `db proxy ${res.status}`, code: String(res.status) } }
    }
    return (await res.json()) as ExecResult<T>
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } }
  }
}

const auth = makeAuthStub('browser')

function browserBucket(name: string) {
  return {
    async upload(
      key: string,
      body: Blob | File | ArrayBuffer | Uint8Array,
      opts?: { upsert?: boolean; contentType?: string },
    ) {
      try {
        const sign = await fetch('/api/storage/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: name, path: key, upsert: !!opts?.upsert }),
          credentials: 'include',
        })
        if (!sign.ok) return { data: null, error: { message: `sign failed: ${sign.status}` } }
        const { signedUrl } = await sign.json()
        const put = await fetch(signedUrl, {
          method: 'PUT',
          body: body as BodyInit,
          headers: opts?.contentType ? { 'Content-Type': opts.contentType } : undefined,
        })
        if (!put.ok) return { data: null, error: { message: `upload failed: ${put.status}` } }
        return { data: { path: key, fullPath: `${name}/${key}` }, error: null }
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } }
      }
    },
    getPublicUrl(key: string) {
      const enc = key.split('/').map(encodeURIComponent).join('/')
      return { data: { publicUrl: `/api/files/${encodeURIComponent(name)}/${enc}` } }
    },
    async createSignedUrl(key: string, _expiresIn?: number) {
      void _expiresIn
      const enc = key.split('/').map(encodeURIComponent).join('/')
      return { data: { signedUrl: `/api/files/${encodeURIComponent(name)}/${enc}` }, error: null }
    },
    async createSignedUploadUrl(key: string) {
      try {
        const res = await fetch('/api/storage/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: name, path: key, upsert: true }),
          credentials: 'include',
        })
        if (!res.ok) return { data: null, error: { message: `sign failed: ${res.status}` } }
        const { signedUrl, token } = await res.json()
        return { data: { signedUrl, path: key, token }, error: null }
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } }
      }
    },
    async remove(paths: string[] | string) {
      try {
        const res = await fetch('/api/storage/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: name, paths: Array.isArray(paths) ? paths : [paths] }),
          credentials: 'include',
        })
        if (!res.ok) return { data: null, error: { message: `remove failed: ${res.status}` } }
        return await res.json()
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } }
      }
    },
    async list(_prefix = '') {
      void _prefix
      return { data: [], error: null }
    },
  }
}

export function createBrowserClient(_url?: string, _key?: string) {
  void _url
  void _key
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from<T = any>(table: string) {
      return new QueryBuilder<T>(table, browserTransport)
    },
    storage: { from: browserBucket },
    auth,
  }
}

export type BrowserDbClient = ReturnType<typeof createBrowserClient>
