'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Terminal as TerminalIcon, RotateCw, Wrench, AlertCircle, ChevronRight } from 'lucide-react'

// One turn of the conversation, broken into the chunks the /api/run protocol
// emits. We render each chunk inline so tool calls show up between text
// blocks in the order they actually happened.
type Chunk =
  | { kind: 'text'; value: string }
  | { kind: 'tool'; name: string; input: unknown }
  | { kind: 'error'; value: string }

interface Turn {
  role: 'user' | 'assistant'
  chunks: Chunk[]
}

// Suggested commands — exactly the slash commands the container has under
// /data/izan-project/.claude/commands/. The viral-coach-skills ones are
// nested, hence the namespaced form.
const COMMANDS: { cmd: string; hint: string }[] = [
  { cmd: '/izan-feedback-research', hint: 'Full pipeline + feedback loop' },
  { cmd: '/izan-full-pipeline', hint: 'Full pipeline without feedback loop' },
  { cmd: '/izan-viral-spotter', hint: 'Scrape creators for 5x outliers' },
  { cmd: '/izan-creator-finder', hint: 'Discover new niche creators' },
  { cmd: '/izan-transcribe-and-script', hint: 'Transcribe + rewrite the queue' },
  { cmd: '/izan-viral-scripter', hint: 'Standalone script writer' },
  { cmd: '/viral-coach-skills:content-plan', hint: 'Plan next post from live data' },
  { cmd: '/viral-coach-skills:create-carousel', hint: 'Carousel slide-by-slide script' },
  { cmd: '/viral-coach-skills:create-course-lesson', hint: 'Educational post from patterns' },
  { cmd: '/viral-coach-skills:tag-posts', hint: 'Auto-tag untagged posts' },
]

