import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/backend/db'
import { getMediaImageUrl } from '@/lib/backend/instagram'

// Self-healing Instagram cover proxy. The browser <img> points here with a
// stable ?id=<media_id>. We serve the bytes server-side, which:
//   • dodges Instagram's cross-origin/referrer hotlink blocking, and
//   • transparently re-signs the URL via the Graph API when the cached
//     CDN link has expired (IG URLs die within days) — then persists the
//     fresh URL so the next request is a single hop again.
// No third-party service involved — this is our own data pipeline.

export const runtime = 'nodejs'

async function streamUpstream(imgUrl: string): Promise<NextResponse | null> {
  const res = await fetch(imgUrl, { cache: 'no-store' }).catch(() => null)
  if (!res || !res.ok || !res.body) return null
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      // Our proxy URL is stable; safe to let the browser cache the bytes.
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { rows } = await pool.query<{
      thumbnail_url: string | null
      media_url: string | null
    }>(
      `SELECT thumbnail_url, media_url FROM content_performance
       WHERE instagram_media_id = $1`,
      [id]
    )
    const row = rows[0]
    const cached = row?.thumbnail_url || row?.media_url || null

    // 1. Try the URL we already have.
    if (cached) {
      const ok = await streamUpstream(cached)
      if (ok) return ok
    }

    // 2. Cached URL missing or expired — re-sign it via the Graph API.
    const fresh = await getMediaImageUrl(id)
    if (fresh.url) {
      // Persist so subsequent requests skip the Graph round-trip.
      pool
        .query(
          `UPDATE content_performance
             SET ${fresh.mediaType === 'IMAGE' || fresh.mediaType === 'CAROUSEL_ALBUM'
               ? 'media_url'
               : 'thumbnail_url'} = $2
           WHERE instagram_media_id = $1`,
          [id, fresh.url]
        )
        .catch(() => {})
      const ok = await streamUpstream(fresh.url)
      if (ok) return ok
    }

    // 3. Nothing worked — 1x1 transparent gif so the <img> fails gracefully
    // to the tile's dark background instead of a broken-image icon.
    const px = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(px, {
      status: 200,
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    console.error('[instagram/image] failed for', id, err)
    return NextResponse.json({ error: 'image fetch failed' }, { status: 500 })
  }
}
