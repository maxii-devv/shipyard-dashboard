import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { summary } = await req.json()

    if (!summary) {
      return NextResponse.json({ error: 'summary required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a social media analytics expert. Analyze this content creator's performance data and provide actionable insights.

DATA:
${JSON.stringify(summary, null, 2)}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "insights": [
    {
      "category": "working" | "attention" | "recommendation",
      "title": "Short title (5-8 words)",
      "description": "One sentence explanation with specific numbers from the data",
      "severity": "green" | "amber" | "red"
    }
  ]
}

Rules:
- Return 4-8 insights total, mix of all 3 categories
- Use "working" for things going well (green severity)
- Use "attention" for concerning trends (amber or red severity)
- Use "recommendation" for specific next actions (green or amber severity)
- Reference actual numbers from the data
- Be direct and specific, not generic
- If a platform has 0 posts, note it needs attention
- Compare engagement rates across platforms
- Flag if posting is inconsistent`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI insights error:', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