export default function RunPage() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  async function run(text: string) {
    const prompt = text.trim()
    if (!prompt || busy) return
    setInput('')

    // Push user turn + an empty assistant turn that we'll fill as the
    // stream lands.
    setTurns(prev => [...prev, { role: 'user', chunks: [{ kind: 'text', value: prompt }] }, { role: 'assistant', chunks: [] }])
    setBusy(true)
    scrollToBottom()

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
      })
      if (!res.ok || !res.body) {
        const detail = res.ok ? 'No response body' : `HTTP ${res.status}`
        appendChunk({ kind: 'error', value: detail })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        pending += decoder.decode(value, { stream: true })

        let nl: number
        while ((nl = pending.indexOf('\n')) !== -1) {
          const rawLine = pending.slice(0, nl)
          pending = pending.slice(nl + 1)
          processLine(rawLine)
        }
        scrollToBottom()
      }
      if (pending.trim()) processLine(pending)
    } catch (err) {
      appendChunk({ kind: 'error', value: (err as Error).message })
    } finally {
      setBusy(false)
      scrollToBottom()
    }
  }

  function processLine(line: string) {
    // Protocol from /api/run: `<<<tag>>>payload`. Skip the regex / `s` flag
    // (needs ES2018) — indexOf is enough and keeps the build at ES2017.
    if (!line.startsWith('<<<')) return
    const end = line.indexOf('>>>')
    if (end === -1) return
    const tag = line.slice(3, end)
    const payload = line.slice(end + 3)
    if (tag !== 'text' && tag !== 'tool' && tag !== 'session' && tag !== 'error') return
    if (tag === 'session') {
      setSessionId(payload.trim() || null)
      return
    }
    if (tag === 'text') {
      // Merge consecutive text chunks so paragraphs land in one bubble
      // rather than thousands of single-token chunks.
      setTurns(prev => mergeText(prev, payload))
      return
    }
    if (tag === 'tool') {
      try {
        const parsed = JSON.parse(payload)
        appendChunk({ kind: 'tool', name: String(parsed.name ?? 'tool'), input: parsed.input })
      } catch {
        appendChunk({ kind: 'tool', name: payload, input: null })
      }
      return
    }
    if (tag === 'error') {
      appendChunk({ kind: 'error', value: payload })
    }
  }

  function mergeText(prev: Turn[], text: string): Turn[] {
    if (prev.length === 0) return prev
    const last = prev[prev.length - 1]
    if (last.role !== 'assistant') return prev
    const chunks = [...last.chunks]
    const tail = chunks[chunks.length - 1]
    if (tail && tail.kind === 'text') {
      chunks[chunks.length - 1] = { kind: 'text', value: tail.value + text }
    } else {
      chunks.push({ kind: 'text', value: text })
    }
    return [...prev.slice(0, -1), { ...last, chunks }]
  }

  function appendChunk(chunk: Chunk) {
    setTurns(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, chunks: [...last.chunks, chunk] }]
    })
  }

  function reset() {
    setTurns([])
    setSessionId(null)
  }

  // Cmd+Enter / Ctrl+Enter to run.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      run(input)
    }
  }

  // Auto-grow the textarea — caps at ~6 lines.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  return (
    <div className="p-8 space-y-4" style={{ background: '#262624', minHeight: '100vh' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TerminalIcon className="w-5 h-5" style={{ color: '#a78bfa' }} />
            COOK NOW
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Runs <span className="font-mono text-white/60">claude</span> in the container with your izan slash commands available. Multi-turn — replies stay in the same session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span
              className="px-2.5 py-1 rounded-md text-[10px] font-mono"
              style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.18)' }}
              title={sessionId}
            >
              session {sessionId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={reset}
            disabled={turns.length === 0 && !sessionId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <RotateCw className="w-3 h-3" />
            New session
          </button>
        </div>
      </div>

      {/* ── Command quick-picks ───────────────────────────────────────────── */}
      {turns.length === 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[10px] uppercase tracking-widest font-semibold text-white/40 mb-3">
            Available commands
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {COMMANDS.map(c => (
              <button
                key={c.cmd}
                onClick={() => setInput(c.cmd)}
                className="text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(167,139,250,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(167,139,250,0.22)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                }}
              >
                <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                <span className="font-mono text-[12px] text-white/85 flex-shrink-0">{c.cmd}</span>
                <span className="text-[11px] text-white/35 truncate ml-auto">{c.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/30 mt-3">
            MCP-dependent commands (Notion, Playwright) need their servers configured in this container — they will fail with &quot;tool not available&quot; until then.
          </p>
        </div>
      )}

      {/* ── Transcript ────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="rounded-xl overflow-y-auto px-4 py-4 space-y-4"
        style={{
          background: '#2d2c2a',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 400,
          maxHeight: 'calc(100vh - 360px)',
        }}
      >
        {turns.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-[12px]">
            Pick a command above or type one below, then ⌘/Ctrl + Enter to run.
          </div>
        ) : (
          turns.map((t, i) => <TurnView key={i} turn={t} />)
        )}
        {busy && (
          <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
            running…
          </div>
        )}
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-3 flex items-end gap-2"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a slash command, paste a follow-up question, or hit a quick-pick above…"
          disabled={busy}
          rows={1}
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 resize-none outline-none font-mono"
          style={{ maxHeight: 160 }}
        />
        <button
          onClick={() => run(input)}
          disabled={busy || !input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30"
          style={{
            background: 'rgba(167,139,250,0.14)',
            color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.28)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
          Run
          <span className="text-[10px] opacity-60 font-mono">⌘↵</span>
        </button>
      </div>
    </div>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <div className="flex">
        <div
          className="ml-auto max-w-[80%] rounded-xl px-3.5 py-2 text-[13px] whitespace-pre-wrap font-mono"
          style={{
            background: 'rgba(167,139,250,0.10)',
            border: '1px solid rgba(167,139,250,0.20)',
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {turn.chunks.map(c => (c.kind === 'text' ? c.value : '')).join('')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {turn.chunks.map((c, i) => {
        if (c.kind === 'text') {
          return (
            <div key={i} className="text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap">
              {c.value}
            </div>
          )
        }
        if (c.kind === 'tool') {
          return (
            <div
              key={i}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-md inline-flex items-center gap-2 max-w-full"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', color: '#a5b4fc' }}
            >
              <Wrench className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold">{c.name}</span>
              {c.input !== null && c.input !== undefined && (
                <span className="opacity-60 truncate max-w-[60ch]">
                  {typeof c.input === 'string' ? c.input : JSON.stringify(c.input).slice(0, 200)}
                </span>
              )}
            </div>
          )
        }
        if (c.kind === 'error') {
          return (
            <div
              key={i}
              className="text-[12px] font-mono px-3 py-2 rounded-md flex items-start gap-2"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', color: '#fca5a5' }}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap break-words flex-1">{c.value}</pre>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
