import { ThumbsUp, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import type { CoachInsight, CoachCategory } from '@/lib/services/coachInsightsService'

const CATEGORY_COLOR: Record<CoachCategory, string> = {
  hook: '#f87171',
  content: '#6366f1',
  layout: '#f59e0b',
  day: '#a78bfa',
  mover: '#34d399',
  sales: '#22d3ee',
  cta: '#ec4899',
  saves: '#fbbf24',
  comments: '#60a5fa',
  shares: '#34d399',
}

const CATEGORY_LABEL: Record<CoachCategory, string> = {
  hook: 'HOOK',
  content: 'CONTENT',
  layout: 'LAYOUT',
  day: 'DAY',
  mover: 'GROWTH',
  sales: 'SALES',
  cta: 'CTA',
  saves: 'SAVES',
  comments: 'COMMENTS',
  shares: 'SHARES',
}

interface CoachPanelProps {
  wins: CoachInsight[]
  fixes: CoachInsight[]
  emptyReason: string | null
  winsTitle?: string
  fixesTitle?: string
  winsEmptyText?: string
  fixesEmptyText?: string
}

export function CoachPanel({
  wins,
  fixes,
  emptyReason,
  winsTitle = 'Do more of this',
  fixesTitle = 'Watch out',
  winsEmptyText = 'No clear winners yet — keep tagging posts',
  fixesEmptyText = 'Nothing is underperforming hard right now',
}: CoachPanelProps) {
  if (emptyReason) {
    return (
      <div
        className="rounded-xl px-4 py-5 text-[12px] text-center"
        style={{
          background: '#2d2c2a',
          border: '1px dashed rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        {emptyReason}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Column
        kind="win"
        title={winsTitle}
        icon={<ThumbsUp className="w-3.5 h-3.5" />}
        accent="#34d399"
        items={wins}
        emptyText={winsEmptyText}
      />
      <Column
        kind="fix"
        title={fixesTitle}
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        accent="#fbbf24"
        items={fixes}
        emptyText={fixesEmptyText}
      />
    </div>
  )
}

function Column({
  kind,
  title,
  icon,
  accent,
  items,
  emptyText,
}: {
  kind: 'win' | 'fix'
  title: string
  icon: React.ReactNode
  accent: string
  items: CoachInsight[]
  emptyText: string
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: '#2d2c2a',
        border: `1px solid ${accent}25`,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: accent }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          {icon}
        </span>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <InsightItem key={`${item.category}-${item.label}-${idx}`} item={item} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InsightItem({ item, kind }: { item: CoachInsight; kind: 'win' | 'fix' }) {
  const tint = CATEGORY_COLOR[item.category]
  const Arrow = kind === 'win' ? ArrowUp : ArrowDown
  const arrowColor = kind === 'win' ? '#34d399' : '#f87171'

  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${arrowColor}15`, border: `1px solid ${arrowColor}25`, color: arrowColor }}
      >
        <Arrow className="w-3 h-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[8.5px] uppercase tracking-wide font-semibold px-1 py-0.5 rounded"
            style={{
              background: `${tint}18`,
              color: tint,
              border: `1px solid ${tint}28`,
            }}
          >
            {CATEGORY_LABEL[item.category]}
          </span>
          <span className="text-[12px] font-semibold text-white truncate">{item.label}</span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {item.detail}
        </p>
        <p className="text-[11px] leading-snug mt-1" style={{ color: 'rgba(255,255,255,0.78)' }}>
          {item.action}
        </p>
      </div>
    </li>
  )
}
