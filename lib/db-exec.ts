// Server-only SQL executor that drives both the server-side shim and the
// /api/db/exec proxy used by the browser-side shim. Centralises identifier
// quoting, parameter building, RETURNING semantics, and result shaping so the
// two callers can stay paper-thin.

import pool from './backend/db'

export type ExecOp = '=' | '!=' | 'in' | 'is_null' | 'is_not_null'
export type ExecFilter = { col: string; op: ExecOp; val?: unknown }
export type ExecOrder = { col: string; ascending: boolean; nullsLast: boolean }
export type ExecAction = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

export interface ExecSpec {
  table: string
  action: ExecAction
  select: string
  filters: ExecFilter[]
  order: ExecOrder[]
  limit?: number
  values?: Record<string, unknown> | Record<string, unknown>[] | null
  conflictTarget?: string
  returnSelect: boolean
  single: 'one' | 'maybe' | null
  // Supabase count/head support: `.select('*', { count: 'exact', head: true })`
  countMode?: 'exact' | 'planned' | 'estimated'
  headOnly?: boolean
}

export interface ExecResult<T = unknown> {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}

const ident = (s: string) => '"' + s.replace(/"/g, '""') + '"'

// Hard whitelist on identifiers so an attacker can't inject SQL via a forged
// table/column name reaching /api/db/exec. Matches the names we actually use.
const IDENT_RE = /^[a-z_][a-z0-9_]*$/i
function validateIdent(s: string, kind: string) {
  if (!IDENT_RE.test(s)) throw new Error(`invalid ${kind}: ${s}`)
}

export async function execSpec<T = unknown>(spec: ExecSpec): Promise<ExecResult<T>> {
  try {
    validateIdent(spec.table, 'table')

    const params: unknown[] = []
    const ph = (v: unknown) => {
      params.push(v)
      return '$' + params.length
    }

    // Supabase accepts dotted selects with relation expansion ("id, foo:bar(*)");
    // we never use those, so flatten anything with parens back to "*" rather
    // than pretend we support joins we don't.
    let selectExpr = spec.select.includes('(') ? '*' : spec.select
    if (selectExpr !== '*') {
      // Comma-separated column list — sanity-check each column.
      selectExpr = selectExpr
        .split(',')
        .map(s => s.trim())
        .map(c => {
          if (c === '*') return '*'
          validateIdent(c, 'select column')
          return ident(c)
        })
        .join(', ')
    }

    const whereParts: string[] = []
    for (const f of spec.filters) {
      validateIdent(f.col, 'filter column')
      if (f.op === 'is_null') whereParts.push(`${ident(f.col)} IS NULL`)
      else if (f.op === 'is_not_null') whereParts.push(`${ident(f.col)} IS NOT NULL`)
      else if (f.op === 'in') whereParts.push(`${ident(f.col)} = ANY(${ph(f.val)})`)
      else whereParts.push(`${ident(f.col)} ${f.op} ${ph(f.val)}`)
    }
    const where = whereParts.length ? ' WHERE ' + whereParts.join(' AND ') : ''

    const orderClause = spec.order.length
      ? ' ORDER BY ' +
        spec.order
          .map(o => {
            validateIdent(o.col, 'order column')
            return `${ident(o.col)} ${o.ascending ? 'ASC' : 'DESC'} NULLS ${o.nullsLast ? 'LAST' : 'FIRST'}`
          })
          .join(', ')
      : ''
    const limitClause = spec.limit != null ? ` LIMIT ${Math.max(0, Math.floor(spec.limit))}` : ''

    let sql: string
    if (spec.action === 'select') {
      if (spec.headOnly) {
        // Skip row payload — return just the count via a COUNT(*) query.
        const countSql = `SELECT COUNT(*)::int AS n FROM ${ident(spec.table)}${where}`
        const res = await pool.query(countSql, params)
        return { data: null, error: null, count: res.rows[0]?.n ?? 0 }
      }
      sql = `SELECT ${selectExpr} FROM ${ident(spec.table)}${where}${orderClause}${limitClause}`
    } else if (spec.action === 'delete') {
      sql = `DELETE FROM ${ident(spec.table)}${where}` + (spec.returnSelect || spec.single ? ` RETURNING ${selectExpr}` : '')
    } else if (spec.action === 'insert' || spec.action === 'upsert') {
      const rows = (spec.values as Record<string, unknown>[]) || []
      if (!rows.length) return { data: spec.single ? null : ([] as unknown as T), error: null, count: 0 }
      const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
      cols.forEach(c => validateIdent(c, 'insert column'))
      const valueRows = rows
        .map(r => '(' + cols.map(c => (c in r ? ph(r[c]) : 'DEFAULT')).join(', ') + ')')
        .join(', ')
      sql = `INSERT INTO ${ident(spec.table)} (${cols.map(ident).join(', ')}) VALUES ${valueRows}`
      if (spec.action === 'upsert') {
        if (spec.conflictTarget) {
          const targets = spec.conflictTarget.split(',').map(s => s.trim())
          targets.forEach(t => validateIdent(t, 'conflict column'))
          const target = targets.map(ident).join(', ')
          const updatable = cols.filter(c => !targets.includes(c))
          sql += ` ON CONFLICT (${target})` +
            (updatable.length ? ` DO UPDATE SET ${updatable.map(c => `${ident(c)} = EXCLUDED.${ident(c)}`).join(', ')}` : ' DO NOTHING')
        } else {
          sql += ' ON CONFLICT DO NOTHING'
        }
      }
      if (spec.returnSelect || spec.single) sql += ` RETURNING ${selectExpr}`
    } else {
      const v = (spec.values as Record<string, unknown>) || {}
      const cols = Object.keys(v)
      if (!cols.length) return { data: null, error: { message: 'update() called with no fields' } }
      cols.forEach(c => validateIdent(c, 'update column'))
      sql = `UPDATE ${ident(spec.table)} SET ${cols.map(c => `${ident(c)} = ${ph(v[c])}`).join(', ')}${where}`
      if (spec.returnSelect || spec.single) sql += ` RETURNING ${selectExpr}`
    }

    const result = await pool.query(sql, params)
    if (spec.single === 'one') {
      if (!result.rows.length) return { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
      return { data: result.rows[0] as T, error: null }
    }
    if (spec.single === 'maybe') {
      return { data: (result.rows[0] ?? null) as T | null, error: null }
    }
    if (spec.action === 'select' || spec.returnSelect) {
      return { data: result.rows as T, error: null, count: result.rowCount }
    }
    return { data: null, error: null, count: result.rowCount }
  } catch (e) {
    const err = e as { message: string; code?: string }
    return { data: null, error: { message: err.message, code: err.code } }
  }
}
