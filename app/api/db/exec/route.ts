// JSON-RPC endpoint that the browser-side shim posts query specs to.
// The middleware enforces the session cookie AND a same-origin check before
// this handler runs, so the caller is known to be our own dashboard.
//
// Two extra defenses we add here:
//   - Body size cap (1 MiB) — keeps a runaway client from OOM'ing the server.
//   - Error sanitization — pg's error messages leak table / column / constraint
//     names ("relation \"ideas\" does not exist", "duplicate key value violates
//     unique constraint \"ideas_pkey\""). Those are useful for schema fingerprinting,
//     so we log the real message server-side and return a generic one.
import { NextRequest, NextResponse } from 'next/server'
import { execSpec, type ExecSpec } from '@/lib/db-exec'
import { readJsonGuarded } from '@/lib/security/body-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BODY_LIMIT = 1 << 20 // 1 MiB

// Pg error codes that are safe to surface verbatim — they describe
// *intentional* failures the UI is expected to react to (e.g. PGRST116 "no
// rows found"). Everything else gets a generic message.
const SAFE_CODES = new Set([
  'PGRST116', // 'No rows found' from .single() — call sites depend on this
])

export async function POST(req: NextRequest) {
  const parsed = await readJsonGuarded<ExecSpec>(req, BODY_LIMIT)
  if (!parsed.ok) {
    return NextResponse.json({ data: null, error: { message: 'invalid request' } }, { status: parsed.res.status })
  }
  const spec = parsed.data
  const result = await execSpec(spec)
  if (result.error && !SAFE_CODES.has(result.error.code || '')) {
    // Log the real error for ops debugging…
    console.error('[db/exec] table=%s action=%s err=%s', spec?.table, spec?.action, result.error.message)
    // …but only return a generic message to the client.
    return NextResponse.json({ data: null, error: { message: 'database error', code: result.error.code } })
  }
  return NextResponse.json(result)
}
