'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Square, Terminal as TerminalIcon, RotateCw, Wrench, AlertCircle } from 'lucide-react'

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

interface Command { cmd: string; hint: string }

export default function RunPage() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pickerIndex, setPickerIndex] = useState(0)
  // Commands are scanned from .claude/commands/ on the server — add a skill
  // file and it appears here on next page load, no code edit needed.
  const [commands, setCommands] = useState<Command[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/commands')
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.commands)) setCommands(d.commands) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // AbortController for the in-flight /api/run fetch. abort() triggers the
  // server's `cancel()` handler which SIGTERMs the claude subprocess.
  const abortRef = useRef<AbortController | null>(null)

  // Slash picker: show when input starts with `/` and we're not running.
  // Match by substring against the bare command text so `viral` finds both
  // `/izan-viral-spotter` and `/viral-coach-skills:*`.
  const pickerMatches = useMemo(() => {
    if (!input.startsWith('/')) return []
    const query = input.slice(1).toLowerCase().trim()
    if (!query) return commands
    return commands.filter(c =>
      c.cmd.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query)
    )
  }, [input, commands])
  const showPicker = !busy && input.startsWith('/') && pickerMatches.length > 0

  // Clamp the highlighted index whenever the match list changes.
  useEffect(() => {
    setPickerIndex(i => Math.min(Math.max(0, i), Math.max(0, pickerMatches.length - 1)))
  }, [pickerMatches.length])

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

    // Fresh AbortController for this turn so Stop can hard-cancel.
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
        signal: ac.signal,
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
      // AbortError is the expected outcome of clicking Stop — surface a
      // dedicated message so the user sees their kill landed.
      const e = err as Error
      if (e.name === 'AbortError') {
        appendChunk({ kind: 'error', value: 'Stopped by user.' })
      } else {
        appendChunk({ kind: 'error', value: e.message })
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      setBusy(false)
      scrollToBottom()
    }
  }

  function stop() {
    abortRef.current?.abort()
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

  // Cmd+Enter / Ctrl+Enter to run. Picker nav (Up/Down/Enter/Tab/Escape)
  // takes precedence when the slash picker is open — Enter fills the input
  // (no auto-run), matching Claude Code's own picker UX.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPickerIndex(i => (i + 1) % pickerMatches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPickerIndex(i => (i - 1 + pickerMatches.length) % pickerMatches.length)
        return
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        const pick = pickerMatches[pickerIndex]
        if (pick) setInput(pick.cmd + ' ')
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const pick = pickerMatches[pickerIndex]
        if (pick) setInput(pick.cmd + ' ')
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setInput('')
        return
      }
    }
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
            Pick a command below or type one in the input — ⌘/Ctrl + Enter to run.
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
      <div className="relative">
        {/* Slash-command picker, positioned above the input. Click an item
            to fill the textarea (does NOT auto-run — user must hit ⌘↵). */}
        {showPicker && (
          <div
            className="absolute left-0 right-0 bottom-full mb-2 rounded-lg overflow-hidden z-10"
            style={{ background: '#1f1e1d', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          >
            <div className="text-[12px] text-white/40 px-3 pt-2 pb-1">
              Slash Commands
            </div>
            <div className="max-h-[280px] overflow-y-auto pb-1">
              {pickerMatches.map((c, i) => {
                const active = i === pickerIndex
                return (
                  <button
                    key={c.cmd}
                    type="button"
                    onMouseEnter={() => setPickerIndex(i)}
                    onMouseDown={e => {
                      // mousedown (not click) so the textarea doesn't lose
                      // focus before we set the value.
                      e.preventDefault()
                      setInput(c.cmd + ' ')
                      textareaRef.current?.focus()
                    }}
                    className="w-full text-left px-3 py-1.5 transition-colors"
                    style={{
                      background: active ? '#1e4a86' : 'transparent',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.85)',
                    }}
                    title={c.hint}
                  >
                    <span className="font-mono text-[13px] font-semibold">{c.cmd}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-3 flex items-end gap-2"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type / for commands, or paste a follow-up question. ⌘/Ctrl + Enter to run."
            disabled={busy}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 resize-none outline-none font-mono"
            style={{ maxHeight: 160 }}
          />
          {busy ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: 'rgba(239,68,68,0.14)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.32)',
              }}
              title="Hard kill the running command (SIGTERM the claude subprocess)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => run(input)}
              disabled={!input.trim()}
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
          )}
        </div>
      </div>

      {/* ── Command reference (below the input, read-only) ──────────────── */}
      {turns.length === 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[10px] uppercase tracking-widest font-semibold text-white/40 mb-3">
            Available commands
          </div>
          <div className="flex flex-col gap-1">
            {commands.map(c => (
              <div key={c.cmd} className="flex items-baseline gap-3 py-1">
                <span className="font-mono text-[12px] text-white/85 flex-shrink-0">{c.cmd}</span>
                <span className="text-[11px] text-white/40 truncate">{c.hint}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/30 mt-3">
            Type a command into the input above to run it. MCP-dependent commands (Notion, Playwright) need their servers configured in this container — they will fail with &quot;tool not available&quot; until then.
          </p>
        </div>
      )}
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
