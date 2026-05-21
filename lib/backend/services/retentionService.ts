import pool from '@/lib/backend/db'

// Anything older than this is treated as if it never existed. Set at the user's
// request (2026-05-21) to keep DB growth bounded — the dashboard only ever
// queries up to 365d windows anyway, so older posts contribute nothing to
// outlier patterns or daily growth charts.
const RETENTION_DAYS = 365

export type RetentionResult = {
  retention_days: number
  cutoff: string
  posts_deleted: number
  tags_deleted: number
  snapshots_deleted: number
}

/**
 * Prune everything older than RETENTION_DAYS. Three-step delete in one tx:
 *
 *   1. content_posts (tags) for doomed posts — done first because the FK is
 *      ON DELETE SET NULL (migrations/001_initial.sql:36), so deleting the
 *      parent first would leave tag rows orphaned with instagram_media_id=NULL.
 *   2. content_performance_snapshots — both rows older than the cutoff
 *      (regardless of which post they belong to) AND any snapshot tied to
 *      a doomed post.
 *   3. content_performance — the post itself.
 *
 * Returns deletion counts; wrap-up logged by the cron route's summary.
 */
export async function pruneOldData(): Promise<RetentionResult> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  // captured_date is a DATE column, so use the YYYY-MM-DD form for that compare.
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const tagsRes = await client.query(
      `DELETE FROM content_posts
       WHERE instagram_media_id IN (
         SELECT instagram_media_id FROM content_performance
         WHERE post_timestamp IS NOT NULL AND post_timestamp < $1
       )`,
      [cutoff]
    )

    const snapsRes = await client.query(
      `DELETE FROM content_performance_snapshots
       WHERE captured_date < $1
          OR instagram_media_id IN (
            SELECT instagram_media_id FROM content_performance
            WHERE post_timestamp IS NOT NULL AND post_timestamp < $2
          )`,
      [cutoffDate, cutoff]
    )

    const postsRes = await client.query(
      `DELETE FROM content_performance
       WHERE post_timestamp IS NOT NULL AND post_timestamp < $1`,
      [cutoff]
    )

    await client.query('COMMIT')

    return {
      retention_days: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      posts_deleted: postsRes.rowCount ?? 0,
      tags_deleted: tagsRes.rowCount ?? 0,
      snapshots_deleted: snapsRes.rowCount ?? 0,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
