import { spawn } from 'node:child_process'

// Lightweight "is the dummy IG account logged in?" probe. Launches the
// server-side browser via claude + Playwright MCP, loads instagram.com using
// the persistent profile, and reports whether a session is present.
//
// Heavy-ish (~20-40s, spawns a headless browser), so the UI calls it on demand
// — not on every page load.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const MODEL = process.env.CLAUDE_RUN_MODEL ?? 'claude-opus-4-7'
const RUN_CWD = process.env.CLAUDE_RUN_CWD ?? '/data/izan-project'
const MCP_CONFIG = process.env.CLAUDE_MCP_CONFIG ?? `${RUN_CWD}/.mcp.json`
const TIMEOUT_MS = 2 * 60_000

const PROMPT = [
  'Use ONLY the playwright browser tools. Navigate to https://www.instagram.com/ and take a snapshot.',
  'Decide if a user is logged in (a personal home feed / profile nav is visible) or logged out (a "Log in" form / button is shown).',
  'Reply with exactly one line and nothing else: SESSION: IN  or  SESSION: OUT',
].join('\n')

export async function GET() {
  const args = [
    '--print', '--output-format', 'stream-json', '--verbose',
    '--model', MODEL, '--mcp-config', MCP_CONFIG, '--strict-mcp-config',
  ]
  const proc = spawn(CLAUDE_BIN, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: RUN_CWD,
    env: { ...process.env, HOME: process.env.CLAUDE_HOME ?? process.env.HOME, ANTHROPIC_API_KEY: '' },
  })
  proc.stdin.write(PROMPT)
  proc.stdin.end()

  let text = ''
  let buffer = ''
  const kill = setTimeout(() => { try { proc.kill('SIGKILL') } catch {} }, TIMEOUT_MS)

  await new Promise<void>(resolve => {
    proc.stdout.on('data', chunk => {
      buffer += chunk.toString()
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line) continue
        try {
          const ev = JSON.parse(line) as { type: string; message?: { content?: Array<{ type: string; text?: string }> } }
          if (ev.type === 'assistant' && ev.message?.content) {
            for (const b of ev.message.content) if (b.type === 'text' && b.text) text += b.text + '\n'
          }
        } catch { /* ignore */ }
      }
    })
    proc.stderr.on('data', () => {})
    proc.on('error', () => resolve())
    proc.on('close', () => resolve())
  })
  clearTimeout(kill)

  const loggedIn = /SESSION:\s*IN/i.test(text) ? true
    : /SESSION:\s*OUT/i.test(text) ? false
    : null
  return Response.json({ loggedIn, detail: text.trim().slice(0, 200) }, { headers: { 'Cache-Control': 'no-store' } })
}
