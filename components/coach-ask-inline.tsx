'use client'

// Compact Ask-the-Coach panel for the dashboard's Coach row. Same /api/chat
// backend as components/coach-chat.tsx, but always visible: input pinned at
// the bottom, streaming replies grow above it, and three suggestion chips
// fill the middle until the first question is asked. The richer CoachChat
// (collapsible bar + cursor-following hover hint) is still in the repo if a
// fuller experience is ever wanted again, but is no longer mounted.

import { useRef, useState } from 'react'
import { RefreshCw, Send, Sparkles } from 'lucide-react'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

// Every question is grounded in data this dashboard actually tracks: hooks,
// CTAs, content types, layouts, outliers, saves vs. views, last post, posting
// cadence, sales vs. reach. Refreshing re-picks any three.
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

function pickThree(exclude?: readonly string[]): string[] {
  // Re-pick three at random, biased away from the current trio so the refresh
  // button visibly changes the suggestions instead of occasionally returning
  // the same set.
  const pool = exclude && exclude.length > 0
    ? DATA_QUESTIONS.filter(q => !exclude.includes(q))
    : DATA_QUESTIONS
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export function CoachAskInline({ days, accent }: { days: number; accent: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Seeded with the first three from the pool so the server-rendered HTML
  // matches the client's first paint (no hydration mismatch from Math.random
  // at module level). Refresh swaps in three random ones from the rest.
  const [suggestions, setSuggestions] = useState<string[]>(() => DATA_QUESTIONS.slice(0, 3))
  const scrollRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      className="rounded-xl p-4 flex flex-col h-full"
      style={{ background: '#2d2c2a', border: `1px solid ${accent}25` }}
    >
      {/* Header — matches the wins / fixes column headers. The refresh
          button re-rolls the suggestion chips below; it's still rendered
          (just lower contrast) once the user has started chatting because
          the suggestions hide. */}
      <div
        className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest font-semibold mb-3"
        style={{ color: accent }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          Ask the Coach
        </span>
        <button
          type="button"
          onClick={() => setSuggestions(prev => pickThree(prev))}
          title="Refresh suggestions"
          aria-label="Refresh suggestions"
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: `${accent}aa`, border: `1px solid ${accent}25` }}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Message log — only takes space when something has been said. The
          min-h-0 lets flex children actually scroll when the grid stretches
          the card. */}
      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1"
          style={{ minHeight: 0, maxHeight: 260 }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="text-[12px] leading-relaxed rounded-lg px-3 py-2 whitespace-pre-wrap break-words"
                style={{
                  maxWidth: '92%',
                  background: m.role === 'user' ? `${accent}14` : '#34332f',
                  border: `1px solid ${m.role === 'user' ? `${accent}28` : 'rgba(255,255,255,0.07)'}`,
                  color: m.role === 'user' ? '#e9e9e9' : 'rgba(255,255,255,0.85)',
                }}
              >
                {m.content ||
                  (busy && i === messages.length - 1 ? (
                    <span
                      className="inline-block w-1.5 h-3.5 align-text-bottom animate-pulse"
                      style={{ background: accent }}
                    />
                  ) : (
                    ''
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion chips — only while the conversation is empty. Click sends
          straight to the model so the user doesn't need to retype. */}
      {messages.length === 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
              className="text-[12px] text-left rounded-lg px-3 py-2 transition-all disabled:opacity-50"
              style={{
                background: `${accent}12`,
                border: `1px solid ${accent}25`,
                color: accent,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          className="mb-2 rounded-lg px-3 py-2 text-[11px]"
          style={{
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.25)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {/* mt-auto keeps the input glued to the bottom whether or not there's
          any chat history above. */}
      <form
        onSubmit={e => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 mt-auto"
      >
        <input
          type="text"
          value={input}
          placeholder="Ask me anything about izan content"
          onChange={e => setInput(e.target.value)}
          disabled={busy}
          className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none disabled:opacity-60"
          style={{
            background: '#34332f',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e9e9e9',
          }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex items-center justify-center rounded-lg w-9 h-9 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: accent, color: '#262624' }}
        >
          {busy ? <span className="text-[10px]">…</span> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  )
}
