import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'

// Streaming endpoint — never cache. Uses child_process, so force the Node
// runtime (not Edge).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Same Claude Code binary the /api/chat route uses. The "run" route differs by:
//   1. tools are ENABLED (no --disallowed-tools, no --max-turns)
//   2. cwd points at /data/izan-project so .claude/commands/izan-*.md and
//      .claude/commands/viral-coach-skills/*.md resolve as project-local
//      slash commands
//   3. we keep the session id across turns by passing --resume <id>
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const MODEL = process.env.CLAUDE_RUN_MODEL ?? 'claude-opus-4-7'
const RUN_CWD = process.env.CLAUDE_RUN_CWD ?? '/data/izan-project'
// MCP servers (Playwright browser tools, etc.) live in this config inside the
// run cwd. --strict-mcp-config means ONLY this file is loaded — no user/global
// MCP config leaks in. Set CLAUDE_MCP_CONFIG='' to disable MCP entirely.
const MCP_CONFIG = process.env.CLAUDE_MCP_CONFIG ?? `${RUN_CWD}/.mcp.json`

// Soft cap per turn. Izan commands are long-running (playwright loops,
// notion calls), so this is generous compared to /api/chat.
const SUBPROCESS_TIMEOUT_MS = 30 * 60_000

interface RunRequest {
  /** Free-form prompt; can be a slash command like `/izan-feedback-research`. */
  prompt?: string
  /** Resume an existing Claude Code session so multi-turn replies work. */
  sessionId?: string | null
}

/**
 * Each line of stream-json output is a JSON envelope. We forward the raw
 * text content (`type: "assistant"`, `message.content[].text`) to the
 * client as plain UTF-8 chunks, and emit one final `__session__` line so
 * the client can capture the session id for the next turn.
 */
type StreamEvent =
  | { type: 'system'; subtype?: string; session_id?: string }
  | {
      type: 'assistant'
      message?: {
        content?: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; name?: string; input?: unknown }
          | { type: 'tool_result'; content?: string }
        >
      }
    }
  | { type: 'user'; message?: unknown }
  | { type: 'result'; subtype?: string; session_id?: string; result?: string; is_error?: boolean }

export async function POST(req: NextRequest) {
  let body: RunRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = (body.prompt ?? '').trim()
  if (!prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }
  const sessionId = body.sessionId?.trim() || null

  // stream-json + --verbose: one JSON object per line, with tool calls,
  // tool results, and assistant deltas. The page parses these into a
  // readable transcript instead of just dumping raw model output.
  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', MODEL,
  ]
  if (MCP_CONFIG) {
    args.push('--mcp-config', MCP_CONFIG, '--strict-mcp-config')
  }
  if (sessionId) {
    args.push('--resume', sessionId)
  }

  const proc = spawn(CLAUDE_BIN, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: RUN_CWD,
    env: {
      ...process.env,
      HOME: process.env.CLAUDE_HOME ?? process.env.HOME,
      // Subscription auth path only — see /api/chat for the same trick.
      ANTHROPIC_API_KEY: '',
    },
  })

  proc.stdin.write(prompt)
  proc.stdin.end()

  let stderr = ''
  let timer: NodeJS.Timeout | null = null
  let timedOut = false
  let buffer = ''

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      // Helper: emit one of our own protocol lines so the client can
      // distinguish text, tool calls, and the session id. Lines look like
      //   <<<text>>>actual text\n
      //   <<<tool>>>{"name":"Bash","input":{...}}\n
      //   <<<session>>>abc123\n
      //   <<<error>>>...\n
      const emit = (tag: string, value: string) => {
        try {
          controller.enqueue(encoder.encode(`<<<${tag}>>>${value}\n`))
        } catch {
          /* stream closed */
        }
      }

      const handleEvent = (ev: StreamEvent) => {
        if (ev.type === 'system' && ev.session_id) {
          emit('session', ev.session_id)
          return
        }
        if (ev.type === 'assistant' && ev.message?.content) {
          for (const block of ev.message.content) {
            if (block.type === 'text' && block.text) {
              emit('text', block.text)
            } else if (block.type === 'tool_use') {
              try {
                emit('tool', JSON.stringify({ name: block.name, input: block.input }))
              } catch {
                emit('tool', String(block.name ?? 'tool'))
              }
            }
          }
          return
        }
        if (ev.type === 'result') {
          if (ev.session_id) emit('session', ev.session_id)
          if (ev.is_error && ev.result) emit('error', ev.result)
        }
      }

      timer = setTimeout(() => {
        timedOut = true
        proc.kill('SIGKILL')
      }, SUBPROCESS_TIMEOUT_MS)

      proc.stdout.on('data', chunk => {
        buffer += chunk.toString()
        let nl: number
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          try {
            handleEvent(JSON.parse(line) as StreamEvent)
          } catch {
            // Forward malformed JSON as text rather than dropping it — the
            // user still sees what came back.
            emit('text', line)
          }
        }
      })

      proc.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })

      proc.on('error', err => {
        console.error('run: spawn failed', err)
        emit('error', `claude CLI failed to start: ${err.message}`)
        if (timer) clearTimeout(timer)
        controller.close()
      })

      proc.on('close', code => {
        if (timer) clearTimeout(timer)
        // Flush any trailing partial line.
        if (buffer.trim()) {
          try { handleEvent(JSON.parse(buffer) as StreamEvent) } catch {
            emit('text', buffer)
          }
        }
        if (timedOut) {
          emit('error', `claude timed out after ${SUBPROCESS_TIMEOUT_MS / 60000}m`)
        } else if (code !== 0) {
          const detail = stderr.trim().slice(0, 1200) || `exit code ${code}`
          console.error('run: claude exited non-zero', code, stderr)
          emit('error', detail)
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
