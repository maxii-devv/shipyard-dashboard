import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Detect platform from URL
function detectPlatform(url: string): string {
  try {
    const { hostname } = new URL(url)
    if (hostname.includes('instagram.com')) return 'instagram'
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
    if (hostname.includes('tiktok.com')) return 'tiktok'
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter'
    if (hostname.includes('linkedin.com')) return 'linkedin'
    if (hostname.includes('threads.net')) return 'threads'
  } catch {}
  return 'web'
}

// Attempt to extract a title from the URL path (best-effort, no scraping)
function guessTitle(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return null
    if (hostname.includes('instagram.com')) return null
    // For blog/article URLs, extract slug
    const slug = pathname.split('/').filter(Boolean).pop()
    if (slug && slug.length > 3 && !slug.match(/^[A-Za-z0-9_-]{4,12}$/)) {
      return slug.replace(/-/g, ' ').replace(/_/g, ' ')
    }
  } catch {}
  return null
}

/**
 * GET /api/content-sources?contentType=video&contentId=xxx
 * List all sources for a content piece.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contentType = searchParams.get('contentType')
  const contentId = searchParams.get('contentId')

  if (!contentType || !contentId) {
    return NextResponse.json({ error: 'contentType and contentId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/content-sources
 * Attach a remix source to a content piece.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contentType, contentId, url, title, notes } = body

  if (!contentType || !contentId || !url) {
    return NextResponse.json({ error: 'contentType, contentId, url required' }, { status: 400 })
  }

  const platform = detectPlatform(url)
  const resolvedTitle = title?.trim() || guessTitle(url)

  const { data, error } = await supabase
    .from('content_sources')
    .insert({
      content_type: contentType,
      content_id: contentId,
      url: url.trim(),
      title: resolvedTitle,
      platform,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
