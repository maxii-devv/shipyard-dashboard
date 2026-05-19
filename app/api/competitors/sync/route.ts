import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SCRAPECREATORS_BASE = 'https://api.scrapecreators.com/v1'
const AUTO_SYNC_PLATFORMS = ['youtube', 'instagram']
const FOLLOWER_CHANGE_THRESHOLD = 5 // percent

interface SyncResult {
  competitor: string
  platform: string
  status: 'synced' | 'skipped' | 'error'
  error?: string
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const internalKey = process.env.INTERNAL_API_KEY

  // Allow: Bearer token (cron/internal), x-api-key header, or same-origin dashboard requests
  const token = authHeader?.replace('Bearer ', '')
  const xApiKey = req.headers.get('x-api-key')
  const referer = req.headers.get('referer') || ''
  const isSameOrigin = referer.includes('/dashboard')
  if (!isSameOrigin && !xApiKey && (!token || (token !== cronSecret && token !== internalKey))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.SCRAPECREATORS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SCRAPECREATORS_API_KEY not configured' }, { status: 500 })
  }

  const { data: competitors, error: compError } = await supabase
    .from('competitors')
    .select('*, socials:competitor_socials(*)')
    .eq('active', true)

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })
  if (!competitors?.length) {
    return NextResponse.json({ synced: [], alerts_created: 0, posts_discovered: 0, at: new Date().toISOString() })
  }

  const results: SyncResult[] = []
  let alertsCreated = 0
  let postsDiscovered = 0
  const today = new Date().toISOString().split('T')[0]

  for (const comp of competitors) {
    for (const social of (comp.socials || [])) {
      if (!AUTO_SYNC_PLATFORMS.includes(social.platform)) {
        results.push({ competitor: comp.name, platform: social.platform, status: 'skipped' })
        continue
      }

      try {
        if (social.platform === 'youtube') {
          const r = await syncYouTube(comp, social, apiKey, today)
          alertsCreated += r.alerts
          postsDiscovered += r.posts
          results.push({ competitor: comp.name, platform: 'youtube', status: 'synced' })
        } else if (social.platform === 'instagram') {
          const r = await syncInstagram(comp, social, apiKey, today)
          alertsCreated += r.alerts
          results.push({ competitor: comp.name, platform: 'instagram', status: 'synced' })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ competitor: comp.name, platform: social.platform, status: 'error', error: msg })
      }
    }
  }

  return NextResponse.json({
    synced: results,
    alerts_created: alertsCreated,
    posts_discovered: postsDiscovered,
    at: new Date().toISOString(),
  })
}

// ─── YouTube sync ─────────────────────────────────────────────────────────────

async function syncYouTube(
  comp: { id: string; name: string },
  social: { id: string; handle: string; bio: string | null; follower_count: number | null; profile_pic_url: string | null; extra_metrics: Record<string, unknown> },
  apiKey: string,
  today: string
) {
  let alerts = 0
  let posts = 0
  const handle = social.handle.replace(/^@/, '')

  // Channel data
  const channelRes = await fetch(
    `${SCRAPECREATORS_BASE}/youtube/channel?handle=${encodeURIComponent(handle)}`,
    { headers: { 'x-api-key': apiKey } }
  )
  const channel = await channelRes.json()
  if (!channel.success) throw new Error(`YouTube channel API failed for @${handle}`)

  const newBio = channel.description || null
  const newFollowers = channel.subscriberCount as number
  const avatarUrl = channel.avatar?.image?.sources?.[2]?.url || channel.avatar?.image?.sources?.[0]?.url || social.profile_pic_url

  // Detect bio change
  if (social.bio && newBio && social.bio !== newBio) {
    await insertAlert(social.id, comp.id, 'bio_changed', `${comp.name} changed their YouTube bio`, { old_bio: social.bio, new_bio: newBio })
    alerts++
  }

  // Detect follower spike/drop
  if (social.follower_count && newFollowers) {
    const pct = ((newFollowers - social.follower_count) / social.follower_count) * 100
    if (Math.abs(pct) > FOLLOWER_CHANGE_THRESHOLD) {
      const type = pct > 0 ? 'follower_spike' : 'follower_drop'
      const dir = pct > 0 ? 'gained' : 'lost'
      const diff = Math.abs(newFollowers - social.follower_count)
      await insertAlert(social.id, comp.id, type, `${comp.name} ${dir} ${formatNum(diff)} YouTube subs (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`, {
        old_count: social.follower_count, new_count: newFollowers, change_pct: Math.round(pct * 100) / 100,
      })
      alerts++
    }
  }

  // Update social row
  await supabase.from('competitor_socials').update({
    follower_count: newFollowers,
    bio: newBio,
    profile_pic_url: avatarUrl,
    extra_metrics: {
      ...(social.extra_metrics || {}),
      total_views: channel.viewCount,
      total_videos: channel.videoCount,
      channel_name: channel.name,
    },
    data_source: 'scrapecreators',
    last_checked_at: new Date().toISOString(),
  }).eq('id', social.id)

  // Daily snapshot
  await supabase.from('competitor_social_snapshots').upsert({
    social_id: social.id,
    snapshot_date: today,
    follower_count: newFollowers,
    bio: newBio,
    profile_pic_url: avatarUrl,
    extra_metrics: { total_views: channel.viewCount, total_videos: channel.videoCount },
  }, { onConflict: 'social_id,snapshot_date' })

  // Recent videos
  const videosRes = await fetch(
    `${SCRAPECREATORS_BASE}/youtube/channel-videos?handle=${encodeURIComponent(handle)}&includeExtras=true`,
    { headers: { 'x-api-key': apiKey } }
  )
  const videosData = await videosRes.json()

  if (videosData.success && Array.isArray(videosData.videos)) {
    const { data: existing } = await supabase
      .from('competitor_posts')
      .select('external_id')
      .eq('competitor_id', comp.id)
      .eq('platform', 'youtube')

    const existingIds = new Set((existing || []).map((p: { external_id: string }) => p.external_id))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = videosData.videos.map((v: any) => ({
      competitor_id: comp.id,
      social_id: social.id,
      platform: 'youtube',
      external_id: v.id,
      title: v.title,
      url: v.url,
      content_type: v.type || 'video',
      thumbnail_url: Array.isArray(v.thumbnail) && v.thumbnail.length > 0 ? v.thumbnail[0].url : null,
      published_at: v.publishDate || null,
      metrics: {
        views: v.viewCountInt ?? null,
        likes: v.likeCountInt ?? null,
        comments: v.commentCountInt ?? null,
        duration: v.durationFormatted,
      },
      discovered_via: 'scrapecreators',
    }))

    if (rows.length > 0) {
      await supabase.from('competitor_posts').upsert(rows, { onConflict: 'platform,external_id' })

      const newPosts = rows.filter((r: { external_id: string }) => !existingIds.has(r.external_id))
      posts = newPosts.length

      // Only alert for the 3 most recent new posts to avoid flooding
      for (const p of newPosts.slice(0, 3)) {
        await insertAlert(social.id, comp.id, 'new_post', `${comp.name} posted: ${p.title}`, {
          title: p.title, url: p.url, views: p.metrics.views,
        })
        alerts++
      }
    }
  }

  return { alerts, posts }
}

