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
           cp.views, cp.likes, cp.comments, cp.saves, cp.engagement_rate, cp.transcript,
           p.hook_type, p.content_type, p.layout, p.cta_keyword
    FROM content_posts p
    JOIN content_performance cp ON cp.instagram_media_id = p.instagram_media_id
    WHERE p.drove_sales IS NULL
    ORDER BY cp.post_timestamp DESC
  `)

  return NextResponse.json(res.rows)
}
