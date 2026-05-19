import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { video_id, script_content, existing_intro_id } = await req.json()

    if (!video_id || !script_content) {
      return NextResponse.json({ error: 'video_id and script_content are required' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Call OpenAI to extract the intro/hook from the script
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a YouTube content editor. Your job is to extract the intro/hook section from a video script.

The intro is the opening portion of the script — typically the first 30-60 seconds of spoken content. It may be labeled with markers like [HOOK], [INTRO], [OPEN], or it may just be the first paragraph/section before the main content begins.

Rules:
- Extract ONLY the intro/hook content — nothing else
- Keep it verbatim from the script (do not paraphrase or rewrite)
- If the script has no clear intro marker, take the first natural opening section (up to roughly 150 words)
- Return only the extracted intro text — no labels, no commentary, no quotation marks`,
          },
          {
            role: 'user',
            content: `Extract the intro/hook from this script:\n\n${script_content}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'Failed to extract intro from OpenAI' }, { status: 500 })
    }

    const openaiData = await openaiRes.json()
    const introContent = openaiData.choices?.[0]?.message?.content?.trim()

    if (!introContent) {
      return NextResponse.json({ error: 'OpenAI returned no content' }, { status: 500 })
    }

    const supabase = await createClient()

    if (existing_intro_id) {
      // Update existing intro asset
      const { data, error } = await supabase
        .from('assets')
        .update({
          content: introContent,
          status: 'pending_review',
          revision_notes: null,
          version: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing_intro_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ asset: data, intro: introContent })
    } else {
      // Create new intro asset
      const { data, error } = await supabase
        .from('assets')
        .insert({
          video_id,
          type: 'intro',
          content: introContent,
          status: 'pending_review',
          version: 1,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ asset: data, intro: introContent })
    }
  } catch (err) {
    console.error('extract-intro error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
