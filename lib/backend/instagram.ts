import pool from '@/lib/backend/db'
import { fetchWithRetry } from '@/lib/backend/util/http'
import { parseInsights, type IGInsights } from '@/lib/backend/util/igParse'

export type { IGInsights }

const BASE = 'https://graph.instagram.com/v21.0'
const TOKEN_KEY = 'instagram_access_token'

// IG long-lived tokens last ~60 days. Refresh once the stored token is older
// than this so it never silently expires mid-cron.
const REFRESH_AFTER_DAYS = 40

let tokenPromise: Promise<string> | null = null
async function getToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const r = await pool.query<{ value: string }>(
        `SELECT value FROM system_config WHERE key = '${TOKEN_KEY}'`
      )
      const fromDb = r.rows[0]?.value
      const token = fromDb || process.env.INSTAGRAM_ACCESS_TOKEN
      if (!token) throw new Error('No Instagram access token found in system_config or env')
      // Seed the row so token age is trackable even when it originates from env.
      if (!fromDb && token) {
        await pool.query(
          `INSERT INTO system_config (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO NOTHING`,
          [TOKEN_KEY, token]
        )
      }
      return token
    })()
  }
  return tokenPromise
}

export interface IGTokenStatus {
  present: boolean
  age_days: number | null
  refreshed_at: string | null
}

export async function getInstagramTokenStatus(): Promise<IGTokenStatus> {
  const r = await pool.query<{ updated_at: string }>(
    `SELECT updated_at::text FROM system_config WHERE key = '${TOKEN_KEY}'`
  )
  const updatedAt = r.rows[0]?.updated_at ?? null
  const ageDays = updatedAt
    ? (Date.now() - new Date(updatedAt).getTime()) / 86_400_000
    : null
  return {
    present: r.rows.length > 0 || !!process.env.INSTAGRAM_ACCESS_TOKEN,
    age_days: ageDays === null ? null : Math.round(ageDays * 10) / 10,
    refreshed_at: updatedAt,
  }
}

export interface RefreshResult {
  refreshed: boolean
  age_days: number | null
  error?: string
}

// Exchanges the current long-lived token for a fresh 60-day one when it's
// older than REFRESH_AFTER_DAYS. Never throws — a failure here must not abort
// the sync; it's reported and surfaced by /api/system instead.
export async function refreshInstagramToken(): Promise<RefreshResult> {
  try {
    const status = await getInstagramTokenStatus()
    if (status.age_days === null || status.age_days < REFRESH_AFTER_DAYS) {
      return { refreshed: false, age_days: status.age_days }
    }
    const token = await getToken()
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
    const res = await fetchWithRetry(url)
    if (!res.ok) {
      return {
        refreshed: false,
        age_days: status.age_days,
        error: `refresh failed: ${res.status} ${await res.text().catch(() => '')}`,
      }
    }
    const data = (await res.json()) as { access_token?: string }
    if (!data.access_token) {
      return { refreshed: false, age_days: status.age_days, error: 'refresh returned no token' }
    }
    await pool.query(
      `INSERT INTO system_config (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [TOKEN_KEY, data.access_token]
    )
    tokenPromise = null // bust the in-process cache so the new token is used
    return { refreshed: true, age_days: 0 }
  } catch (err) {
    return {
      refreshed: false,
      age_days: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export interface IGMedia {
  id: string
  caption?: string
  media_type: string
  permalink: string
  timestamp: string
  thumbnail_url?: string
  media_url?: string
}

export async function getMyMedia(limit = 25): Promise<IGMedia[]> {
  const token = await getToken()
  const url = `${BASE}/me/media?fields=id,caption,media_type,permalink,timestamp,thumbnail_url,media_url&limit=${limit}&access_token=${token}`
  const res = await fetchWithRetry(url)
  if (!res.ok) throw new Error(`IG media fetch failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data ?? []
}

// Re-fetches a single media's current image URL. IG CDN URLs in
// thumbnail_url/media_url expire within days; calling this by id always
// returns a freshly-signed URL. Never throws — returns null on any failure.
export async function getMediaImageUrl(
  mediaId: string
): Promise<{ url: string | null; mediaType: string }> {
  try {
    const token = await getToken()
    const url = `${BASE}/${mediaId}?fields=media_type,media_url,thumbnail_url&access_token=${token}`
    const res = await fetchWithRetry(url)
    if (!res.ok) return { url: null, mediaType: '' }
    const d = (await res.json()) as {
      media_type?: string
      media_url?: string
      thumbnail_url?: string
    }
    // Video/Reels: thumbnail_url is the cover. Image/Carousel: media_url.
    const picked = d.thumbnail_url || d.media_url || null
    return { url: picked, mediaType: d.media_type ?? '' }
  } catch {
    return { url: null, mediaType: '' }
  }
}

export interface IGComment {
  id: string
  text: string
  username?: string
  timestamp?: string
}

export async function getMediaComments(mediaId: string, maxPages = 5): Promise<IGComment[]> {
  const token = await getToken()
  const comments: IGComment[] = []
  let url: string | null =
    `${BASE}/${mediaId}/comments?fields=id,text,username,timestamp&limit=50&access_token=${token}`
  let pages = 0

  while (url && pages < maxPages) {
    const res: Response = await fetchWithRetry(url)
    if (!res.ok) {
      if (res.status === 400) return comments
      throw new Error(`IG comments fetch failed: ${res.status} ${await res.text()}`)
    }
    const data = await res.json()
    for (const c of data.data ?? []) comments.push(c)
    url = data.paging?.next ?? null
    pages++
  }

  return comments
}

// Returns null when the insights call fails. Callers MUST treat null as
// "no data this run" and preserve any existing metrics — never overwrite
// real numbers with zeros (see CLAUDE.md "silent total failure" gotcha).
export async function getMediaInsights(
  mediaId: string,
  mediaType: string
): Promise<IGInsights | null> {
  const token = await getToken()
  const isVideo = ['VIDEO', 'REELS'].includes(mediaType)
  const metrics = isVideo
    ? 'reach,likes,comments,shares,saved,views'
    : 'reach,likes,comments,shares,saved'

  const url = `${BASE}/${mediaId}/insights?metric=${metrics}&access_token=${token}`
  const res = await fetchWithRetry(url)

  if (!res.ok) {
    console.warn(
      `[instagram] insights fetch failed for ${mediaId} (${mediaType}): ${res.status} ${await res.text().catch(() => '')}`
    )
    return null
  }

  return parseInsights(await res.json())
}

// Re-fetches a single media's current playable video URL (the mp4 CDN URL).
// IG CDN media_url expires within days, so we always fetch a fresh one by id
// right before transcription. Returns null for non-video media or any failure.
export async function getMediaVideoUrl(mediaId: string): Promise<string | null> {
  try {
    const token = await getToken()
    const url = `${BASE}/${mediaId}?fields=media_type,media_url&access_token=${token}`
    const res = await fetchWithRetry(url)
    if (!res.ok) return null
    const d = (await res.json()) as { media_type?: string; media_url?: string }
    if (!['VIDEO', 'REELS'].includes(d.media_type ?? '')) return null
    return d.media_url ?? null
  } catch {
    return null
  }
}
