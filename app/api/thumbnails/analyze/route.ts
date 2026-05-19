import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { thumbnailId, src } = await req.json()

  if (!thumbnailId || !src) {
    return NextResponse.json({ error: 'thumbnailId and src required' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured. Add it to .env.local to enable AI analysis.' },
      { status: 503 }
    )
  }

  try {
    // Call OpenAI vision API
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this YouTube thumbnail briefly. Cover: visual hook strength, text legibility, emotional appeal, color contrast, and one specific improvement suggestion. Be direct and concise (2-3 sentences max).`,
              },
              {
                type: 'image_url',
                image_url: { url: src, detail: 'low' },
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const analysis = data.choices?.[0]?.message?.content ?? 'No analysis returned.'

    // Save to DB
    const supabase = await createClient()
    await supabase
      .from('thumbnails')
      .update({ ai_analysis: analysis, ai_analysis_at: new Date().toISOString() })
      .eq('id', thumbnailId)

    return NextResponse.json({ analysis })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
