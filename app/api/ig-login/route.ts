import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'

// One-time (persistent) Instagram login for the server-side Playwright browser.
// Drives the same claude + Playwright MCP path as /api/run, but with a fixed
// login script and — critically — it NEVER forwards the model's tool calls to
// the client, because the browser_type tool input would contain the typed
// password. Only high-level text + a final LOGIN_RESULT line are streamed back.
//
// The login persists in the /data/pw-profile volume (see .mcp.json
// --user-data-dir), so it survives container rebuilds and only needs doing
// when the session actually expires.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const MODEL = process.env.CLAUDE_RUN_MODEL ?? 'claude-opus-4-7'
const RUN_CWD = process.env.CLAUDE_RUN_CWD ?? '/data/izan-project'
const MCP_CONFIG = process.env.CLAUDE_MCP_CONFIG ?? `${RUN_CWD}/.mcp.json`
const LOGIN_TIMEOUT_MS = 5 * 60_000

interface LoginRequest {
  username?: string
  password?: string
}

type StreamEvent =
  | { type: 'system'; session_id?: string }
  | { type: 'assistant'; message?: { content?: Array<{ type: string; text?: string }> } }
  | { type: 'result'; is_error?: boolean; result?: string }

// Build the login script. Creds are interpolated here, server-side only — they
// go to the claude subprocess via stdin and never appear in the client stream.
function loginPrompt(username: string, password: string): string {
  return [
    'You are logging a dummy Instagram account into a persistent browser session.',
    'Use ONLY the playwright browser tools (mcp__playwright__*). Be concise.',
    '',
    'Steps:',
    '1. Navigate to https://www.instagram.com/accounts/login/ and take a snapshot.',
    '2. If you are already logged in (a home feed / no login form is shown), reply with exactly: LOGIN_RESULT: ALREADY  and stop.',
    `3. Type this exact username into the username field: ${username}`,
    `4. Type this exact password into the password field: ${password}`,
    '5. Click the "Log in" button and wait for the page to settle.',
    '6. If a "Save your login info?" or "Turn on Notifications" dialog appears, click "Not Now" / dismiss it.',
    '7. If a verification, checkpoint, or two-factor challenge appears (it asks for a code from email/SMS/app), reply with exactly: LOGIN_RESULT: CHALLENGE: <one short phrase describing what it asks for>  and stop. Do NOT guess any code.',
    '8. If you reach the logged-in home feed, reply with exactly: LOGIN_RESULT: OK  and stop.',
    '9. If login is rejected (wrong password, error banner), reply with exactly: LOGIN_RESULT: FAIL: <short reason>  and stop.',
    '',
    'CRITICAL: Never write the username or password text in any of your messages. Keep messages short. End with exactly one LOGIN_RESULT: line.',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  let body: LoginRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const username = (body.username ?? '').trim()
  const password = body.password ?? ''
  if (!username || !password) {
    return Response.json({ error: 'username and password are required' }, { status: 400 })
  }

  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', MODEL,
    '--mcp-config', MCP_CONFIG,
    '--strict-mcp-config',
  ]

  const proc = spawn(CLAUDE_BIN, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: RUN_CWD,
    env: { ...process.env, HOME: process.env.CLAUDE_HOME ?? process.env.HOME, ANTHROPIC_API_KEY: '' },
  })

  proc.stdin.write(loginPrompt(username, password))
  proc.stdin.end()

  let timer: NodeJS.Timeout | null = null
  let timedOut = false
  let buffer = ''

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const emit = (tag: string, value: string) => {
        try { controller.enqueue(encoder.encode(`<<<${tag}>>>${value}\n`)) } catch { /* closed */ }
      }

      // Only text + final result reach the client. Tool calls (which carry the
      // typed password) are deliberately NOT forwarded.
      const handleEvent = (ev: StreamEvent) => {
        if (ev.type === 'assistant' && ev.message?.content) {
          for (const block of ev.message.content) {
            if (block.type === 'text' && block.text) emit('status', block.text)
          }
          return
        }
        if (ev.type === 'result') {
          if (ev.is_error && ev.result) emit('error', ev.result)
        }
      }

      timer = setTimeout(() => { timedOut = true; proc.kill('SIGKILL') }, LOGIN_TIMEOUT_MS)

      proc.stdout.on('data', chunk => {
        buffer += chunk.toString()
        let nl: number
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          try { handleEvent(JSON.parse(line) as StreamEvent) } catch { /* ignore non-JSON */ }
        }
      })
      // stderr may echo the prompt on a crash — swallow it (don't leak creds).
      proc.stderr.on('data', () => {})

      proc.on('error', err => {
        emit('error', `claude failed to start: ${err.message}`)
        if (timer) clearTimeout(timer)
        controller.close()
      })

      proc.on('close', code => {
        if (timer) clearTimeout(timer)
        if (buffer.trim()) { try { handleEvent(JSON.parse(buffer) as StreamEvent) } catch { /* ignore */ } }
        if (timedOut) emit('error', `login timed out after ${LOGIN_TIMEOUT_MS / 60000}m`)
        else if (code !== 0) emit('error', `login process exited with code ${code}`)
        controller.close()
      })
    },
    cancel() {
      if (timer) clearTimeout(timer)
      try { proc.kill('SIGTERM') } catch {}
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
