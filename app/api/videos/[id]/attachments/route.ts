import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('video_attachments')
    .select('*')
    .eq('video_id', id)
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Get next sort_order
  const { data: existing } = await supabase
    .from('video_attachments')
    .select('sort_order')
    .eq('video_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('video_attachments')
    .insert({
      video_id: id,
      type: body.type,
      title: body.title ?? '',
      url: body.url ?? null,
      storage_path: body.storage_path ?? null,
      file_name: body.file_name ?? null,
      file_size: body.file_size ?? null,
      metadata: body.metadata ?? {},
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Reorder operation
  if (body.reorder && Array.isArray(body.order)) {
    const updates = body.order.map((attachmentId: string, idx: number) =>
      supabase
        .from('video_attachments')
        .update({ sort_order: idx, updated_at: new Date().toISOString() })
        .eq('id', attachmentId)
        .eq('video_id', id)
    )
    await Promise.all(updates)

    const { data } = await supabase
      .from('video_attachments')
      .select('*')
      .eq('video_id', id)
      .order('sort_order', { ascending: true })

    return NextResponse.json(data)
  }

  // Single update
  const { attachmentId, ...updates } = body
  const { data, error } = await supabase
    .from('video_attachments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', attachmentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { error } = await supabase
    .from('video_attachments')
    .delete()
    .eq('id', body.attachmentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
