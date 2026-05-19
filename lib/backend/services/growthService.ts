import pool from '@/lib/backend/db'

export interface TopMover {
  instagram_media_id: string
  caption: string | null
  permalink: string
  post_timestamp: string
  current_views: number
  views_delta: number
  likes_delta: number
  snapshots_count: number
  earliest_date: string
  latest_date: string
}

export interface HistoryPoint {
  captured_date: string
  views: number
  likes: number
  engagement_rate: number
}

export async function getTopMovers(days: number, limit: number): Promise<TopMover[]> {
  const res = await pool.query<TopMover>(
    `WITH snapshots_in_window AS (
       SELECT
         instagram_media_id,
         captured_date,
         views,
         likes,
         ROW_NUMBER() OVER (PARTITION BY instagram_media_id ORDER BY captured_date ASC)  AS rn_asc,
         ROW_NUMBER() OVER (PARTITION BY instagram_media_id ORDER BY captured_date DESC) AS rn_desc,
         COUNT(*)   OVER (PARTITION BY instagram_media_id) AS n_snapshots
       FROM content_performance_snapshots
       WHERE captured_date > CURRENT_DATE - ($1 || ' days')::interval
     ),
     earliest AS (
       SELECT instagram_media_id, views AS start_views, likes AS start_likes,
              captured_date AS earliest_date
       FROM snapshots_in_window WHERE rn_asc = 1
     ),
     latest AS (
       SELECT instagram_media_id, views AS end_views, likes AS end_likes,
              captured_date AS latest_date, n_snapshots
       FROM snapshots_in_window WHERE rn_desc = 1
     )
     SELECT
       cp.instagram_media_id,
       cp.caption,
       cp.permalink,
       cp.post_timestamp,
       l.end_views AS current_views,
       (l.end_views - e.start_views)::int AS views_delta,
       (l.end_likes - e.start_likes)::int AS likes_delta,
       l.n_snapshots::int AS snapshots_count,
       e.earliest_date,
       l.latest_date
     FROM earliest e
     JOIN latest l ON l.instagram_media_id = e.instagram_media_id
     JOIN content_performance cp ON cp.instagram_media_id = e.instagram_media_id
     WHERE l.end_views - e.start_views > 0
     ORDER BY views_delta DESC
     LIMIT $2`,
    [days, limit]
  )
  return res.rows
}

export async function getPostHistory(mediaId: string, days: number): Promise<HistoryPoint[]> {
  const res = await pool.query<HistoryPoint>(
    `SELECT captured_date, views, likes, engagement_rate
     FROM content_performance_snapshots
     WHERE instagram_media_id = $1
       AND captured_date > CURRENT_DATE - ($2 || ' days')::interval
     ORDER BY captured_date ASC`,
    [mediaId, days]
  )
  return res.rows
}

export async function getTopMoversWithHistory(
  days: number,
  limit: number
): Promise<(TopMover & { history: HistoryPoint[] })[]> {
  const movers = await getTopMovers(days, limit)
  if (movers.length === 0) return []

  const ids = movers.map(m => m.instagram_media_id)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')

  const hist = await pool.query<HistoryPoint & { instagram_media_id: string }>(
    `SELECT instagram_media_id, captured_date, views, likes, engagement_rate
     FROM content_performance_snapshots
     WHERE instagram_media_id IN (${placeholders})
       AND captured_date > CURRENT_DATE - ($${ids.length + 1} || ' days')::interval
     ORDER BY captured_date ASC`,
    [...ids, days]
  )

  const byId: Record<string, HistoryPoint[]> = {}
  for (const row of hist.rows) {
    const { instagram_media_id, ...point } = row
    if (!byId[instagram_media_id]) byId[instagram_media_id] = []
    byId[instagram_media_id].push(point)
  }

  return movers.map(m => ({ ...m, history: byId[m.instagram_media_id] ?? [] }))
}
