import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { video_id, type, content, status = 'draft', version = 1 } = body

  if (!video_id || !type) {
    return NextResponse.json({ error: 'video_id and type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({ video_id, type, content: content ?? '', status, version })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
