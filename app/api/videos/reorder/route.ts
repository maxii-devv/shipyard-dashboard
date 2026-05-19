import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })

  await Promise.all(
    ids.map((id: string, idx: number) =>
      supabase.from('videos').update({ sort_order: idx }).eq('id', id)
    )
  )
  return NextResponse.json({ success: true })
}
