import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const tagsRaw = formData.get('tags') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const filename = `upload-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(filename, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : ['uploaded']

  const { data: thumb, error: dbError } = await supabase
    .from('thumbnails')
    .insert({ storage_path: filename, url: null, tags })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(filename)

  return NextResponse.json({ ...thumb, _publicUrl: urlData.publicUrl }, { status: 201 })
}
