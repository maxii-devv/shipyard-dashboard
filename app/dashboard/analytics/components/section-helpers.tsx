'use client'

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { fmtNum, IG_TYPE_LABELS, type SortKey } from './analytics-types'

export function SectionHeader({ icon: Icon, iconBg, title, count, countLabel }: {
  icon: React.ElementType; iconBg: string; title: string; count?: number; countLabel?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {count !== undefined && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {count} {countLabel ?? 'posts'} in period
          </p>
        )}
      </div>
    </div>
  )
}

export function EmptySection({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: '#2d2c2a', border: '1px dashed rgba(255,255,255,0.06)' }}
    >
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
    </div>
  )
}

export function TypeBadge({ type }: { type: string }) {
  const label = IG_TYPE_LABELS[type] ?? type
  const colors: Record<string, string> = {
    Carousel: '#3b82f6', Video: '#a855f7', Photo: '#10b981', Reel: '#f59e0b',
  }
  const color = colors[label] ?? '#888'
  return (
    <span
      className="text-[9px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#60a5fa' : 'rgba(255,255,255,0.3)'
  return (
    <span
      className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}18`, color }}
    >
      {score}
    </span>
  )
}

export function SortControl({ sort, setSort }: { sort: SortKey; setSort: (s: SortKey) => void }) {
  const opts: { key: SortKey; label: string }[] = [
    { key: 'engagement', label: 'Engagement %' },
    { key: 'reach', label: 'Reach' },
    { key: 'likes', label: 'Likes' },
    { key: 'saved', label: 'Saves' },
    { key: 'comments', label: 'Comments' },
  ]
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-white/20 mr-1">Sort:</span>
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => setSort(o.key)}
          className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
          style={{
            background: sort === o.key ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: sort === o.key ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ChangeBadge({ current, previous, suffix = '', invert = false }: {
  current: number; previous: number; suffix?: string; invert?: boolean
}) {
  if (previous === 0 && current === 0) return <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100
  const isUp = pct > 0
  const isFlat = Math.abs(pct) < 1
  const positive = invert ? !isUp : isUp

  if (isFlat) return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
    >
      <Minus className="w-2.5 h-2.5" /> 0%{suffix}
    </span>
  )

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{
        background: positive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        color: positive ? '#34d399' : '#f87171',
        border: `1px solid ${positive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
      }}
    >
      {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {Math.abs(Math.round(pct))}%{suffix}
    </span>
  )
}

export { fmtNum }
