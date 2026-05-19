import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  let query = supabase
    .from('social_posts')
    .select('*, media_files:social_media_files(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (platform) query = query.eq('platform', platform)
  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, platform, type, format, caption, hashtags, status, scheduled_at, notes } = body

  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      title,
      platform,
      type,
      format: format || null,
      caption: caption || null,
      hashtags: hashtags || [],
      status: status || 'in_progress',
      scheduled_at: scheduled_at || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
