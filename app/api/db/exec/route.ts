// JSON-RPC endpoint that the browser-side shim posts query specs to.
// The middleware enforces the session cookie before this handler runs.
import { NextRequest, NextResponse } from 'next/server'
import { execSpec, type ExecSpec } from '@/lib/db-exec'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let spec: ExecSpec
  try {
    spec = (await req.json()) as ExecSpec
  } catch {
    return NextResponse.json({ data: null, error: { message: 'invalid json' } }, { status: 400 })
  }
  const result = await execSpec(spec)
  return NextResponse.json(result)
}
