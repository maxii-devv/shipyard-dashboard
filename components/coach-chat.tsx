'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Sparkles } from 'lucide-react'
import { useSettings } from '@/components/settings-context'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

// Every question is grounded in data this dashboard actually tracks:
// hooks, CTAs, content types, layouts, outliers, saves vs. views,
// last post, posting cadence, sales vs. reach.
const DATA_QUESTIONS = [
  'Which hook style is actually working for me?',
  'What should I post next based on my last 90 days?',
  'Why are my Bold Statement hooks not converting?',
  "What's driving saves vs. just views right now?",
  'Which of my outliers should I make a follow-up to?',
  'What CTA keyword is pulling the most reach?',
  'Which content type actually drives sales?',
  'Write a script in the IZAN framework off my top outlier',
  'What layout should I use for my next reel?',
  'Is my last post a real win or just reach?',
  'What patterns separate my 5x posts from the rest?',
  'Where am I leaking reach without converting?',
]

const SUGGESTIONS = DATA_QUESTIONS.slice(0, 3)

export function CoachChat({ days }: { days: number }) {
  const { theme, customColor, hoverHint } = useSettings()
  // Mirror the accent applyTheme() pushes to --app-accent so template
  // literals (`${ACCENT}14`) keep working with a real hex value.
  const ACCENT = theme === 'custom' ? customColor : '#a78bfa'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Remember the last hint we auto-filled so a second open with a new hint
  // can overwrite it. We only avoid overwriting text the *user* typed.
  const lastPrefilledRef = useRef<string | null>(null)

  // Cursor-following hint shown while hovering the toggle bar.
  const [hint, setHint] = useState<string | null>(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  function pickQuestion() {
    return DATA_QUESTIONS[Math.floor(Math.random() * DATA_QUESTIONS.length)]
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setError(null)
    setInput('')

    const next: Msg[] = [...messages, { role: 'user', content: q }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setBusy(true)
    scrollToBottom()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, days }),
      })

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? `Request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages(m => {
          const copy = m.slice()
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
        scrollToBottom()
      }
      if (!acc.trim()) {
        setMessages(m => m.slice(0, -1))
        setError('Empty response from Claude.')
      }
    } catch (e) {
      setMessages(m => m.slice(0, -1))
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      scrollToBottom()
    }
  }

  // Keep the floating hint on-screen near the cursor.
  const tipW = 300
  const tipLeft =
    typeof window !== 'undefined' && cursor.x + 22 + tipW > window.innerWidth
      ? cursor.x - tipW - 14
      : cursor.x + 22

  return (
    <section className="space-y-3">
      <button
        onClick={() => {
          // Opening with a hover hint visible → prefill it so the user can
          // hit Enter / edit instead of retyping. Safe to overwrite when the
          // textarea is empty OR still holds the previously auto-filled hint
          // (re-opening with a new hint should replace, not stick). Anything
          // the user actually typed is left alone.
          if (!open && hoverHint && hint) {
            const current = input
            const overwritable =
              current.trim() === '' || current === lastPrefilledRef.current
            if (overwritable) {
              setInput(hint)
              lastPrefilledRef.current = hint
            }
          }
          setOpen(o => {
            const next = !o
            if (next) requestAnimationFrame(() => textareaRef.current?.focus())
            return next
          })
        }}
        aria-expanded={open}
        onMouseEnter={() => hoverHint && setHint(pickQuestion())}
        onMouseMove={e => setCursor({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHint(null)}
        className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all"
        style={{
          background: open ? `${ACCENT}14` : '#2d2c2a',
          border: `1px solid ${open ? `${ACCENT}30` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
          <span
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: open ? ACCENT : 'rgba(255,255,255,0.55)' }}
          >
            Ask the Coach
          </span>
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {open ? 'Hide' : 'Ask Claude anything about your content →'}
        </span>
      </button>

      {mounted &&
        hint &&
        !open &&
        hoverHint &&
        createPortal(
          <div
            className="fixed z-50 pointer-events-none rounded-lg px-3 py-2 text-[12px] leading-snug shadow-lg"
            style={{
              left: tipLeft,
              top: cursor.y + 20,
              maxWidth: tipW,
              background: '#1a1626',
              border: `1px solid ${ACCENT}40`,
              color: 'rgba(255,255,255,0.9)',
              boxShadow: `0 6px 22px rgba(0,0,0,0.5), 0 0 14px ${ACCENT}22`,
            }}
          >
            <span
              className="block text-[9px] uppercase tracking-widest font-semibold mb-1"
              style={{ color: ACCENT }}
            >
              Try asking
            </span>
            {hint}
          </div>,
          document.body
        )}

      {open && (
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ background: '#21201e', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            ref={scrollRef}
            className="px-5 py-5 space-y-4 overflow-y-auto"
            style={{ maxHeight: 440 }}
          >
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Connected to your live dashboard data + brand voice. Ask anything.
                </p>
                <div className="flex flex-col gap-2 items-start">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[12px] text-left rounded-lg px-3 py-2 transition-all"
                      style={{
                        background: `${ACCENT}12`,
                        border: `1px solid ${ACCENT}25`,
                        color: ACCENT,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span
                    className="text-[9px] uppercase tracking-widest font-semibold"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {m.role === 'user' ? 'Izan' : 'Coach'}
                  </span>
                  <div
                    className="text-[13px] leading-relaxed rounded-xl px-4 py-3 whitespace-pre-wrap break-words"
                    style={{
                      maxWidth: '88%',
                      background: m.role === 'user' ? `${ACCENT}14` : '#34332f',
                      border: `1px solid ${m.role === 'user' ? `${ACCENT}28` : 'rgba(255,255,255,0.07)'}`,
                      color: m.role === 'user' ? '#e9e9e9' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {m.content ||
                      (busy && i === messages.length - 1 ? (
                        <span
                          className="inline-block w-1.5 h-3.5 align-text-bottom animate-pulse"
                          style={{ background: ACCENT }}
                        />
                      ) : (
                        ''
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {error && (
            <div
              className="mx-5 mb-3 rounded-lg px-3 py-2 text-[12px]"
              style={{
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.25)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault()
              send(input)
            }}
            className="flex gap-2 px-5 py-4"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#1c1b1a',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="Ask about hooks, scripts, what to post next…"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              disabled={busy}
              className="flex-1 resize-none rounded-lg px-3 py-2.5 text-[13px] outline-none disabled:opacity-60"
              style={{
                background: '#34332f',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e9e9e9',
                maxHeight: 140,
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="self-end flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: ACCENT, color: '#262624' }}
            >
              {busy ? '…' : <Send className="w-3.5 h-3.5" />}
              {busy ? '' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
