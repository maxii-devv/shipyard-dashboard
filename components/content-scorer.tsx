'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

interface ScoreResult {
  overall: number
  summary: string
  top_tip: string
  [key: string]: number | string
}

const SCORE_COLOR = (n: number) => {
  if (n >= 8) return '#10b981'  // green
  if (n >= 6) return '#f59e0b'  // amber
  return '#ef4444'              // red
}

const OVERALL_COLOR = (n: number) => {
  if (n >= 75) return '#10b981'
  if (n >= 55) return '#f59e0b'
  return '#ef4444'
}

const DIMENSION_LABELS: Record<string, string> = {
  hook: 'Hook',
  clarity: 'Clarity',
  value: 'Value',
  retention: 'Retention',
  cta: 'CTA',
  seo: 'SEO',
  structure: 'Structure',
  authenticity: 'Authenticity',
  engagement: 'Engagement',
  pacing: 'Pacing',
  trend: 'Trend',
  hashtags: 'Hashtags',
}

interface ContentScorerProps {
  content: string
  type: 'script' | 'description' | 'linkedin_post' | 'reel_script' | 'caption'
  label?: string
}

export function ContentScorer({ content, type, label = 'Score with AI' }: ContentScorerProps) {
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const handleScore = async () => {
    if (!content?.trim()) return
    setLoading(true)
    setError(null)
    setScore(null)
    try {
      const res = await fetch('/api/content/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Scoring failed')
      else { setScore(data.score); setExpanded(true) }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const dimensions = score
    ? Object.entries(score).filter(([k]) => k !== 'overall' && k !== 'summary' && k !== 'top_tip' && typeof score[k] === 'number') as [string, number][]
    : []

  return (
    <div className="space-y-2">
      {!score ? (
        <button
          onClick={handleScore}
          disabled={loading || !content?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium transition-all disabled:opacity-40"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseOver={e => !loading && content?.trim() && (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner" style={{ width: '12px', height: '12px' }} />
              Scoring...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              {label}
            </>
          )}
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#21201e' }}>
          {/* Header */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>AI Score</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Overall score pill */}
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                style={{ background: `${OVERALL_COLOR(score.overall)}15`, color: OVERALL_COLOR(score.overall) }}
              >
                {score.overall}/100
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />}
            </div>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Dimension bars */}
              <div className="space-y-1.5">
                {dimensions.map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] w-20 flex-shrink-0 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {DIMENSION_LABELS[key] ?? key}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${val * 10}%`, background: SCORE_COLOR(val) }}
                      />
                    </div>
                    <span className="text-[10px] w-4 text-right flex-shrink-0 font-mono" style={{ color: SCORE_COLOR(val) }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {score.summary && (
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{score.summary}</p>
              )}

              {/* Top tip */}
              {score.top_tip && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(245,158,11,0.7)' }}>Top improvement</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{score.top_tip}</p>
                </div>
              )}

              {/* Re-score */}
              <button onClick={handleScore} disabled={loading} className="text-[10px] flex items-center gap-1 transition-colors disabled:opacity-40" style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                <Sparkles className="w-3 h-3" /> Re-score
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/8 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
