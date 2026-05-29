import { NextResponse } from 'next/server'
import { getInstagramTokenStatus, validateInstagramToken } from '@/lib/backend/instagram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Session-gated (middleware). Powers the dashboard banner: does a live /me
// check so the UI reflects real connection state, not just "a row exists".
export async function GET() {
  const status = await getInstagramTokenStatus()
  if (!status.present) {
    return NextResponse.json({ connected: false, present: false })
  }
  const check = await validateInstagramToken()
  return NextResponse.json({
    connected: check.valid,
    present: true,
    username: check.username ?? null,
    age_days: status.age_days,
    error: check.valid ? null : check.error,
  })
}
