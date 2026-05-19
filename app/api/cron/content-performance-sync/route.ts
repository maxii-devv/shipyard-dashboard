import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'
import {
  getMyMedia,
  getMediaInsights,
  refreshInstagramToken,
  type IGInsights,
} from '@/lib/backend/instagram'
import { mapWithConcurrency } from '@/lib/backend/util/async'

// Vercel kills the function at its plan default (10s on Hobby) — far too short
// for a serial sync. Cap at the Hobby max and parallelise the work so it
// actually completes.
export const maxDuration = 60

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// getMyMedia only returns the N newest posts, so anything older than that
// window never gets its metrics refreshed and keeps whatever was first
// written (a one-time zero stays forever). Each run also heals up to this
// many of the stalest rows, oldest synced_at first.
const STALE_BACKFILL_BATCH = 25
// IG insights are network-bound; a handful in flight keeps us inside the
// timeout without tripping rate limits. DB writes are bounded by the pool
// (max 5), so keep that phase lower.
const FETCH_CONCURRENCY = 6
const WRITE_CONCURRENCY = 4

async function writeSnapshot(mediaId: string, insights: IGInsights) {
  await pool.query(
    `INSERT INTO content_performance_snapshots
       (instagram_media_id, captured_date,
        views, likes, comments, shares, saves, reach, engagement_rate)
     VALUES ($1, CURRENT_DATE, $2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (instagram_media_id, captured_date) DO UPDATE SET
       views = EXCLUDED.views,
       likes = EXCLUDED.likes,
       comments = EXCLUDED.comments,
       shares = EXCLUDED.shares,
       saves = EXCLUDED.saves,
       reach = EXCLUDED.reach,
       engagement_rate = EXCLUDED.engagement_rate,
       captured_at = NOW()`,
    [
      mediaId,
      insights.views,
      insights.likes,
      insights.comments,
      insights.shares,
      insights.saves,
      insights.reach,
      insights.engagement_rate,
    ]
  )
}

