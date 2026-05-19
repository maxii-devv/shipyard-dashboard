import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// Queue of posts with no transcript, highest-value first. Transcription itself
// runs through the browser/n8n pipeline (see CLAUDE.md), so this endpoint is
// the consumable list that /viral-coach-skills:tag-posts works through.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await pool.query(`
    SELECT instagram_media_id, caption, permalink, post_timestamp,
           media_type, views, saves
    FROM content_performance
    WHERE transcript IS NULL OR transcript = ''
    ORDER BY views DESC NULLS LAST, post_timestamp DESC
  `)

  return NextResponse.json({ count: res.rows.length, posts: res.rows })
}
