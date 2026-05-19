import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { instagram_media_id, hook_type, content_type, layout, cta_keyword, transcript } = body

  if (!instagram_media_id) {
    return NextResponse.json({ error: 'instagram_media_id required' }, { status: 400 })
  }

  if (transcript) {
    await pool.query(
      `UPDATE content_performance SET transcript = $1 WHERE instagram_media_id = $2`,
      [transcript, instagram_media_id]
    )
  }

  await pool.query(
    `INSERT INTO content_posts (instagram_media_id, hook_type, content_type, layout, cta_keyword)
     VALUES ($1, $2, $3, $4, $5)`,
    [instagram_media_id, hook_type || null, content_type || null, layout || null, cta_keyword || null]
  )

  return NextResponse.json({ ok: true })
}
