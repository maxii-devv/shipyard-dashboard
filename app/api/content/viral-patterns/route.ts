import { NextRequest, NextResponse } from 'next/server'
import { extractPatterns } from '@/lib/backend/services/viralPatternsService'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '90', 10), 365)

  try {
    const patterns = await extractPatterns(days)
    return NextResponse.json(patterns)
  } catch (err) {
    console.error('viral-patterns error:', err)
    return NextResponse.json({ error: 'Failed to extract patterns' }, { status: 500 })
  }
}
