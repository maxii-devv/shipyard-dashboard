import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'
import { extractPatterns, type ViralPatterns } from '@/lib/services/viralPatternsService'
import { KNOWLEDGE_BASE } from '@/lib/knowledge-base'

// Streaming endpoint — never cache. Uses child_process, so force the Node
// runtime (not Edge).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// The Claude Code CLI binary, installed in the Docker runtime image via
// `npm install -g @anthropic-ai/claude-code`. Override CLAUDE_BIN at deploy
// time if it's at a non-standard path (e.g. local dev `npx claude`).
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const MODEL = process.env.CLAUDE_CHAT_MODEL ?? 'claude-opus-4-7'

// Subprocess hard limit — well above what a single answer needs but stops a
// runaway claude process from holding a worker forever if streaming stalls.
const SUBPROCESS_TIMEOUT_MS = 90_000

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
studies.

You are NOT in agent mode — do not call tools, do not read or write files,
do not run shell commands. Just answer.`

// Flatten the chat history into a single prompt the CLI can read on stdin.
// Claude Code's --print mode treats stdin as one user turn, so past
// assistant turns are inlined as quoted context rather than separate role
// messages. The model is good at reading this back as a conversation.
function buildPromptFromHistory(messages: ChatMessage[]): string {
  if (messages.length === 1 && messages[0].role === 'user') {
    return messages[0].content
  }
  const parts: string[] = ['<conversation>']
  for (const m of messages) {
    parts.push(`<${m.role}>`)
    parts.push(m.content)
    parts.push(`</${m.role}>`)
  }
  parts.push('</conversation>')
  parts.push('')
  parts.push('Continue the conversation — write only your next assistant reply, no XML wrappers, no role labels.')
  return parts.join('\n')
}

export async function POST(req: NextRequest) {
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
    return Response.json(
      { error: 'messages must be a non-empty array starting with a user turn' },
      { status: 400 }
    )
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

  const systemPrompt = `${ROLE_INSTRUCTION}\n\n---\n\n# Brand knowledge base\n\n${KNOWLEDGE_BASE}\n\n---\n\n${liveData}`
  const userPrompt = buildPromptFromHistory(messages)

  // Disable every Claude Code agentic capability — this is chat, not an
  // agent. --max-turns 1 also prevents reflective sub-loops.
  const args = [
    '--print',
    '--output-format', 'text',
    '--model', MODEL,
    '--max-turns', '1',
    '--append-system-prompt', systemPrompt,
    '--disallowed-tools', 'Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,Task,TodoWrite,NotebookEdit,SlashCommand,KillShell,BashOutput',
    '--strict-mcp-config',
  ]

  // Use a writable scratch CWD so claude doesn't try to roam the repo if it
  // ever bypassed --disallowed-tools. /tmp is always writable in the image.
  const proc = spawn(CLAUDE_BIN, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/tmp',
    env: {
      ...process.env,
      // HOME must point at the volume-mounted .claude dir (auth state).
      HOME: process.env.CLAUDE_HOME ?? process.env.HOME,
      // Don't ever fall back to an API key — the whole point is the
      // subscription session. If auth is missing, fail loudly.
      ANTHROPIC_API_KEY: '',
    },
  })

  // Send the user-facing prompt over stdin (avoids ARG_MAX issues if the
  // system prompt + history ever grow large).
  proc.stdin.write(userPrompt)
  proc.stdin.end()

  let stderr = ''
  let timer: NodeJS.Timeout | null = null
  let timedOut = false

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      timer = setTimeout(() => {
        timedOut = true
        proc.kill('SIGKILL')
      }, SUBPROCESS_TIMEOUT_MS)

      proc.stdout.on('data', chunk => {
        try { controller.enqueue(chunk) } catch { /* closed */ }
      })

      proc.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })

      proc.on('error', err => {
        console.error('chat: spawn failed', err)
        try {
          controller.enqueue(encoder.encode(
            `\n\n[claude CLI failed to start: ${err.message}. Is @anthropic-ai/claude-code installed in the image and is /home/nextjs/.claude mounted with a logged-in session?]`
          ))
        } catch {}
        if (timer) clearTimeout(timer)
        controller.close()
      })

      proc.on('close', code => {
        if (timer) clearTimeout(timer)
        if (timedOut) {
          try {
            controller.enqueue(encoder.encode(
              `\n\n[claude timed out after ${SUBPROCESS_TIMEOUT_MS / 1000}s — your subscription may be rate-limited, or the model stalled.]`
            ))
          } catch {}
        } else if (code !== 0) {
          // Surface auth / rate-limit failures in the stream so the UI shows
          // them instead of an empty bubble.
          const detail = stderr.trim().slice(0, 800) || `exit code ${code}`
          console.error('chat: claude exited non-zero', code, stderr)
          try {
            controller.enqueue(encoder.encode(`\n\n[claude error: ${detail}]`))
          } catch {}
        }
        controller.close()
      })
    },
    cancel() {
      if (timer) clearTimeout(timer)
      try { proc.kill('SIGTERM') } catch {}
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
