import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(topics ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, source_url, source_name, status, target_posts } = body

  const { data: topic, error } = await supabase
    .from('topics')
    .insert({
      name,
      description: description || null,
      source_url: source_url || null,
      source_name: source_name || null,
      status: status || 'active',
      target_posts: target_posts || 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(topic, { status: 201 })
}
