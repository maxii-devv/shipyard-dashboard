import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { extractPatterns, type ViralPatterns } from '@/lib/services/viralPatternsService'
import { KNOWLEDGE_BASE } from '@/lib/knowledge-base'

// Streaming endpoint — never cache.
export const dynamic = 'force-dynamic'

const MODEL = 'claude-opus-4-7'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Compact, model-readable digest of the live dashboard data. */
function formatPatterns(p: ViralPatterns, days: number): string {
  const b = p.baseline
  const lines: string[] = []
  lines.push(`# Live dashboard data — last ${days} days (generated ${p.generated_at})`)
  lines.push('')
  lines.push(
    `Baseline over ${b.post_count} posts: avg views ${b.avg_views}, avg saves ${b.avg_saves}, ` +
      `avg likes ${b.avg_likes}, avg shares ${b.avg_shares}, ` +
      `avg engagement ${((b.avg_engagement_rate ?? 0) * 100).toFixed(2)}%.`
  )
  if (p.patterns.sample_size_warning) {
    lines.push(`Sample-size caveat: ${p.patterns.sample_size_warning}`)
  }

  if (p.outliers.length > 0) {
    lines.push('')
    lines.push(`Top performers (${p.outliers.length} outliers ≥2x avg), best first:`)
    for (const o of p.outliers.slice(0, 10)) {
      const cap = (o.caption ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
      lines.push(
        `- ${o.outlier_score.toFixed(1)}x | ${o.views} views, ${o.saves} saves, ` +
          `${o.shares} shares | ${cap || '(no caption)'}`
      )
    }
  }

  const bucket = (
    title: string,
    items: { label: string; value: number; count: number }[]
  ) => {
    if (items.length === 0) return
    lines.push('')
    lines.push(`${title} (avg views | n):`)
    for (const it of items) lines.push(`- ${it.label}: ${it.value} | ${it.count}`)
  }
  bucket(
    'Hook styles',
    p.patterns.top_hook_styles.map(h => ({ label: h.style, value: h.avg_views, count: h.count }))
  )
  bucket(
    'CTA keywords',
    p.patterns.best_cta_keywords.map(k => ({ label: k.keyword, value: k.avg_views, count: k.count }))
  )
  bucket(
    'Content types',
    p.patterns.best_content_types.map(t => ({ label: t.type, value: t.avg_views, count: t.count }))
  )
  bucket(
    'Layouts',
    p.patterns.best_layouts.map(l => ({ label: l.layout, value: l.avg_views, count: l.count }))
  )

  return lines.join('\n')
}

const ROLE_INSTRUCTION = `You are IZAN's personal content coach, embedded in his Viral Coach dashboard.
You answer Izan's questions about content strategy, hooks, scripts, brand
positioning, and his audience — in his voice and on-brand.

Ground every answer in two things:
1. The brand knowledge base below (his voice, ICP, the IZAN Viral Scripting
   Framework, offer ladder). Stay on-brand and route CTAs toward the AI Designer
   Academy or a high-ticket diagnostic — never generic "link in bio" or invented
   offers.
2. The live dashboard data appended after the knowledge base (his real
   performance: baseline, outliers, winning hook/CTA/content/layout patterns).
   When asked what's working or what to post next, reason from this data and
   cite the actual numbers.

Be specific and concrete, never generic. Sound like a sharp operator talking,
not a marketer writing. If the live data is missing or thin, say so plainly
instead of inventing numbers. Never fabricate revenue, client names, or case
studies.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      {
        error:
          'ANTHROPIC_API_KEY is not set. Add it to viral-coach-ui/.env.local (get a key at https://console.anthropic.com/settings/keys) and redeploy / restart the dev server.',
      },
      { status: 503 }
    )
  }

  let body: { messages?: ChatMessage[]; days?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const messages = (body.messages ?? []).filter(
    m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()
  )
  if (messages.length === 0 || messages[0].role !== 'user') {
    return Response.json({ error: 'messages must be a non-empty array starting with a user turn' }, { status: 400 })
  }

  const days = Math.min(Math.max(body.days ?? 90, 1), 365)

  // Live data is best-effort: if the DB is down, still answer from the KB.
  let liveData: string
  try {
    const patterns = await extractPatterns(days)
    liveData = formatPatterns(patterns, days)
  } catch (err) {
    console.error('chat: extractPatterns failed', err)
    liveData = `# Live dashboard data\n(Unavailable — the database could not be reached. Answer from the knowledge base and tell Izan the live numbers are not loading.)`
  }

  const client = new Anthropic({ apiKey })

  // Stable prefix (role + KB) is cached; volatile live data sits after the
  // cache breakpoint so it never invalidates the cached portion.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: `${ROLE_INSTRUCTION}\n\n---\n\n${KNOWLEDGE_BASE}`,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: liveData,
    },
  ]

  try {
    const anthropicStream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        anthropicStream.on('text', t => controller.enqueue(encoder.encode(t)))
        anthropicStream.on('error', e => {
          console.error('chat: stream error', e)
          try {
            controller.enqueue(encoder.encode('\n\n[stream error — see server logs]'))
          } catch {}
          controller.close()
        })
        anthropicStream.on('end', () => controller.close())
      },
      cancel() {
        anthropicStream.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('chat: request failed', err)
    return Response.json({ error: 'Claude request failed. Check the API key and server logs.' }, { status: 502 })
  }
}
