import { NextRequest, NextResponse } from 'next/server'

const PROMPTS: Record<string, string> = {
  script: `You are an expert YouTube content coach. Score this YouTube video script on the following dimensions (0-10 each):
- hook: Does the opening grab attention in the first 15 seconds?
- clarity: Is the content easy to follow and well-structured?
- value: Does it deliver genuine value/entertainment for the target viewer?
- retention: Would viewers keep watching through to the end?
- cta: Is there a clear, compelling call to action?

Also provide:
- overall: weighted score out of 100 (hook×2 + clarity + value×2 + retention×2 + cta) / 0.8
- summary: 2-sentence overall assessment
- top_tip: the single most impactful thing to improve

Respond ONLY with valid JSON matching this exact structure:
{"hook":7,"clarity":8,"value":9,"retention":7,"cta":6,"overall":74,"summary":"...","top_tip":"..."}`,

  description: `You are a YouTube SEO and audience growth expert. Score this YouTube video description:
- seo: Is it keyword-rich and search-optimized?
- hook: Does the first 2-3 lines make viewers click "show more"?
- value: Does it clearly explain what the viewer will learn/get?
- cta: Are there clear calls to action (subscribe, links, etc.)?
- structure: Is it well-formatted with timestamps, links, sections?

Also provide:
- overall: weighted score out of 100
- summary: 2-sentence assessment
- top_tip: the single most impactful improvement

Respond ONLY with valid JSON:
{"seo":7,"hook":8,"value":7,"cta":6,"structure":8,"overall":72,"summary":"...","top_tip":"..."}`,

  linkedin_post: `You are a LinkedIn growth expert. Score this LinkedIn post:
- hook: Does the first line make people stop scrolling?
- value: Does it provide genuine insight/value to professionals?
- authenticity: Does it feel genuine, not corporate?
- engagement: Would it spark comments/discussion?
- cta: Is there a clear reason to engage or follow?

Also provide:
- overall: weighted score out of 100
- summary: 2-sentence assessment
- top_tip: the single most impactful improvement

Respond ONLY with valid JSON:
{"hook":7,"value":8,"authenticity":7,"engagement":6,"cta":5,"overall":66,"summary":"...","top_tip":"..."}`,

  reel_script: `You are a short-form video expert (Instagram Reels, TikTok). Score this reel script:
- hook: Does it grab attention in the first 1-2 seconds?
- pacing: Is it fast-paced and punchy enough for short-form?
- value: Does it deliver a clear takeaway or entertainment value?
- trend: Does it tap into a format/trend viewers recognize?
- cta: Does it give viewers a reason to save, share, or follow?

Also provide:
- overall: weighted score out of 100
- summary: 2-sentence assessment
- top_tip: the single most impactful improvement

Respond ONLY with valid JSON:
{"hook":8,"pacing":7,"value":8,"trend":6,"cta":5,"overall":72,"summary":"...","top_tip":"..."}`,

  caption: `You are a social media expert. Score this social media caption:
- hook: Does the opening line make people stop scrolling?
- value: Does it add context, entertainment, or insight?
- authenticity: Does it feel genuine and personal?
- hashtags: Are hashtags relevant and well-chosen (if present)?
- cta: Is there a clear reason to engage?

Also provide:
- overall: weighted score out of 100
- summary: 2-sentence assessment
- top_tip: the single most impactful improvement

Respond ONLY with valid JSON:
{"hook":7,"value":7,"authenticity":8,"hashtags":6,"cta":5,"overall":66,"summary":"...","top_tip":"..."}`,
}

export async function POST(req: NextRequest) {
  const { content, type } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > 20000) {
    return NextResponse.json({ error: 'Content too long (max 20,000 characters)' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  const systemPrompt = PROMPTS[type] ?? PROMPTS.caption

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Score this content:\n\n${content.slice(0, 4000)}` },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? '{}'

    let parsed: Record<string, any>
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ score: parsed, type })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
