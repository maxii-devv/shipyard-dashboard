import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'onboarding_completed')
    .single()

  return NextResponse.json({ completed: data?.value === 'true' })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { channel_name, niche, platforms, content_types } = body

  // Save onboarding data to user_settings
  const settings = [
    { key: 'onboarding_completed', value: 'true' },
    { key: 'channel_name', value: channel_name || '' },
    { key: 'niche', value: niche || '' },
    { key: 'platforms', value: JSON.stringify(platforms || []) },
  ]

  for (const setting of settings) {
    if (setting.value) {
      await supabase
        .from('user_settings')
        .upsert(setting, { onConflict: 'key' })
    }
  }

  // Save content preferences if provided
  if (content_types && Array.isArray(content_types)) {
    for (const ct of content_types) {
      await supabase
        .from('content_preferences')
        .insert({
          platform: ct.platform,
          content_type: ct.content_type,
          preference: ct.preference,
          source: 'onboarding',
        })
    }
  }

  // Create initial topics from niche if provided
  if (niche) {
    await supabase
      .from('topics')
      .insert({
        name: niche,
        description: `Primary content niche set during onboarding`,
        status: 'active',
        target_posts: 10,
      })
  }

  return NextResponse.json({ ok: true })
}
