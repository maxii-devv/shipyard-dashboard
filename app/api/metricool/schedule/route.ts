import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = 'https://app.metricool.com/api'

function authQuery() {
  return `userToken=${process.env.METRICOOL_API_TOKEN}&userId=${process.env.METRICOOL_USER_ID}&blogId=${process.env.METRICOOL_BLOG_ID}`
}

// Metricool network names
const PLATFORM_TO_NETWORK: Record<string, string> = {
  linkedin: 'linkedin',
  instagram: 'instagram',
  twitter: 'twitter',
  tiktok: 'tiktok',
  facebook: 'facebook',
  youtube: 'youtube',
}

/**
 * POST /api/metricool/schedule
 * Schedule a social post via Metricool.
 *
 * Body:
 * {
 *   socialPostId: string       // UUID of the social_posts row
 *   text: string               // post content
 *   hashtags?: string[]        // appended to text
 *   scheduledAt: string        // ISO datetime e.g. "2026-03-01T14:00:00"
 *   timezone?: string          // IANA timezone, default "America/New_York"
 *   platform: string           // "linkedin" | "instagram" | etc
 *   draft?: boolean            // save as Metricool draft (default false)
 * }
 */
export async function POST(req: NextRequest) {
  if (!process.env.METRICOOL_API_TOKEN) {
    return NextResponse.json({ error: 'Metricool not configured. Set METRICOOL_API_TOKEN in .env.local' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const {
      socialPostId,
      text,
      hashtags = [],
      scheduledAt,
      timezone = 'America/New_York',
      platform,
      draft = false,
    } = body

    const missing = [
      !socialPostId && 'socialPostId',
      !text && 'text',
      !scheduledAt && 'scheduledAt',
      !platform && 'platform',
    ].filter(Boolean)

    if (missing.length > 0) {
      console.error('Schedule validation failed — missing:', missing, { socialPostId, text: text?.slice(0, 50), scheduledAt, platform })
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const network = PLATFORM_TO_NETWORK[platform.toLowerCase()]
    if (!network) {
      return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 })
    }

    // Fetch media files attached to this post
    const { data: mediaFiles } = await supabase
      .from('social_media_files')
      .select('storage_path, url, file_type, order_index')
      .eq('post_id', socialPostId)
      .order('order_index', { ascending: true })

    const mediaUrls: string[] = []
    if (mediaFiles) {
      for (const file of mediaFiles) {
        // For LinkedIn, skip PDFs — Metricool needs individual images
        // and its "upload as carousel" preset handles the conversion
        if (network === 'linkedin' && file.file_type === 'pdf') continue

        if (file.url) {
          mediaUrls.push(file.url)
        } else if (file.storage_path) {
          mediaUrls.push(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${file.storage_path}`
          )
        }
      }
    }

    // Build full text with hashtags
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : ''
    const fullText = text + hashtagStr

    // Format datetime for Metricool — must be yyyy-MM-ddTHH:mm:ss (with seconds)
    const raw = scheduledAt.slice(0, 19)
    const dateTime = raw.length === 16 ? raw + ':00' : raw

    const metricoolPayload: Record<string, any> = {
      text: fullText,
      publicationDate: { dateTime, timezone },
      providers: [{ network }],
      autoPublish: true,
      draft,
    }

    // Attach media URLs if present
    if (mediaUrls.length > 0) {
      metricoolPayload.media = mediaUrls
      metricoolPayload.saveExternalMediaFiles = true
    }

    // LinkedIn-specific data
    if (network === 'linkedin') {
      metricoolPayload.linkedinData = { previewIncluded: true, type: 'POST' }
    }
    if (network === 'instagram') {
      metricoolPayload.instagramData = { autoPublish: true }
    }

    console.log('Metricool schedule payload:', JSON.stringify(metricoolPayload, null, 2))

    const metricoolRes = await fetch(
      `${BASE_URL}/v2/scheduler/posts?${authQuery()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mc-Auth': process.env.METRICOOL_API_TOKEN!,
        },
        body: JSON.stringify(metricoolPayload),
      }
    )

    const rawText = await metricoolRes.text()
    console.log('Metricool response status:', metricoolRes.status, 'body:', rawText.slice(0, 500))

    let metricoolData: any
    try {
      metricoolData = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: `Metricool returned non-JSON (status ${metricoolRes.status}): ${rawText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    if (!metricoolRes.ok || !metricoolData.data?.id) {
      return NextResponse.json(
        { error: metricoolData.message || metricoolData.error || rawText.slice(0, 200) || 'Metricool scheduling failed', detail: metricoolData },
        { status: metricoolRes.status }
      )
    }

    const metricoolPostId = metricoolData.data.id

    // Update our social_posts row with Metricool IDs + status
    const { error: dbErr } = await supabase
      .from('social_posts')
      .update({
        metricool_post_id: metricoolPostId,
        metricool_scheduled_at: scheduledAt,
        status: draft ? 'ready' : 'scheduled',
        scheduled_at: scheduledAt,
      })
      .eq('id', socialPostId)

    if (dbErr) {
      console.error('DB update error:', dbErr)
      // Don't fail — Metricool post was created, just log
    }

    return NextResponse.json({
      ok: true,
      metricoolPostId,
      scheduledAt: metricoolData.data.publicationDate,
      draft,
    })
  } catch (err: any) {
    console.error('Schedule route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/metricool/schedule?socialPostId=xxx
 * Remove the Metricool scheduled post and clear IDs from DB.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const socialPostId = searchParams.get('socialPostId')

    if (!socialPostId) {
      return NextResponse.json({ error: 'socialPostId required' }, { status: 400 })
    }

    // Fetch the Metricool post ID from DB
    const { data: post, error: fetchErr } = await supabase
      .from('social_posts')
      .select('metricool_post_id')
      .eq('id', socialPostId)
      .single()

    if (fetchErr || !post?.metricool_post_id) {
      return NextResponse.json({ error: 'No Metricool post ID found for this post' }, { status: 404 })
    }

    const metricoolPostId = post.metricool_post_id

    // Delete from Metricool
    const metricoolRes = await fetch(
      `${BASE_URL}/v2/scheduler/posts/${metricoolPostId}?${authQuery()}`,
      { method: 'DELETE' }
    )

    const metricoolData = await metricoolRes.json()

    if (!metricoolRes.ok) {
      return NextResponse.json(
        { error: 'Metricool delete failed', detail: metricoolData },
        { status: metricoolRes.status }
      )
    }

    // Clear Metricool fields from DB, revert status to ready
    await supabase
      .from('social_posts')
      .update({
        metricool_post_id: null,
        metricool_scheduled_at: null,
        status: 'ready',
        scheduled_at: null,
      })
      .eq('id', socialPostId)

    return NextResponse.json({ ok: true, deleted: metricoolPostId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/metricool/schedule?socialPostId=xxx
 * Check current Metricool status for a post.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const socialPostId = searchParams.get('socialPostId')

    if (!socialPostId) {
      return NextResponse.json({ error: 'socialPostId required' }, { status: 400 })
    }

    const { data: post } = await supabase
      .from('social_posts')
      .select('metricool_post_id, metricool_scheduled_at, status, scheduled_at')
      .eq('id', socialPostId)
      .single()

    if (!post?.metricool_post_id) {
      return NextResponse.json({ scheduled: false })
    }

    // Fetch live status from Metricool
    const metricoolRes = await fetch(
      `${BASE_URL}/v2/scheduler/posts/${post.metricool_post_id}?${authQuery()}`
    )

    if (!metricoolRes.ok) {
      return NextResponse.json({
        scheduled: true,
        metricoolPostId: post.metricool_post_id,
        scheduledAt: post.metricool_scheduled_at,
        metricoolStatus: 'unknown',
      })
    }

    const metricoolData = await metricoolRes.json()
    const providers = metricoolData.data?.providers ?? []
    const providerStatus = providers[0]?.status ?? 'PENDING'

    return NextResponse.json({
      scheduled: true,
      metricoolPostId: post.metricool_post_id,
      scheduledAt: post.metricool_scheduled_at,
      metricoolStatus: providerStatus,
      providers,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
