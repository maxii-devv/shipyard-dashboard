import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const unread = searchParams.get('unread')
  const competitorId = searchParams.get('competitor_id')

  let query = supabase
    .from('competitor_alerts')
    .select('*, competitor:competitors(name, slug)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (unread === 'true') query = query.eq('is_read', false)
  if (competitorId) query = query.eq('competitor_id', competitorId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
