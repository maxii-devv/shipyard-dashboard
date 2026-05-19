import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const active = searchParams.get('active') !== 'false' // default true

  let query = supabase
    .from('competitors')
    .select('*, socials:competitor_socials(*)')
    .order('name')

  if (active) query = query.eq('active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, slug, niche, brand, location, background, is_friend, business_notes, content_style, notable, links, avatar_url } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('competitors')
    .insert({
      name,
      slug,
      niche: niche || null,
      brand: brand || null,
      location: location || null,
      background: background || null,
      is_friend: is_friend ?? false,
      business_notes: business_notes || null,
      content_style: content_style || null,
      notable: notable || null,
      links: links || [],
      avatar_url: avatar_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
