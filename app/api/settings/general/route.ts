import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SETTING_KEYS = ['channel_name', 'niche', 'platforms'] as const

export async function GET() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('key, value')
    .in('key', [...SETTING_KEYS])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }

  // Fetch content preferences
  const { data: prefs } = await supabase
    .from('content_preferences')
    .select('platform, content_type, preference')

  return NextResponse.json({
    channel_name: settings.channel_name || '',
    niche: settings.niche || '',
    platforms: settings.platforms ? JSON.parse(settings.platforms) : [],
    content_types: prefs || [],
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { channel_name, niche, platforms, content_types } = body

  // Upsert user_settings
  const updates: { key: string; value: string }[] = []
  if (channel_name !== undefined) updates.push({ key: 'channel_name', value: channel_name })
  if (niche !== undefined) updates.push({ key: 'niche', value: niche })
  if (platforms !== undefined) updates.push({ key: 'platforms', value: JSON.stringify(platforms) })

  for (const setting of updates) {
    const { error } = await supabase
      .from('user_settings')
      .upsert(setting, { onConflict: 'key' })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Update content preferences if provided
  if (content_types !== undefined && Array.isArray(content_types)) {
    // Clear existing preferences and re-insert
    await supabase.from('content_preferences').delete().neq('source', 'never_delete')

    if (content_types.length > 0) {
      const rows = content_types.map((ct: { platform: string; content_type: string; preference: string }) => ({
        platform: ct.platform,
        content_type: ct.content_type,
        preference: ct.preference,
        source: 'settings',
      }))
      const { error } = await supabase.from('content_preferences').insert(rows)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
