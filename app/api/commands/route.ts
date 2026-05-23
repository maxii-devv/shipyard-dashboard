import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Command {
  cmd: string
  hint: string
}

// Mirror /api/run's RUN_CWD. In the Docker image the izan skill tree is
// COPY'd to /data/izan-project/.claude/commands; the standalone Next server
// runs with cwd=/app, so we cannot resolve relative to cwd.
const COMMANDS_DIR = path.join(
  process.env.CLAUDE_RUN_CWD ?? '/data/izan-project',
  '.claude',
  'commands',
)

// Pulls the `description` field out of a skill .md's YAML frontmatter. Handles
// both folded (`description: >`) and inline forms. Stops at the next top-level
// key or the closing `---`.
function parseDescription(md: string): string {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return ''
  const body = fm[1]
  const lines = body.split(/\r?\n/)
  let collecting = false
  let inline = ''
  const folded: string[] = []
  for (const line of lines) {
    if (!collecting) {
      const m = line.match(/^description\s*:\s*(.*)$/)
      if (!m) continue
      const rest = m[1].trim()
      if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
        collecting = true
        continue
      }
      inline = rest.replace(/^['"]|['"]$/g, '')
      break
    } else {
      // Folded scalar continues while lines are indented; stop on next top-level key.
      if (/^\S/.test(line)) break
      folded.push(line.trim())
    }
  }
  return (inline || folded.join(' ')).trim()
}

// Trim a long description down to a short picker hint. Drops the "Triggers: …"
// tail since it's just keyword spam for the agent's discovery layer.
function toHint(description: string): string {
  let s = description.replace(/\s+Triggers\s*:[\s\S]*$/i, '').trim()
  // Take the first sentence if it's long.
  if (s.length > 90) {
    const dot = s.indexOf('. ')
    if (dot > 20 && dot < 100) s = s.slice(0, dot + 1)
  }
  if (s.length > 120) s = s.slice(0, 117).trimEnd() + '…'
  return s
}

async function scan(dir: string, prefix: string): Promise<Command[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: Command[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Nested folders become namespaced commands: `<dir>:<file>`.
      const nested = await scan(full, `${entry.name}:`)
      out.push(...nested)
      continue
    }
    if (!entry.name.endsWith('.md')) continue
    const base = entry.name.replace(/\.md$/, '')
    const md = await readFile(full, 'utf8').catch(() => '')
    const desc = parseDescription(md)
    out.push({ cmd: `/${prefix}${base}`, hint: toHint(desc) })
  }
  return out
}

export async function GET() {
  try {
    const commands = await scan(COMMANDS_DIR, '')
    commands.sort((a, b) => a.cmd.localeCompare(b.cmd))
    return NextResponse.json({ commands })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
