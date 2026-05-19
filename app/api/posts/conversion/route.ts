import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { instagram_media_id, drove_sales, conversion_notes } = body

  if (!instagram_media_id) {
    return NextResponse.json({ error: 'instagram_media_id required' }, { status: 400 })
  }

  if (typeof drove_sales !== 'boolean') {
    return NextResponse.json({ error: 'drove_sales must be a boolean' }, { status: 400 })
  }

  const res = await pool.query(
    `UPDATE content_posts
       SET drove_sales = $1,
           conversion_notes = $2,
           reviewed_at = NOW()
     WHERE instagram_media_id = $3
     RETURNING id, instagram_media_id, drove_sales, conversion_notes, reviewed_at`,
    [drove_sales, conversion_notes ?? null, instagram_media_id]
  )

  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'Post not found in content_posts (must be tagged first)' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, row: res.rows[0] })
}
