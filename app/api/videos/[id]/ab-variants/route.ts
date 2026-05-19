import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('video_ab_variants')
    .select('*, thumbnail:thumbnails(*)')
    .eq('video_id', id)
    .order('variant', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Check how many variants exist
  const { count } = await supabase
    .from('video_ab_variants')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', id)

  const isFirst = (count ?? 0) === 0

  const { data, error } = await supabase
    .from('video_ab_variants')
    .insert({
      video_id: id,
      variant: body.variant,
      title: body.title ?? '',
      thumbnail_id: body.thumbnail_id ?? null,
      is_active: isFirst,
    })
    .select('*, thumbnail:thumbnails(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { variantId, ...updates } = body

  // If setting active, unset others first
  if (updates.is_active === true) {
    await supabase
      .from('video_ab_variants')
      .update({ is_active: false })
      .eq('video_id', id)
      .eq('is_active', true)
  }

  const { data, error } = await supabase
    .from('video_ab_variants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', variantId)
    .select('*, thumbnail:thumbnails(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { error } = await supabase
    .from('video_ab_variants')
    .delete()
    .eq('id', body.variantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
