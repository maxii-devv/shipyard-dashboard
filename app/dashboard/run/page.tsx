'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Play, Square, Terminal as TerminalIcon, Check, AlertCircle,
  ChevronDown, ChevronRight, Loader2, Wrench,
  Instagram, LogIn, RefreshCw,
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

      <IgSessionCard />

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
        The Playwright browser runs server-side in this container; Instagram pipelines need the dummy
        account logged in (above). Steps that save to Notion still need the Notion MCP server configured.
      </p>
    </div>
  )
}

// ── Instagram session ───────────────────────────────────────────────────────
// One-time login for the server-side Playwright browser. The dummy account's
// session persists in the /data/pw-profile volume, so this normally only needs
// doing once (or when IG expires the session). Credentials are POSTed to
// /api/ig-login and typed into IG by the server browser; the password is never
// echoed back to this page.
type IgState = 'unknown' | 'checking' | 'in' | 'out'
type LoginPhase = 'idle' | 'running' | 'done' | 'error'

function IgSessionCard() {
  const [state, setState] = useState<IgState>('unknown')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<LoginPhase>('idle')
  const [steps, setSteps] = useState<string[]>([])
  const [result, setResult] = useState<string>('')   // the LOGIN_RESULT: line
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  async function checkStatus() {
    setState('checking')
    try {
      const r = await fetch('/api/ig-login/status')
      const d = await r.json()
      setState(d.loggedIn === true ? 'in' : d.loggedIn === false ? 'out' : 'unknown')
    } catch {
      setState('unknown')
    }
  }

  async function login() {
    if (phase === 'running' || !username || !password) return
    setPhase('running')
    setSteps([])
    setResult('')
    const ac = new AbortController()
    abortRef.current = ac
    let finalLine = ''
    let sawError = false
    try {
      const res = await fetch('/api/ig-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        setResult(`LOGIN_RESULT: FAIL: HTTP ${res.status}`)
        setPhase('error')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      const handle = (raw: string) => {
        if (!raw.startsWith('<<<')) return
        const end = raw.indexOf('>>>')
        if (end === -1) return
        const tag = raw.slice(3, end)
        const payload = raw.slice(end + 3)
        if (tag === 'error') { sawError = true; setSteps(p => [...p, `⚠ ${payload}`]); return }
        if (tag === 'status') {
          const m = payload.match(/LOGIN_RESULT:\s*(.+)/)
          if (m) finalLine = m[1].trim()
          const clean = payload.replace(/LOGIN_RESULT:.*/, '').trim()
          if (clean) setSteps(p => [...p, clean].slice(-8))
        }
      }
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        pending += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = pending.indexOf('\n')) !== -1) {
          handle(pending.slice(0, nl)); pending = pending.slice(nl + 1)
        }
      }
      if (pending.trim()) handle(pending)

      setResult(finalLine || (sawError ? 'FAIL: no result' : 'No result returned'))
      const ok = /^(OK|ALREADY)/i.test(finalLine)
      setPhase(ok ? 'done' : 'error')
      if (ok) setState('in')
    } catch (err) {
      const e = err as Error
      setResult(e.name === 'AbortError' ? 'Cancelled' : `FAIL: ${e.message}`)
      setPhase('error')
    } finally {
      if (abortRef.current === ac) abortRef.current = null
    }
  }

  const badge =
    state === 'in' ? { t: 'Logged in', c: '#34d399', bg: 'rgba(52,211,153,0.12)' }
    : state === 'out' ? { t: 'Logged out', c: '#fca5a5', bg: 'rgba(239,68,68,0.12)' }
    : state === 'checking' ? { t: 'Checking…', c: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
    : { t: 'Unknown', c: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)' }

  const challenge = /^CHALLENGE/i.test(result)
  const success = /^(OK|ALREADY)/i.test(result)
  const resultColor = success ? '#34d399' : challenge ? '#fbbf24' : result ? '#fca5a5' : 'inherit'

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#2d2c2a', border: '1px solid rgba(236,72,153,0.18)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Instagram className="w-4 h-4 flex-shrink-0" style={{ color: '#ec4899' }} />
          <span className="font-semibold text-[13px] text-white/90">Instagram session</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ color: badge.c, background: badge.bg }}
          >
            {badge.t}
          </span>
        </div>
        <button
          onClick={checkStatus}
          disabled={state === 'checking'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium flex-shrink-0 disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
          title="Check whether the dummy account is logged in (launches the server browser)"
        >
          <RefreshCw className={`w-3 h-3 ${state === 'checking' ? 'animate-spin' : ''}`} /> Check
        </button>
      </div>

      <p className="text-[11px] text-white/40 leading-relaxed">
        Log the dummy Instagram account in once — the session persists in the container, so the
        IG scraping pipelines can browse. The password is typed into Instagram by the server and is
        never shown or stored here.
      </p>

      {/* ── Login form ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          autoComplete="off"
          placeholder="dummy username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={phase === 'running'}
          className="text-[12px] font-mono px-2.5 py-1.5 rounded-lg flex-1 min-w-[140px] outline-none disabled:opacity-50"
          style={{ background: '#222120', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
        />
        <input
          type="password"
          autoComplete="off"
          placeholder="dummy password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={phase === 'running'}
          className="text-[12px] font-mono px-2.5 py-1.5 rounded-lg flex-1 min-w-[140px] outline-none disabled:opacity-50"
          style={{ background: '#222120', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
        />
        <button
          onClick={login}
          disabled={phase === 'running' || !username || !password}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0 disabled:opacity-40"
          style={{ background: 'rgba(236,72,153,0.16)', color: '#f9a8d4', border: '1px solid rgba(236,72,153,0.32)' }}
        >
          {phase === 'running'
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Logging in…</>
            : <><LogIn className="w-3 h-3" /> Log in</>}
        </button>
      </div>

      {/* ── Live steps + result ─────────────────────────────────────────── */}
      {(steps.length > 0 || result) && (
        <div
          className="rounded-lg px-3 py-2 space-y-1"
          style={{ background: '#222120', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {steps.map((s, i) => (
            <div key={i} className="text-[11px] font-mono text-white/50 truncate">{s}</div>
          ))}
          {result && (
            <div className="text-[12px] font-mono font-semibold pt-1" style={{ color: resultColor }}>
              {result}
            </div>
          )}
          {challenge && (
            <div className="text-[11px] text-amber-300/80 leading-relaxed pt-1">
              Instagram asked for a verification code. Approve the login from the dummy account&apos;s
              email / app, then click <span className="font-semibold">Check</span>. If it keeps
              challenging, the account may need a manual first login from a normal browser.
            </div>
          )}
        </div>
      )}
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
