// Transport-agnostic Supabase-style query builder. Both the server entry
// (`lib/db-shim.ts`, runs SQL via pg) and the browser entry
// (`lib/db-shim-browser.ts`, posts to /api/db/exec) wire their own transport.
// This file imports no Node-only modules so it bundles cleanly for either side.

import type { ExecSpec, ExecResult } from './db-exec'
export type { ExecSpec, ExecResult } from './db-exec'

export type Transport = <T>(spec: ExecSpec) => Promise<ExecResult<T>>

// Default T to `any`, mirroring `@supabase/supabase-js` when no Database type
// is supplied — call sites can do `const { data } = await ...; data.foo` the
// way they did with the real client. Routes that want stricter types can
// still pass an explicit generic: `.from<MyRow>('foo')`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryBuilder<T = any> implements PromiseLike<ExecResult<T>> {
  private _spec: ExecSpec
  private _transport: Transport

  constructor(table: string, transport: Transport) {
    this._spec = {
      table,
      action: 'select',
      select: '*',
      filters: [],
      order: [],
      returnSelect: false,
      single: null,
      values: null,
    }
    this._transport = transport
  }

  // Supabase's select supports a count/head option: `.select('*', { count:
  // 'exact', head: true })` returns just the row count without payload.
  select(cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this._spec.action === 'select') this._spec.select = cols || '*'
    else {
      this._spec.returnSelect = true
      this._spec.select = cols || '*'
    }
    if (opts?.count) this._spec.countMode = opts.count
    if (opts?.head) this._spec.headOnly = true
    return this
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    this._spec.action = 'insert'
    this._spec.values = Array.isArray(rows) ? rows : [rows]
    return this
  }

  update(values: Record<string, unknown>) {
    this._spec.action = 'update'
    this._spec.values = values
    return this
  }

  delete() {
    this._spec.action = 'delete'
    return this
  }

  upsert(rows: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) {
    this._spec.action = 'upsert'
    this._spec.values = Array.isArray(rows) ? rows : [rows]
    this._spec.conflictTarget = opts?.onConflict
    return this
  }

  eq(col: string, val: unknown) {
    if (val === null) this._spec.filters.push({ col, op: 'is_null' })
    else this._spec.filters.push({ col, op: '=', val })
    return this
  }

  neq(col: string, val: unknown) {
    if (val === null) this._spec.filters.push({ col, op: 'is_not_null' })
    else this._spec.filters.push({ col, op: '!=', val })
    return this
  }

  in(col: string, vals: unknown[]) {
    this._spec.filters.push({ col, op: 'in', val: vals })
    return this
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    const ascending = opts?.ascending ?? true
    const nullsLast = opts?.nullsFirst === true ? false : ascending
    this._spec.order.push({ col, ascending, nullsLast })
    return this
  }

  limit(n: number) {
    this._spec.limit = n
    return this
  }

  single() {
    this._spec.single = 'one'
    return this
  }

  maybeSingle() {
    this._spec.single = 'maybe'
    return this
  }

  then<TR1 = ExecResult<T>, TR2 = never>(
    onfulfilled?: ((v: ExecResult<T>) => TR1 | PromiseLike<TR1>) | null,
    onrejected?: ((r: unknown) => TR2 | PromiseLike<TR2>) | null,
  ): PromiseLike<TR1 | TR2> {
    return this._transport<T>(this._spec).then(onfulfilled, onrejected)
  }
}

// Stub used by both entries. The server-side `signOut()` doesn't bother
// hitting an endpoint; the browser variant POSTs /api/logout so the cookie
// gets cleared by the server.
export function makeAuthStub(env: 'server' | 'browser') {
  return {
    async signInWithPassword() {
      return { data: null, error: { message: 'Auth disabled — use /login' } }
    },
    async resetPasswordForEmail() {
      return { data: null, error: { message: 'Auth disabled' } }
    },
    async updateUser() {
      return { data: null, error: { message: 'Auth disabled' } }
    },
    async exchangeCodeForSession() {
      return { data: null, error: { message: 'Auth disabled' } }
    },
    async getUser() {
      return { data: { user: null }, error: null }
    },
    async getSession() {
      return { data: { session: null }, error: null }
    },
    async signOut() {
      if (env === 'browser' && typeof window !== 'undefined') {
        try {
          await fetch('/api/logout', { method: 'POST' })
        } catch {
          // best-effort
        }
      }
      return { error: null }
    },
  }
}
