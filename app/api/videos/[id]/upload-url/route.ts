import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'video-uploads'

// POST /api/videos/[id]/upload-url
// Body: { filename: string, contentType: string }
// Returns: { signedUrl, path, token } for direct browser upload
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { filename, contentType } = await req.json()

  if (!filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  // Sanitize filename and build storage path
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${id}/${Date.now()}_${safe}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    token: data.token,
  })
}
