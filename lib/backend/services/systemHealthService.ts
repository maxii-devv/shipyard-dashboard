import pool from '@/lib/backend/db'
import { getInstagramTokenStatus } from '@/lib/backend/instagram'

export interface ZeroMetricRow {
  instagram_media_id: string
  permalink: string
  post_timestamp: string
  caption: string | null
  synced_at: string
}

export interface UntaggedRow {
  instagram_media_id: string
  permalink: string
  post_timestamp: string
  views: number
}

export interface MissingCtaRow {
  instagram_media_id: string
  permalink: string
  post_timestamp: string
  views: number
  hook_type: string | null
  content_type: string | null
}

export interface ThinBucket {
  field: 'hook_type' | 'content_type' | 'layout' | 'cta_keyword'
  label: string
  count: number
  reviewed_count: number
}

export interface Recommendation {
  severity: 'high' | 'medium' | 'low'
  category: string
  message: string
  action: string
}

export interface SystemHealthReport {
  generated_at: string

  totals: {
    content_performance: number
    content_posts: number
    auto_reviewed: number
    cannot_review_no_cta: number
    awaiting_detection: number
  }

  sync: {
    last_synced_at: string | null
    hours_since_sync: number | null
    is_stale: boolean
    newest_post_at: string | null
    hours_since_newest_post: number | null
  }

  missing_transcript_count: number

  instagram_token: {
    present: boolean
    age_days: number | null
    refreshed_at: string | null
  }

  conversion_coverage: {
    tagged_with_cta: number
    auto_filled: number
    coverage_pct: number
  }

  zero_metric_rows: ZeroMetricRow[]
  untagged_posts: UntaggedRow[]
  missing_cta: MissingCtaRow[]
  thin_buckets: ThinBucket[]

  recommendations: Recommendation[]
}

