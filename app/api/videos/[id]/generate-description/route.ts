import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DESCRIPTION_PROMPT = `You are a YouTube description writer. Write a structured, SEO-optimized YouTube description following this template.

## Rules
- Direct voice. First sentence = the result, not the setup.
- Specific — numbers, names, tools.
- No hype words — no "insane," "game-changing," "revolutionary."
- Short paragraphs (2-4 sentences max).
- Sentence fragments are fine.
- Target 2,500-4,000 characters total.

## Template

[HOOK PARAGRAPH — 2-3 sentences, result-first, specific numbers. Primary keyword in first sentence.]

[DETAIL PARAGRAPH — 3-5 sentences, what they'll see, key features/reveals, real examples]

[VALUE PROP — punchy contrast: "No X. No Y. No Z. One [simple thing]. Let me show you how it works."]

⏱️ TIMESTAMPS:
[timestamps from transcript chapters — format: 00:00 — Label]

🛠️ [TOPIC-SPECIFIC HEADER]:
► [main tool/repo/resource shown]

🔗 TOOLS MENTIONED IN THIS VIDEO:
► [every tool, platform, product referenced — one per line with ►]

🎯 KEY TAKEAWAYS:
► [3-5 bullet points of key concepts]

This video covers: [15-25 comma-separated keyword phrases relevant to the video topic]

[5-8 hashtags — first 3 are most searchable]

## Important
- Front-load the first 2 lines — they show above "Show more"
- Extract timestamps from the transcript's natural section breaks
- List ALL tools mentioned in the video
- Direct, conversational tone
- Under 5,000 characters total`

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  // Get video info
  const { data: video, error: videoErr } = await supabase
    .from('videos')
    .select('id, title')
    .eq('id', id)
    .single()

  if (videoErr || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // Get transcription
  const { data: transcription } = await supabase
    .from('video_transcriptions')
    .select('transcript_text, transcript_json')
    .eq('video_id', id)
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!transcription?.transcript_text) {
    return NextResponse.json({ error: 'No transcription found. Upload and transcribe the video first.' }, { status: 400 })
  }

  // Build chapters from transcript JSON if available
  let chapters = ''
  if (transcription.transcript_json?.segments) {
    const segs = transcription.transcript_json.segments as Array<{ start: number; text: string }>
    let lastTime = -999
    const chapterLines: string[] = []
    for (const seg of segs) {
      if (seg.start - lastTime >= 60) {
        const text = seg.text.replace(/^[-–—\s]+/, '').trim().slice(0, 60)
        if (text) {
          const m = Math.floor(seg.start / 60)
          const s = Math.floor(seg.start % 60)
          chapterLines.push(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} — ${text}`)
          lastTime = seg.start
        }
      }
    }
    chapters = chapterLines.join('\n')
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: DESCRIPTION_PROMPT },
          {
            role: 'user',
            content: `Generate a YouTube description for this video.

**Title:** ${video.title}

**Transcript chapters:**
${chapters || '(no chapters available — extract timestamps from the transcript)'}

**Full transcript:**
${transcription.transcript_text.slice(0, 12000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 })
    }

    const completion = await openaiRes.json()
    const description = completion.choices?.[0]?.message?.content?.trim()

    if (!description) {
      return NextResponse.json({ error: 'No description generated' }, { status: 500 })
    }

    // Save as a description asset
    // Check if one exists already
    const { data: existing } = await supabase
      .from('assets')
      .select('id, version')
      .eq('video_id', id)
      .eq('type', 'description')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const version = existing ? existing.version + 1 : 1

    const { data: asset, error: assetErr } = await supabase
      .from('assets')
      .insert({
        video_id: id,
        type: 'description',
        content: description,
        status: 'draft',
        version,
      })
      .select()
      .single()

    if (assetErr) {
      return NextResponse.json({ error: assetErr.message }, { status: 500 })
    }

    return NextResponse.json({ asset, description })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Generation failed' }, { status: 500 })
  }
}
