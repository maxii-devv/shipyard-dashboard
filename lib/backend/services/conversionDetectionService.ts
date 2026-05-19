import pool from '@/lib/backend/db'
import { getMediaComments } from '@/lib/backend/instagram'
import { countKeywordMatches } from '@/lib/backend/util/match'

export interface ConversionDetectionResult {
  processed: number
  marked_true: number
  marked_false: number
  errors: { instagram_media_id: string; cta_keyword: string; error: string }[]
  details: {
    instagram_media_id: string
    cta_keyword: string
    matches: number
    drove_sales: boolean
  }[]
}

interface PostRow {
  instagram_media_id: string
  cta_keyword: string
}

export async function detectConversions(): Promise<ConversionDetectionResult> {
  const result: ConversionDetectionResult = {
    processed: 0,
    marked_true: 0,
    marked_false: 0,
    errors: [],
    details: [],
  }

  const client = await pool.connect()
  let candidates: PostRow[]

  try {
    const res = await client.query<PostRow>(`
      SELECT p.instagram_media_id, p.cta_keyword
      FROM content_posts p
      WHERE p.cta_keyword IS NOT NULL
        AND p.drove_sales IS NULL
        AND p.instagram_media_id IS NOT NULL
      ORDER BY p.instagram_media_id
    `)
    candidates = res.rows
  } finally {
    client.release()
  }

  for (const post of candidates) {
    try {
      const comments = await getMediaComments(post.instagram_media_id)
      const matches = countKeywordMatches(comments, post.cta_keyword)
      const droveSales = matches >= 1
      const notes = `auto: ${matches} comment match${matches === 1 ? '' : 'es'} for "${post.cta_keyword}" (${comments.length} comments scanned)`

      await pool.query(
        `UPDATE content_posts
            SET drove_sales = $1, conversion_notes = $2, reviewed_at = NOW()
          WHERE instagram_media_id = $3`,
        [droveSales, notes, post.instagram_media_id]
      )

      result.processed++
      if (droveSales) result.marked_true++
      else result.marked_false++
      result.details.push({
        instagram_media_id: post.instagram_media_id,
        cta_keyword: post.cta_keyword,
        matches,
        drove_sales: droveSales,
      })
    } catch (err) {
      result.errors.push({
        instagram_media_id: post.instagram_media_id,
        cta_keyword: post.cta_keyword,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}
