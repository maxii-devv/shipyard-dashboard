import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')

  let query = supabase
    .from('competitor_posts')
    .select('*')
    .eq('competitor_id', id)
    .order('published_at', { ascending: false })

  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { platform, title, url, content_type, content_preview, external_id, published_at, metrics, thumbnail_url, discovered_via } = body

  if (!platform || !title) {
    return NextResponse.json({ error: 'platform and title are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('competitor_posts')
    .insert({
      competitor_id: id,
      platform,
      title,
      url: url || null,
      content_type: content_type || null,
      content_preview: content_preview || null,
      external_id: external_id || null,
      published_at: published_at || null,
      metrics: metrics || {},
      thumbnail_url: thumbnail_url || null,
      discovered_via: discovered_via || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
