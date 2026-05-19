import { NextRequest, NextResponse } from 'next/server'
import { getSidebarStats } from '@/lib/services/postingActivityService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const daysParam = req.nextUrl.searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam ?? '30', 10) || 30, 1), 365)
    const stats = await getSidebarStats(days)
    return NextResponse.json(stats)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
