import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isImage = file.type.startsWith('image/')
  const isExcalidraw = file.name.endsWith('.excalidraw')

  if (!isImage && !isExcalidraw) {
    return NextResponse.json({ error: 'File must be an image or .excalidraw file' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const filename = `attachments/${id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const contentType = isExcalidraw ? 'application/json' : file.type

  // Upload to storage bucket (reuse thumbnails bucket or a general one)
  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(filename, bytes, { contentType, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(filename)

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
      type: isExcalidraw ? 'diagram' : 'image',
      title: file.name.replace(/\.[^.]+$/, ''),
      url: urlData.publicUrl,
      storage_path: filename,
      file_name: file.name,
      file_size: file.size,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
