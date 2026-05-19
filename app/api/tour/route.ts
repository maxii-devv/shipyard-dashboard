import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'tour_completed')
    .single()

  return NextResponse.json({ completed: data?.value === 'true' })
}

export async function POST() {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { key: 'tour_completed', value: 'true', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) {
    console.error('Tour completion save failed:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
