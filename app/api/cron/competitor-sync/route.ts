import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/competitor-sync
 * Called daily by Vercel Cron (see vercel.json: 0 4 * * * = 4AM UTC).
 * Forwards to the competitor sync POST endpoint with Cron auth.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`

  const res = await fetch(`${base}/api/competitors/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
