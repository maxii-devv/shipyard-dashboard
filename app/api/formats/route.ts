import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('formats')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, platform, content_type, reference_url, notes, thumbnail_url } = body

  if (!name || !platform || !content_type) {
    return NextResponse.json({ error: 'name, platform, and content_type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('formats')
    .insert({ name, description: description ?? null, platform, content_type, reference_url: reference_url ?? null, notes: notes ?? null, thumbnail_url: thumbnail_url ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
