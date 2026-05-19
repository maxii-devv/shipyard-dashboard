// SERVER-SIDE entry of the Supabase-shaped shim. All call sites that used to
// `import { createClient } from '@supabase/supabase-js'` were redirected here
// — that's the only public API this file exposes.
//
// Runs SQL via node-postgres (`@/lib/db-exec`) and reads/writes the local
// uploads volume via `@/lib/storage-shim`. Both are Node-only imports; this
// file must never be imported from a `'use client'` module — use
// `@/lib/db-shim-browser` for that.
import 'server-only'
import { QueryBuilder, makeAuthStub, type ExecSpec, type ExecResult } from './db-shim-builder'
import { execSpec } from './db-exec'
import { storageClient } from './storage-shim'

async function serverTransport<T>(spec: ExecSpec): Promise<ExecResult<T>> {
  return execSpec<T>(spec)
}

const auth = makeAuthStub('server')

// Matches the old `createClient(NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE)` call
// shape; both args are ignored — connection is always DATABASE_URL via pg.
export function createClient(_url?: string, _key?: string) {
  void _url
  void _key
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from<T = any>(table: string) {
      return new QueryBuilder<T>(table, serverTransport)
    },
    storage: storageClient(),
    auth,
  }
}

export type DbClient = ReturnType<typeof createClient>
