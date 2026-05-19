import pool from '@/lib/backend/db'
import { extractKeyword } from '@/lib/backend/util/match'

export async function linkUnlinkedMedia(): Promise<number> {
  const client = await pool.connect()
  let linked = 0

  try {
    // Find content_posts that have no instagram_media_id yet
    const unlinked = await client.query<{ id: number; cta_keyword: string; title: string }>(
      `SELECT id, cta_keyword, title FROM content_posts WHERE instagram_media_id IS NULL`
    )

    for (const post of unlinked.rows) {
      let mediaId: string | null = null

      // 1. Match by ManyChat keyword in caption
      if (post.cta_keyword) {
        const kw = post.cta_keyword.toUpperCase()
        const res = await client.query<{ instagram_media_id: string }>(
          `SELECT instagram_media_id FROM content_performance
           WHERE caption ILIKE $1
           ORDER BY post_timestamp DESC LIMIT 1`,
          [`%Comment ${kw}%`]
        )
        if (res.rows.length > 0) mediaId = res.rows[0].instagram_media_id
      }

      // 2. Fallback: fuzzy title similarity via pg_trgm
      if (!mediaId && post.title) {
        const res = await client.query<{ instagram_media_id: string }>(
          `SELECT instagram_media_id FROM content_performance
           WHERE caption % $1
           ORDER BY similarity(caption, $1) DESC, post_timestamp DESC
           LIMIT 1`,
          [post.title]
        )
        if (res.rows.length > 0) mediaId = res.rows[0].instagram_media_id
      }

      if (mediaId) {
        await client.query(
          `UPDATE content_posts SET instagram_media_id = $1 WHERE id = $2`,
          [mediaId, post.id]
        )
        linked++
      }
    }

    // Also link content_performance rows: extract keyword from caption and match to content_posts
    const unlinkedMedia = await client.query<{ instagram_media_id: string; caption: string }>(
      `SELECT cp.instagram_media_id, cp.caption
       FROM content_performance cp
       LEFT JOIN content_posts posts ON posts.instagram_media_id = cp.instagram_media_id
       WHERE posts.id IS NULL AND cp.caption IS NOT NULL`
    )

    for (const media of unlinkedMedia.rows) {
      const keyword = extractKeyword(media.caption)
      if (!keyword) continue

      const res = await client.query<{ id: number }>(
        `SELECT id FROM content_posts WHERE cta_keyword ILIKE $1 AND instagram_media_id IS NULL LIMIT 1`,
        [keyword]
      )
      if (res.rows.length > 0) {
        await client.query(
          `UPDATE content_posts SET instagram_media_id = $1 WHERE id = $2`,
          [media.instagram_media_id, res.rows[0].id]
        )
        linked++
      }
    }
  } finally {
    client.release()
  }

  return linked
}