export async function getSystemHealth(): Promise<SystemHealthReport> {
  const totalsRes = await pool.query<{
    content_performance: string
    content_posts: string
    auto_reviewed: string
    cannot_review_no_cta: string
    awaiting_detection: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM content_performance)::text AS content_performance,
      (SELECT COUNT(*) FROM content_posts)::text AS content_posts,
      (SELECT COUNT(*) FROM content_posts WHERE drove_sales IS NOT NULL)::text AS auto_reviewed,
      (SELECT COUNT(*) FROM content_posts WHERE cta_keyword IS NULL)::text AS cannot_review_no_cta,
      (SELECT COUNT(*) FROM content_posts WHERE cta_keyword IS NOT NULL AND drove_sales IS NULL)::text AS awaiting_detection
  `)
  const totals = {
    content_performance: parseInt(totalsRes.rows[0].content_performance, 10),
    content_posts: parseInt(totalsRes.rows[0].content_posts, 10),
    auto_reviewed: parseInt(totalsRes.rows[0].auto_reviewed, 10),
    cannot_review_no_cta: parseInt(totalsRes.rows[0].cannot_review_no_cta, 10),
    awaiting_detection: parseInt(totalsRes.rows[0].awaiting_detection, 10),
  }

  const syncRes = await pool.query<{
    last_synced_at: string | null
    newest_post_at: string | null
    missing_transcript: string
  }>(`
    SELECT
      MAX(synced_at)::text AS last_synced_at,
      MAX(post_timestamp)::text AS newest_post_at,
      COUNT(*) FILTER (WHERE transcript IS NULL OR transcript = '')::text AS missing_transcript
    FROM content_performance
  `)
  const lastSyncedAt = syncRes.rows[0].last_synced_at
  const hoursSinceSync = lastSyncedAt
    ? (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000
    : null
  const isStale = hoursSinceSync === null ? true : hoursSinceSync > 24
  const newestPostAt = syncRes.rows[0].newest_post_at
  const hoursSinceNewestPost = newestPostAt
    ? (Date.now() - new Date(newestPostAt).getTime()) / 3_600_000
    : null
  const missingTranscriptCount = parseInt(syncRes.rows[0].missing_transcript, 10)

  const tokenStatus = await getInstagramTokenStatus()

  const coverageRes = await pool.query<{ tagged_with_cta: string; auto_filled: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE cta_keyword IS NOT NULL)::text AS tagged_with_cta,
      COUNT(*) FILTER (WHERE cta_keyword IS NOT NULL AND drove_sales IS NOT NULL)::text AS auto_filled
    FROM content_posts
  `)
  const taggedWithCta = parseInt(coverageRes.rows[0].tagged_with_cta, 10)
  const autoFilled = parseInt(coverageRes.rows[0].auto_filled, 10)
  const coveragePct = taggedWithCta > 0 ? Math.round((autoFilled / taggedWithCta) * 100) : 0

  const zeroRes = await pool.query<ZeroMetricRow>(`
    SELECT instagram_media_id, permalink, post_timestamp::text, caption, synced_at::text
    FROM content_performance
    WHERE views = 0 AND likes = 0 AND comments = 0
      AND post_timestamp > NOW() - INTERVAL '180 days'
    ORDER BY post_timestamp DESC
    LIMIT 50
  `)

  const untaggedRes = await pool.query<UntaggedRow>(`
    SELECT cp.instagram_media_id, cp.permalink, cp.post_timestamp::text, cp.views
    FROM content_performance cp
    LEFT JOIN content_posts p ON p.instagram_media_id = cp.instagram_media_id
    WHERE p.id IS NULL
    ORDER BY cp.post_timestamp DESC
    LIMIT 50
  `)

  const missingCtaRes = await pool.query<MissingCtaRow>(`
    SELECT p.instagram_media_id, cp.permalink, cp.post_timestamp::text, cp.views,
           p.hook_type, p.content_type
    FROM content_posts p
    JOIN content_performance cp ON cp.instagram_media_id = p.instagram_media_id
    WHERE p.cta_keyword IS NULL
    ORDER BY cp.views DESC NULLS LAST
    LIMIT 20
  `)

  const thinBuckets: ThinBucket[] = []
  for (const field of ['hook_type', 'content_type', 'layout', 'cta_keyword'] as const) {
    const res = await pool.query<{ label: string; count: string; reviewed_count: string }>(
      `SELECT ${field} AS label,
              COUNT(*)::text AS count,
              COUNT(*) FILTER (WHERE drove_sales IS NOT NULL)::text AS reviewed_count
       FROM content_posts
       WHERE ${field} IS NOT NULL
       GROUP BY ${field}
       HAVING COUNT(*) FILTER (WHERE drove_sales IS NOT NULL) < 3
       ORDER BY ${field}`
    )
    for (const row of res.rows) {
      thinBuckets.push({
        field,
        label: row.label,
        count: parseInt(row.count, 10),
        reviewed_count: parseInt(row.reviewed_count, 10),
      })
    }
  }

  const recommendations: Recommendation[] = []

  if (isStale) {
    recommendations.push({
      severity: 'high',
      category: 'Sync',
      message: lastSyncedAt
        ? `Last Instagram sync was ${Math.round(hoursSinceSync!)}h ago. Metrics may be stale.`
        : 'No sync has run yet.',
      action: 'GET /api/cron/content-performance-sync (or wait for the daily Vercel cron)',
    })
  }

  if (untaggedRes.rows.length > 0) {
    recommendations.push({
      severity: 'high',
      category: 'Tagging',
      message: `${untaggedRes.rows.length} post${untaggedRes.rows.length === 1 ? '' : 's'} untagged. Pattern engine ignores untagged posts.`,
      action: 'Run /viral-coach-skills:tag-posts',
    })
  }

  if (totals.awaiting_detection > 0) {
    recommendations.push({
      severity: 'medium',
      category: 'Conversion detection',
      message: `${totals.awaiting_detection} tagged post${totals.awaiting_detection === 1 ? '' : 's'} with a CTA keyword still awaiting auto-detection.`,
      action: 'POST /api/system/detect (or trigger from the /system page)',
    })
  }

  if (zeroRes.rows.length > 0) {
    recommendations.push({
      severity: 'high',
      category: 'Data quality',
      message: `${zeroRes.rows.length} post${zeroRes.rows.length === 1 ? '' : 's'} have all-zero metrics — likely the Instagram \`plays\`-vs-\`views\` sync bug.`,
      action: 'Patch stale rows directly via the pg one-liner in CLAUDE.md (Direct Supabase Queries section)',
    })
  }

  if (!tokenStatus.present) {
    recommendations.push({
      severity: 'high',
      category: 'Instagram token',
      message: 'No Instagram access token found — every sync will fail.',
      action: 'Set INSTAGRAM_ACCESS_TOKEN or insert it into system_config.',
    })
  } else if (tokenStatus.age_days !== null && tokenStatus.age_days > 50) {
    recommendations.push({
      severity: 'high',
      category: 'Instagram token',
      message: `Token is ${tokenStatus.age_days} days old. IG long-lived tokens expire at ~60 days — sync will silently start failing.`,
      action: 'The sync auto-refreshes after 40d; if it has not, check refreshInstagramToken logs / re-issue the token.',
    })
  }

  if (missingTranscriptCount > 0) {
    recommendations.push({
      severity: 'low',
      category: 'Transcripts',
      message: `${missingTranscriptCount} post${missingTranscriptCount === 1 ? '' : 's'} have no transcript — hook/pattern analysis can't read them.`,
      action: 'Run /viral-coach-skills:tag-posts to transcribe and tag them.',
    })
  }

  if (totals.cannot_review_no_cta > 0) {
    recommendations.push({
      severity: 'low',
      category: 'CTA coverage',
      message: `${totals.cannot_review_no_cta} tagged post${totals.cannot_review_no_cta === 1 ? '' : 's'} have no CTA keyword — drove_sales will stay NULL because there is no measurable signal.`,
      action: 'Add a "Comment KEYWORD" CTA to future posts so conversions can be auto-detected.',
    })
  }

  if (thinBuckets.length > 0) {
    const fields = Array.from(new Set(thinBuckets.map(b => b.field)))
    recommendations.push({
      severity: 'low',
      category: 'Pattern confidence',
      message: `${thinBuckets.length} bucket${thinBuckets.length === 1 ? '' : 's'} across ${fields.join(', ')} still have <3 reviewed posts — pattern engine falls back to views-only weighting.`,
      action: 'Post more in these buckets, or rely on views-only winners until coverage grows.',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'low',
      category: 'All clear',
      message: 'No issues detected. System is in good shape.',
      action: 'Keep posting. Run sync + detect daily.',
    })
  }

  return {
    generated_at: new Date().toISOString(),
    totals,
    sync: {
      last_synced_at: lastSyncedAt,
      hours_since_sync: hoursSinceSync,
      is_stale: isStale,
      newest_post_at: newestPostAt,
      hours_since_newest_post: hoursSinceNewestPost,
    },
    missing_transcript_count: missingTranscriptCount,
    instagram_token: tokenStatus,
    conversion_coverage: {
      tagged_with_cta: taggedWithCta,
      auto_filled: autoFilled,
      coverage_pct: coveragePct,
    },
    zero_metric_rows: zeroRes.rows,
    untagged_posts: untaggedRes.rows,
    missing_cta: missingCtaRes.rows,
    thin_buckets: thinBuckets,
    recommendations,
  }
}
