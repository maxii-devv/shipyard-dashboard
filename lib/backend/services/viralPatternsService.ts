import pool from '@/lib/backend/db'
import { aggregatePatterns, sampleSizeWarning } from '@/lib/backend/util/patterns'

export interface BaselineMetrics {
  avg_views: number
  avg_likes: number
  avg_shares: number
  avg_saves: number
  avg_engagement_rate: number
  post_count: number
  days: number
}

export interface OutlierPost {
  instagram_media_id: string
  caption: string | null
  media_type: string
  permalink: string
  post_timestamp: string
  views: number
  likes: number
  shares: number
  saves: number
  engagement_rate: number
  outlier_score: number
}

export interface BreakdownRow {
  label: string
  avg_views: number
  avg_saves: number
  avg_engagement_rate: number
  count: number
  reviewed_count: number
  drove_sales_count: number
  drove_sales_rate: number | null
}

interface PatternBucket {
  avg_views: number
  count: number
  reviewed_count: number
  drove_sales_count: number
  drove_sales_rate: number | null
}

export interface ViralPatterns {
  baseline: BaselineMetrics
  outliers: OutlierPost[]
  patterns: {
    top_hook_styles: ({ style: string } & PatternBucket)[]
    best_cta_keywords: ({ keyword: string } & PatternBucket)[]
    best_content_types: ({ type: string } & PatternBucket)[]
    best_layouts: ({ layout: string } & PatternBucket)[]
    sample_size_warning: string | null
  }
  breakdown: {
    by_hook_type: BreakdownRow[]
    by_content_type: BreakdownRow[]
    by_layout: BreakdownRow[]
  }
  generated_at: string
}

export async function getBaseline(days: number): Promise<BaselineMetrics> {
  const res = await pool.query<BaselineMetrics>(
    `SELECT
       ROUND(AVG(views))::int AS avg_views,
       ROUND(AVG(likes))::int AS avg_likes,
       ROUND(AVG(shares))::int AS avg_shares,
       ROUND(AVG(saves))::int AS avg_saves,
       ROUND(AVG(engagement_rate)::numeric, 4) AS avg_engagement_rate,
       COUNT(*)::int AS post_count,
       $1::int AS days
     FROM content_performance
     WHERE post_timestamp > NOW() - ($1 || ' days')::interval`,
    [days]
  )
  return res.rows[0]
}

export async function detectOutliers(days: number): Promise<OutlierPost[]> {
  const res = await pool.query<OutlierPost>(
    `WITH baseline AS (
       SELECT AVG(views) AS avg_views, AVG(shares) AS avg_shares, AVG(saves) AS avg_saves
       FROM content_performance
       WHERE post_timestamp > NOW() - ($1 || ' days')::interval
     )
     SELECT
       cp.instagram_media_id,
       cp.caption,
       cp.media_type,
       cp.permalink,
       cp.post_timestamp,
       cp.views,
       cp.likes,
       cp.shares,
       cp.saves,
       cp.engagement_rate,
       GREATEST(
         CASE WHEN b.avg_views > 0 THEN cp.views / b.avg_views ELSE 0 END,
         CASE WHEN b.avg_shares > 0 THEN cp.shares / b.avg_shares ELSE 0 END,
         CASE WHEN b.avg_saves > 0 THEN cp.saves / b.avg_saves ELSE 0 END
       ) AS outlier_score
     FROM content_performance cp, baseline b
     WHERE cp.post_timestamp > NOW() - ($1 || ' days')::interval
       AND (
         (b.avg_views > 0 AND cp.views >= b.avg_views * 2) OR
         (b.avg_shares > 0 AND cp.shares >= b.avg_shares * 2) OR
         (b.avg_saves > 0 AND cp.saves >= b.avg_saves * 2)
       )
     ORDER BY outlier_score DESC`,
    [days]
  )
  return res.rows
}

async function getBreakdown(days: number) {
  async function byField(field: string): Promise<BreakdownRow[]> {
    const res = await pool.query(
      `SELECT
         p.${field} AS label,
         ROUND(AVG(cp.views))::int AS avg_views,
         ROUND(AVG(cp.saves))::int AS avg_saves,
         ROUND(AVG(cp.engagement_rate)::numeric, 4) AS avg_engagement_rate,
         COUNT(*)::int AS count,
         COUNT(*) FILTER (WHERE p.drove_sales IS NOT NULL)::int AS reviewed_count,
         COUNT(*) FILTER (WHERE p.drove_sales IS TRUE)::int AS drove_sales_count,
         CASE WHEN COUNT(*) FILTER (WHERE p.drove_sales IS NOT NULL) > 0
              THEN ROUND(COUNT(*) FILTER (WHERE p.drove_sales IS TRUE)::numeric
                         / COUNT(*) FILTER (WHERE p.drove_sales IS NOT NULL), 3)::float
              ELSE NULL END AS drove_sales_rate
       FROM content_posts p
       JOIN content_performance cp ON cp.instagram_media_id = p.instagram_media_id
       WHERE cp.post_timestamp > NOW() - ($1 || ' days')::interval
         AND p.${field} IS NOT NULL
       GROUP BY p.${field}
       ORDER BY avg_views DESC`,
      [days]
    )
    return res.rows
  }
  const [by_hook_type, by_content_type, by_layout] = await Promise.all([
    byField('hook_type'),
    byField('content_type'),
    byField('layout'),
  ])
  return { by_hook_type, by_content_type, by_layout }
}

export async function extractPatterns(days: number): Promise<ViralPatterns> {
  const [baseline, outliers, breakdown] = await Promise.all([
    getBaseline(days),
    detectOutliers(days),
    getBreakdown(days),
  ])

  // Join outliers with content_posts for hook_type, cta_keyword, content_type, layout
  const outlierIds = outliers.map(o => o.instagram_media_id)

  let postData: {
    instagram_media_id: string
    hook_type: string | null
    cta_keyword: string | null
    content_type: string | null
    layout: string | null
    views: number
    drove_sales: boolean | null
  }[] = []

  if (outlierIds.length > 0) {
    const placeholders = outlierIds.map((_, i) => `$${i + 1}`).join(',')
    const res = await pool.query(
      `SELECT p.instagram_media_id, p.hook_type, p.cta_keyword, p.content_type, p.layout,
              p.drove_sales, cp.views
       FROM content_posts p
       JOIN content_performance cp ON cp.instagram_media_id = p.instagram_media_id
       WHERE p.instagram_media_id IN (${placeholders})`,
      outlierIds
    )
    postData = res.rows
  }

  const aggregate = (field: 'hook_type' | 'cta_keyword' | 'content_type' | 'layout') =>
    aggregatePatterns(postData, field)

  const sampleWarning = sampleSizeWarning(baseline.post_count, days)

  return {
    baseline,
    outliers,
    breakdown,
    patterns: {
      top_hook_styles: aggregate('hook_type') as unknown as ({ style: string } & PatternBucket)[],
      best_cta_keywords: aggregate('cta_keyword') as unknown as ({ keyword: string } & PatternBucket)[],
      best_content_types: aggregate('content_type') as unknown as ({ type: string } & PatternBucket)[],
      best_layouts: aggregate('layout') as unknown as ({ layout: string } & PatternBucket)[],
      sample_size_warning: sampleWarning,
    },
    generated_at: new Date().toISOString(),
  }
}
