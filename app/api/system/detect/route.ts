import { NextRequest, NextResponse } from 'next/server'
import { detectConversions } from '@/lib/backend/services/conversionDetectionService'
import { getSystemHealth } from '@/lib/backend/services/systemHealthService'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const detection = await detectConversions()
    const health = await getSystemHealth()
    return NextResponse.json({ detection, health })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
