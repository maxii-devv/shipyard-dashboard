import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'profile-pictures'
const SETTING_KEY = 'profile_picture_url'

export async function GET() {
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .single()

  return NextResponse.json({ url: data?.value ?? null })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })

  try {
    // Remove old picture if exists
    const { data: existing } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'profile_picture_storage_path')
      .single()

    if (existing?.value) {
      await supabase.storage.from(BUCKET).remove([existing.value])
    }

    // Upload new picture
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `avatar-${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, Buffer.from(bytes), { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Storage: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    // Upsert both the URL and storage path
    await supabase.from('user_settings').upsert(
      { key: SETTING_KEY, value: publicUrl },
      { onConflict: 'key' }
    )
    await supabase.from('user_settings').upsert(
      { key: 'profile_picture_storage_path', value: filename },
      { onConflict: 'key' }
    )

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected: ${e.message}` }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { data: pathRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'profile_picture_storage_path')
      .single()

    if (pathRow?.value) {
      await supabase.storage.from(BUCKET).remove([pathRow.value])
    }

    await supabase.from('user_settings').delete().eq('key', SETTING_KEY)
    await supabase.from('user_settings').delete().eq('key', 'profile_picture_storage_path')

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected: ${e.message}` }, { status: 500 })
  }
}
