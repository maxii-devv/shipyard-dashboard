import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'

// In-house replacement for the Metricool analytics proxy. Serves Instagram
// post/reel performance straight from our own Supabase `content_performance`
// table (populated by the Graph API sync cron) — no third-party service.
//
// Returns the exact shape the analytics Instagram tab already consumes:
//   { posts: InstagramPost[], reels: InstagramPost[], stories: [] }
// Cover images point at /api/instagram/image which self-heals expired CDN URLs.

export const runtime = 'nodejs'

interface Row {
  instagram_media_id: string
  caption: string | null
  media_type: string | null
  permalink: string | null
  post_timestamp: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagement_rate: string | number
}

function toPost(r: Row) {
  const likes = r.likes ?? 0
  const comments = r.comments ?? 0
  const shares = r.shares ?? 0
  const saved = r.saves ?? 0
  return {
    postId: r.instagram_media_id,
    type: r.media_type ?? '',
    publishedAt: {
      dateTime: r.post_timestamp ?? '',
      timezone: 'UTC',
    },
    content: r.caption ?? '',
    // Always route through our proxy: it serves the cached CDN bytes, and
    // re-signs via the Graph API by id when the cache is missing or expired
    // (so even just-posted media with no stored URL still renders a cover).
    imageUrl: `/api/instagram/image?id=${encodeURIComponent(r.instagram_media_id)}`,
    url: r.permalink ?? '',
    likes,
    comments,
    shares,
    interactions: likes + comments + shares + saved,
    engagement: Number(r.engagement_rate) || 0,
    reach: r.reach ?? 0,
    saved,
    impressionsTotal: r.reach ?? 0,
    views: r.views ?? 0,
  }
}

export async function GET(req: NextRequest) {
  const days = Number(new URL(req.url).searchParams.get('days')) || 0

  try {
    const where = days > 0 ? `WHERE post_timestamp >= NOW() - INTERVAL '${days} days'` : ''
    const { rows } = await pool.query<Row>(
      `SELECT instagram_media_id, caption, media_type, permalink, post_timestamp,
              views, likes, comments, shares, saves, reach, engagement_rate
       FROM content_performance
       ${where}
       ORDER BY post_timestamp DESC NULLS LAST`
    )

    const posts: ReturnType<typeof toPost>[] = []
    const reels: ReturnType<typeof toPost>[] = []
    for (const r of rows) {
      const mapped = toPost(r)
      // VIDEO/REELS are reels; IMAGE/CAROUSEL_ALBUM are feed posts.
      if (r.media_type === 'VIDEO' || r.media_type === 'REELS') reels.push(mapped)
      else posts.push(mapped)
    }

    // Stories aren't retained by the Graph API sync — return empty so the tab
    // simply hides the Stories section.
    return NextResponse.json({ posts, reels, stories: [] })
  } catch (err) {
    console.error('[instagram/analytics] query failed:', err)
    return NextResponse.json(
      { error: 'Failed to load Instagram analytics from database' },
      { status: 500 }
    )
  }
}
