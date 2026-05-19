import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { platform, handle } = body

  if (!platform || !handle) {
    return NextResponse.json({ error: 'platform and handle are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('competitor_socials')
    .insert({
      competitor_id: id,
      platform,
      handle,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
