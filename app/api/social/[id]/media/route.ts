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
  const notes = formData.get('notes') as string | null
  const order_index = parseInt(formData.get('order_index') as string || '0')

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileType = file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('image/') ? 'image'
      : file.type === 'application/pdf' ? 'pdf'
      : 'other'

    const filename = `social-${id}-${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('social-media')
      .upload(filename, Buffer.from(bytes), { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: `Storage: ${uploadError.message}` }, { status: 500 })

    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(filename)

    const { data, error } = await supabase
      .from('social_media_files')
      .insert({
        post_id: id,
        storage_path: filename,
        url: urlData.publicUrl,
        filename: file.name,
        file_type: fileType,
        order_index,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected: ${e.message}` }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('file_id')
  if (!fileId) return NextResponse.json({ error: 'Missing file_id' }, { status: 400 })

  const { data: file } = await supabase
    .from('social_media_files')
    .select('storage_path')
    .eq('id', fileId)
    .single()

  if (file?.storage_path) {
    await supabase.storage.from('social-media').remove([file.storage_path])
  }

  const { error } = await supabase.from('social_media_files').delete().eq('id', fileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
