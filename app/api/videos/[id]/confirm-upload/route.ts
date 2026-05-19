import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/videos/[id]/confirm-upload
// Body: { path, filename, fileSize }
// Saves the storage path to the video record after the browser finishes uploading
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { path, filename, fileSize } = await req.json()

  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('videos')
    .update({
      video_file_path: path,
      video_file_name: filename ?? null,
      video_file_size: fileSize ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/videos/[id]/confirm-upload — remove the video file
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get existing path first
  const { data: video } = await supabase
    .from('videos')
    .select('video_file_path')
    .eq('id', id)
    .single()

  if (video?.video_file_path) {
    await supabase.storage.from('video-uploads').remove([video.video_file_path])
  }

  const { error } = await supabase
    .from('videos')
    .update({ video_file_path: null, video_file_name: null, video_file_size: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
