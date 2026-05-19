import pool from '@/lib/db'

export interface DailyActivity {
  date: string
  posts: number
  views: number
}

export async function getPostingActivity(days = 365): Promise<DailyActivity[]> {
  const result = await pool.query(
    `SELECT
       DATE(post_timestamp AT TIME ZONE 'UTC') AS date,
       COUNT(*)::int                            AS posts,
       COALESCE(SUM(views), 0)::bigint          AS views
     FROM content_performance
     WHERE post_timestamp >= NOW() - ($1 || ' days')::interval
     GROUP BY DATE(post_timestamp AT TIME ZONE 'UTC')
     ORDER BY date ASC`,
    [days]
  )
  return result.rows.map(r => ({
    date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10),
    posts: Number(r.posts),
    views: Number(r.views),
  }))
}

export interface DayOfWeekStat {
  dow: number
  dow_name: string
  avg_views: number
  post_count: number
}

export interface PostingInsight {
  best_dow: DayOfWeekStat | null
  worst_dow: DayOfWeekStat | null
  dow_breakdown: DayOfWeekStat[]
  sample_size_warning: string | null
}

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function getPostingInsight(days = 180): Promise<PostingInsight> {
  const result = await pool.query<{ dow: string; avg_views: string; post_count: string }>(
    `SELECT
       EXTRACT(DOW FROM post_timestamp AT TIME ZONE 'UTC')::int AS dow,
       COALESCE(AVG(views), 0)                                  AS avg_views,
       COUNT(*)                                                 AS post_count
     FROM content_performance
     WHERE post_timestamp >= NOW() - ($1 || ' days')::interval
     GROUP BY dow
     ORDER BY dow ASC`,
    [days]
  )

  const dow_breakdown: DayOfWeekStat[] = result.rows.map(r => ({
    dow: Number(r.dow),
    dow_name: DOW_NAMES[Number(r.dow)],
    avg_views: Math.round(Number(r.avg_views)),
    post_count: Number(r.post_count),
  }))

  // Only consider days with at least 2 posts to avoid one-shot bias
  const reliable = dow_breakdown.filter(d => d.post_count >= 2)
  const sorted = [...reliable].sort((a, b) => b.avg_views - a.avg_views)
  const total = dow_breakdown.reduce((s, d) => s + d.post_count, 0)

  return {
    best_dow: sorted[0] ?? null,
    worst_dow: sorted[sorted.length - 1] ?? null,
    dow_breakdown,
    sample_size_warning:
      total < 14 ? `Only ${total} posts in the last ${days}d — best-day insight may not be reliable yet` : null,
  }
}

export interface LatestPost {
  instagram_media_id: string
  caption: string | null
  media_type: string
  permalink: string
  post_timestamp: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement_rate: number
  thumbnail_url: string | null
  media_url: string | null
  hook_type: string | null
  content_type: string | null
  layout: string | null
  cta_keyword: string | null
}

export async function getLatestPost(): Promise<LatestPost | null> {
  const res = await pool.query<LatestPost>(
    `SELECT
       cp.instagram_media_id, cp.caption, cp.media_type, cp.permalink,
       cp.post_timestamp, cp.views, cp.likes, cp.comments, cp.shares, cp.saves,
       cp.engagement_rate,
       COALESCE(cp.thumbnail_url, cp.media_url) AS thumbnail_url,
       cp.media_url,
       p.hook_type, p.content_type, p.layout, p.cta_keyword
     FROM content_performance cp
     LEFT JOIN content_posts p ON p.instagram_media_id = cp.instagram_media_id
     ORDER BY cp.post_timestamp DESC
     LIMIT 1`
  )
  return res.rows[0] ?? null
}

export interface SidebarStats {
  totalViews: number
  spark: number[]
  sparkDates: string[]
  days: number
}

export async function getSidebarStats(days = 30): Promise<SidebarStats> {
  const result = await pool.query(
    `SELECT
       DATE(post_timestamp AT TIME ZONE 'UTC') AS date,
       COALESCE(SUM(views), 0)::bigint          AS views
     FROM content_performance
     WHERE post_timestamp >= NOW() - ($1 || ' days')::interval
     GROUP BY DATE(post_timestamp AT TIME ZONE 'UTC')
     ORDER BY date ASC`,
    [days]
  )

  const totalViews = result.rows.reduce((s, r) => s + Number(r.views), 0)
  const spark = result.rows.map(r => Number(r.views))
  const sparkDates = result.rows.map(r =>
    typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10)
  )
  return { totalViews, spark, sparkDates, days }
}
