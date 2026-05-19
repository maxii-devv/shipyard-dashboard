import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await pool.query(`
    SELECT cp.instagram_media_id, cp.caption, cp.permalink, cp.post_timestamp,
           cp.views, cp.saves, cp.transcript
    FROM content_performance cp
    LEFT JOIN content_posts p ON p.instagram_media_id = cp.instagram_media_id
    WHERE p.instagram_media_id IS NULL
    ORDER BY cp.post_timestamp DESC
  `)

  return NextResponse.json(res.rows)
}
