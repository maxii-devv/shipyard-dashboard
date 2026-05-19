import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SavedNewsSource {
  id: string
  name: string
  source_type: 'rss' | 'reddit'
  url: string
  color: string
}

// GET /api/news/preferences — return user's saved news sources
export async function GET() {
  const { data: setting } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'news_sources')
    .single()

  let sources: SavedNewsSource[] = []
  if (setting?.value) {
    try { sources = JSON.parse(setting.value) } catch {}
  }

  return NextResponse.json({ sources })
}

// PUT /api/news/preferences — save user's news sources
export async function PUT(req: NextRequest) {
  const { sources } = await req.json()

  if (!Array.isArray(sources)) {
    return NextResponse.json({ error: 'sources must be an array' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { key: 'news_sources', value: JSON.stringify(sources) },
      { onConflict: 'key' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
