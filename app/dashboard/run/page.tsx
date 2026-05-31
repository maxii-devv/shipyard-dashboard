'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Play, Square, Terminal as TerminalIcon, Check, AlertCircle,
  ChevronDown, ChevronRight, Loader2, Wrench,
} from 'lucide-react'

// ── Stream chunks (same /api/run protocol as the old terminal) ──────────────
type Chunk =
  | { kind: 'text'; value: string }
  | { kind: 'tool'; name: string; input: unknown }
  | { kind: 'error'; value: string }

interface Command { cmd: string; hint: string }

type Phase = 'idle' | 'running' | 'done' | 'error'

export default function RunPage() {
  // Commands are scanned from .claude/commands/ on the server — add a skill
  // file and a new button appears here on next load, no code edit needed.
  const [commands, setCommands] = useState<Command[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/commands')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (Array.isArray(d.commands)) setCommands(d.commands)
        else setLoadErr('Could not load commands.')
      })
      .catch(() => { if (!cancelled) setLoadErr('Could not load commands.') })
    return () => { cancelled = true }
  }, [])

  // Split top-level izan commands from the namespaced viral-coach skills so the
  // grid reads as two clear groups.
  const pipelines = commands.filter(c => !c.cmd.includes(':'))
  const coach = commands.filter(c => c.cmd.includes(':'))

  return (
    <div className="p-8 space-y-6" style={{ background: '#262624', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cooknow-indeterminate {
          0%   { left: -40%; width: 40%; }
          50%  { left: 30%;  width: 45%; }
          100% { left: 100%; width: 40%; }
        }
      `}} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TerminalIcon className="w-5 h-5" style={{ color: '#a78bfa' }} />
          COOK NOW
        </h1>
      </div>

      {loadErr && (
        <div
          className="text-[12px] font-mono px-3 py-2 rounded-md flex items-center gap-2"
          style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', color: '#fca5a5' }}
        >
          <AlertCircle className="w-3.5 h-3.5" /> {loadErr}
        </div>
      )}

      {commands.length === 0 && !loadErr && (
        <div className="text-white/30 text-[12px] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading agents…
        </div>
      )}

      {pipelines.length > 0 && (
        <Section title="Pipelines & research">
          {pipelines.map(c => <CommandCard key={c.cmd} command={c} />)}
        </Section>
      )}

      {coach.length > 0 && (
        <Section title="Viral coach">
          {coach.map(c => <CommandCard key={c.cmd} command={c} />)}
        </Section>
      )}

      <p className="text-[11px] text-white/25 max-w-3xl">
        Each click starts a fresh, one-shot run with no typing. Commands that need a pasted URL or a
        mid-run answer (e.g. the scripter) can&apos;t be driven from here — use those from Claude Code directly.
        MCP-dependent steps (Notion, Playwright) need their servers configured in this container or they
        fail with &quot;tool not available&quot;.
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-white/40">
        {title}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {children}
      </div>
    </div>
  )
}

function CommandCard({ command }: { command: Command }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState('')        // live one-line "currently doing X"
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [open, setOpen] = useState(false)          // log expander
  const [elapsed, setElapsed] = useState(0)        // seconds, while running

  const abortRef = useRef<AbortController | null>(null)
  const startRef = useRef<number>(0)

  // Tick the elapsed timer while running.
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase])

  // Abort an in-flight run if the card unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  function pushChunk(c: Chunk) {
    setChunks(prev => {
      // Merge consecutive text so paragraphs land in one block.
      if (c.kind === 'text') {
        const last = prev[prev.length - 1]
        if (last && last.kind === 'text') {
          return [...prev.slice(0, -1), { kind: 'text', value: last.value + c.value }]
        }
      }
      return [...prev, c]
    })
  }

  function processLine(line: string) {
    if (!line.startsWith('<<<')) return
    const end = line.indexOf('>>>')
    if (end === -1) return
    const tag = line.slice(3, end)
    const payload = line.slice(end + 3)
    if (tag === 'session') return // one-shot runs ignore the session id
    if (tag === 'text') {
      pushChunk({ kind: 'text', value: payload })
      const lines = payload.split('\n').map(s => s.trim()).filter(Boolean)
      if (lines.length) setStatus(lines[lines.length - 1].slice(0, 120))
      return
    }
    if (tag === 'tool') {
      try {
        const parsed = JSON.parse(payload)
        const name = String(parsed.name ?? 'tool')
        pushChunk({ kind: 'tool', name, input: parsed.input })
        setStatus(toolStatus(name, parsed.input))
      } catch {
        pushChunk({ kind: 'tool', name: payload, input: null })
        setStatus(payload.slice(0, 120))
      }
      return
    }
    if (tag === 'error') pushChunk({ kind: 'error', value: payload })
  }

  async function run() {
    if (phase === 'running') return
    setPhase('running')
    setStatus('Starting…')
    setChunks([])
    setElapsed(0)
    startRef.current = Date.now()

    const ac = new AbortController()
    abortRef.current = ac
    let sawError = false

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: command.cmd }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        pushChunk({ kind: 'error', value: res.ok ? 'No response body' : `HTTP ${res.status}` })
        setPhase('error')
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
          const raw = pending.slice(0, nl)
          pending = pending.slice(nl + 1)
          if (raw.startsWith('<<<error>>>')) sawError = true
          processLine(raw)
        }
      }
      if (pending.trim()) {
        if (pending.startsWith('<<<error>>>')) sawError = true
        processLine(pending)
      }
      setPhase(sawError ? 'error' : 'done')
      setStatus(sawError ? 'Finished with errors' : 'Done')
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') {
        pushChunk({ kind: 'error', value: 'Stopped by user.' })
        setStatus('Stopped')
      } else {
        pushChunk({ kind: 'error', value: e.message })
        setStatus(e.message.slice(0, 120))
      }
      setPhase('error')
    } finally {
      if (abortRef.current === ac) abortRef.current = null
    }
  }

  function stop() { abortRef.current?.abort() }

  const running = phase === 'running'
  const accent =
    phase === 'done' ? '#34d399'
    : phase === 'error' ? '#fca5a5'
    : '#a78bfa'

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-colors"
      style={{
        background: '#2d2c2a',
        border: `1px solid ${running ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* ── Title row + action button ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[13px] font-semibold text-white/90 truncate">{command.cmd}</div>
          {command.hint && (
            <div className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{command.hint}</div>
          )}
        </div>
        {running ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.14)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.32)' }}
            title="Stop this run (SIGTERM the claude subprocess)"
          >
            <Square className="w-3 h-3 fill-current" /> Stop
          </button>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all"
            style={{ background: 'rgba(167,139,250,0.14)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.28)' }}
          >
            <Play className="w-3 h-3 fill-current" />
            {phase === 'idle' ? 'Run' : 'Run again'}
          </button>
        )}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      {phase !== 'idle' && (
        <div className="space-y-1.5">
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {running ? (
              <span
                className="absolute top-0 h-full rounded-full"
                style={{ background: '#a78bfa', animation: 'cooknow-indeterminate 1.25s ease-in-out infinite' }}
              />
            ) : (
              <span className="absolute top-0 left-0 h-full w-full rounded-full" style={{ background: accent, opacity: 0.85 }} />
            )}
          </div>

          {/* ── Status line ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: running ? 'rgba(255,255,255,0.55)' : accent }}>
            {running && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
            {phase === 'done' && <Check className="w-3 h-3 flex-shrink-0" />}
            {phase === 'error' && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate flex-1">{status}</span>
            {running && <span className="opacity-50 flex-shrink-0">{fmt(elapsed)}</span>}
          </div>
        </div>
      )}

      {/* ── Expandable log ────────────────────────────────────────────── */}
      {chunks.length > 0 && (
        <div>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {open ? 'Hide log' : 'View log'}
          </button>
          {open && (
            <div
              className="mt-2 rounded-lg px-3 py-2.5 space-y-2 overflow-y-auto"
              style={{ background: '#222120', border: '1px solid rgba(255,255,255,0.05)', maxHeight: 360 }}
            >
              {chunks.map((c, i) => <ChunkView key={i} chunk={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChunkView({ chunk }: { chunk: Chunk }) {
  if (chunk.kind === 'text') {
    return <div className="text-[12px] leading-relaxed text-white/80 whitespace-pre-wrap">{chunk.value}</div>
  }
  if (chunk.kind === 'tool') {
    return (
      <div
        className="text-[10.5px] font-mono px-2 py-1 rounded-md inline-flex items-center gap-1.5 max-w-full"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)', color: '#a5b4fc' }}
      >
        <Wrench className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="font-semibold">{chunk.name}</span>
        {chunk.input != null && (
          <span className="opacity-60 truncate max-w-[48ch]">
            {typeof chunk.input === 'string' ? chunk.input : JSON.stringify(chunk.input).slice(0, 160)}
          </span>
        )}
      </div>
    )
  }
  return (
    <div
      className="text-[11px] font-mono px-2.5 py-1.5 rounded-md flex items-start gap-2"
      style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', color: '#fca5a5' }}
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
      <pre className="whitespace-pre-wrap break-words flex-1">{chunk.value}</pre>
    </div>
  )
}

// Friendly one-line status from a tool call.
function toolStatus(name: string, input: unknown): string {
  if (name === 'Bash' && input && typeof input === 'object' && 'command' in input) {
    return `$ ${String((input as { command: unknown }).command).slice(0, 90)}`
  }
  if (input && typeof input === 'object') {
    // Surface the most descriptive field if present.
    const obj = input as Record<string, unknown>
    const key = ['query', 'prompt', 'description', 'url', 'file_path', 'pattern'].find(k => k in obj)
    if (key) return `${name} · ${String(obj[key]).slice(0, 80)}`
  }
  return `Running ${name}…`
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