// ─── Instagram sync ───────────────────────────────────────────────────────────

async function syncInstagram(
  comp: { id: string; name: string },
  social: { id: string; handle: string; bio: string | null; follower_count: number | null; profile_pic_url: string | null; extra_metrics: Record<string, unknown> },
  apiKey: string,
  today: string
) {
  let alerts = 0
  const handle = social.handle.replace(/^@/, '')

  const profileRes = await fetch(
    `${SCRAPECREATORS_BASE}/instagram/profile?handle=${encodeURIComponent(handle)}`,
    { headers: { 'x-api-key': apiKey } }
  )
  const profile = await profileRes.json()
  if (!profile.success || !profile.data?.user) throw new Error(`Instagram profile API failed for @${handle}`)

  const user = profile.data.user
  const newBio = user.biography || null
  const newFollowers = user.edge_followed_by?.count as number

  // Detect bio change
  if (social.bio && newBio && social.bio !== newBio) {
    await insertAlert(social.id, comp.id, 'bio_changed', `${comp.name} changed their Instagram bio`, { old_bio: social.bio, new_bio: newBio })
    alerts++
  }

  // Detect follower spike/drop
  if (social.follower_count && newFollowers) {
    const pct = ((newFollowers - social.follower_count) / social.follower_count) * 100
    if (Math.abs(pct) > FOLLOWER_CHANGE_THRESHOLD) {
      const type = pct > 0 ? 'follower_spike' : 'follower_drop'
      const dir = pct > 0 ? 'gained' : 'lost'
      const diff = Math.abs(newFollowers - social.follower_count)
      await insertAlert(social.id, comp.id, type, `${comp.name} ${dir} ${formatNum(diff)} Instagram followers (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`, {
        old_count: social.follower_count, new_count: newFollowers, change_pct: Math.round(pct * 100) / 100,
      })
      alerts++
    }
  }

  // Update social row
  await supabase.from('competitor_socials').update({
    follower_count: newFollowers,
    bio: newBio,
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || social.profile_pic_url,
    extra_metrics: {
      ...(social.extra_metrics || {}),
      following: user.edge_follow?.count ?? null,
      posts_count: user.edge_owner_to_timeline_media?.count ?? null,
      full_name: user.full_name,
    },
    data_source: 'scrapecreators',
    last_checked_at: new Date().toISOString(),
  }).eq('id', social.id)

  // Daily snapshot
  await supabase.from('competitor_social_snapshots').upsert({
    social_id: social.id,
    snapshot_date: today,
    follower_count: newFollowers,
    bio: newBio,
    profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url,
    extra_metrics: {
      following: user.edge_follow?.count ?? null,
      posts_count: user.edge_owner_to_timeline_media?.count ?? null,
    },
  }, { onConflict: 'social_id,snapshot_date' })

  return { alerts }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertAlert(
  socialId: string,
  competitorId: string,
  alertType: string,
  title: string,
  details: Record<string, unknown>
) {
  await supabase.from('competitor_alerts').insert({
    social_id: socialId,
    competitor_id: competitorId,
    alert_type: alertType,
    title,
    details,
  })
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}
