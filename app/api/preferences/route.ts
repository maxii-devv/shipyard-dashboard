import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const contentType = searchParams.get('content_type')
  const source = searchParams.get('source')

  let query = supabase
    .from('content_preferences')
    .select('*')
    .order('platform')
    .order('content_type')
    .order('created_at', { ascending: true })

  if (platform) query = query.eq('platform', platform)
  if (contentType) query = query.eq('content_type', contentType)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { platform, content_type, preference, source = 'manual', metadata = {} } = body

  if (!platform) return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  if (!content_type) return NextResponse.json({ error: 'content_type is required' }, { status: 400 })
  if (!preference) return NextResponse.json({ error: 'preference is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('content_preferences')
    .insert({ platform, content_type, preference, source, metadata })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