// Fire-and-forget alert if anything high-severity is wrong. Optional: only
// posts when ALERT_WEBHOOK_URL is configured. Never throws.
async function maybeAlert(summary: Record<string, unknown>) {
  const webhook = process.env.ALERT_WEBHOOK_URL
  if (!webhook) return
  try {
    const { getSystemHealth } = await import('@/lib/backend/services/systemHealthService')
    const health = await getSystemHealth()
    const high = health.recommendations.filter(r => r.severity === 'high')
    if (high.length === 0) return
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `viral-coach sync: ${high.length} high-severity issue(s)`,
        issues: high,
        sync: summary,
      }),
    })
  } catch (err) {
    console.warn('[sync] alert webhook failed:', err)
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runStartedAt = new Date().toISOString()
  const tokenRefresh = await refreshInstagramToken()

  const mediaList = await getMyMedia(100)

  // Fetch all insights with bounded concurrency, then write.
  const insightsList = await mapWithConcurrency(mediaList, FETCH_CONCURRENCY, m =>
    getMediaInsights(m.id, m.media_type)
  )

  const insightsFailed: string[] = []
  await mapWithConcurrency(mediaList, WRITE_CONCURRENCY, async (media, i) => {
    const insights = insightsList[i]

    if (insights) {
      // Full upsert: metadata + metrics.
      await pool.query(
        `INSERT INTO content_performance
           (instagram_media_id, caption, media_type, permalink, post_timestamp,
            views, likes, comments, shares, saves, reach, engagement_rate,
            thumbnail_url, media_url, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
         ON CONFLICT (instagram_media_id) DO UPDATE SET
           caption = EXCLUDED.caption,
           views = EXCLUDED.views,
           likes = EXCLUDED.likes,
           comments = EXCLUDED.comments,
           shares = EXCLUDED.shares,
           saves = EXCLUDED.saves,
           reach = EXCLUDED.reach,
           engagement_rate = EXCLUDED.engagement_rate,
           thumbnail_url = EXCLUDED.thumbnail_url,
           media_url = EXCLUDED.media_url,
           synced_at = NOW()`,
        [
          media.id,
          media.caption ?? null,
          media.media_type,
          media.permalink,
          media.timestamp,
          insights.views,
          insights.likes,
          insights.comments,
          insights.shares,
          insights.saves,
          insights.reach,
          insights.engagement_rate,
          media.thumbnail_url ?? null,
          media.media_url ?? null,
        ]
      )

      await writeSnapshot(media.id, insights)
    } else {
      // Insights failed this run. Refresh metadata only; for an existing row
      // leave every metric column untouched so we never destroy real numbers
      // on a transient API error. A brand-new row gets zeros (no prior data)
      // and is surfaced by the /api/system zero-metric check.
      insightsFailed.push(media.id)
      await pool.query(
        `INSERT INTO content_performance
           (instagram_media_id, caption, media_type, permalink, post_timestamp,
            views, likes, comments, shares, saves, reach, engagement_rate,
            thumbnail_url, media_url, synced_at)
         VALUES ($1,$2,$3,$4,$5,0,0,0,0,0,0,0,$6,$7,NOW())
         ON CONFLICT (instagram_media_id) DO UPDATE SET
           caption = EXCLUDED.caption,
           permalink = EXCLUDED.permalink,
           thumbnail_url = EXCLUDED.thumbnail_url,
           media_url = EXCLUDED.media_url,
           synced_at = NOW()`,
        [
          media.id,
          media.caption ?? null,
          media.media_type,
          media.permalink,
          media.timestamp,
          media.thumbnail_url ?? null,
          media.media_url ?? null,
        ]
      )
      // Deliberately skip the snapshot insert — a zero snapshot would corrupt
      // the daily growth history.
    }
  })
  const processed = mediaList.length

  // Stale-row backfill. Any row not touched above (synced_at still before this
  // run) is outside the getMyMedia window. Re-fetch its insights by id,
  // stalest first, bounded per run so coverage heals gradually.
  const staleRes = await pool.query<{ instagram_media_id: string; media_type: string }>(
    `SELECT instagram_media_id, media_type
     FROM content_performance
     WHERE synced_at < $1
     ORDER BY synced_at ASC
     LIMIT $2`,
    [runStartedAt, STALE_BACKFILL_BATCH]
  )

  const staleInsights = await mapWithConcurrency(staleRes.rows, FETCH_CONCURRENCY, row =>
    getMediaInsights(row.instagram_media_id, row.media_type)
  )

  let backfilled = 0
  const backfillFailed: string[] = []
  await mapWithConcurrency(staleRes.rows, WRITE_CONCURRENCY, async (row, i) => {
    const insights = staleInsights[i]
    if (!insights) {
      // Leave synced_at untouched so the row stays in the stale queue and is
      // retried next run — never overwrite good metrics with zeros.
      backfillFailed.push(row.instagram_media_id)
      return
    }
    await pool.query(
      `UPDATE content_performance SET
         views = $2, likes = $3, comments = $4, shares = $5,
         saves = $6, reach = $7, engagement_rate = $8, synced_at = NOW()
       WHERE instagram_media_id = $1`,
      [
        row.instagram_media_id,
        insights.views,
        insights.likes,
        insights.comments,
        insights.shares,
        insights.saves,
        insights.reach,
        insights.engagement_rate,
      ]
    )
    await writeSnapshot(row.instagram_media_id, insights)
    backfilled++
  })

  // After syncing, run media linking
  const { linkUnlinkedMedia } = await import('@/lib/backend/services/mediaLinkingService')
  const linked = await linkUnlinkedMedia()

  // Then auto-detect conversions for any newly-linked posts that have a CTA
  const { detectConversions } = await import('@/lib/backend/services/conversionDetectionService')
  const detection = await detectConversions()

  const summary = {
    processed,
    insights_failed: insightsFailed.length,
    insights_failed_ids: insightsFailed,
    backfilled,
    backfill_failed: backfillFailed.length,
    token_refresh: tokenRefresh,
    linked,
    detection,
  }

  await maybeAlert(summary)

  return NextResponse.json(summary)
}
