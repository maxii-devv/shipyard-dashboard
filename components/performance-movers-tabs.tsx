'use client'

import { useState } from 'react'
import { Flame, TrendingUp } from 'lucide-react'
import { PerformanceView } from '@/components/performance-view'
import { MoverGrid } from '@/components/mover-grid'
import type { OutlierPost, ViralPatterns } from '@/lib/services/viralPatternsService'
import type { TopMover, HistoryPoint } from '@/lib/services/growthService'

// Segmented control that swaps the dashboard's Top Performers and Top Movers
// views into a single slot. Modeled on coach-tabs.tsx: the section header on
// the left changes per active tab, the pill-group on the right toggles. The
// Patterns grid (which is derived from outliers) lives inside PerformanceView
// and only renders when "Top Performers" is active.

type TabKey = 'performers' | 'movers'
type Mover = TopMover & { history: HistoryPoint[] }

interface PerformanceMoversTabsProps {
  outliers: OutlierPost[]
  patterns: ViralPatterns['patterns']
  movers: Mover[]
  daysLabel: string
  moversWindow: number
}

const TABS: {
  key: TabKey
  label: string
  accent: string
  icon: React.ElementType
}[] = [
  { key: 'performers', label: 'Top Performers', accent: '#f59e0b', icon: Flame },
  { key: 'movers', label: 'Top Movers', accent: '#34d399', icon: TrendingUp },
]

export function PerformanceMoversTabs({
  outliers,
  patterns,
  movers,
  daysLabel,
  moversWindow,
}: PerformanceMoversTabsProps) {
  const [active, setActive] = useState<TabKey>('performers')
  const current = TABS.find(t => t.key === active)!
  const Icon = current.icon

  const subtitle =
    active === 'performers'
      ? `${outliers.length} outlier${outliers.length !== 1 ? 's' : ''} (2x+ avg) · last ${daysLabel}`
      : `Biggest view growth in the last ${moversWindow}d`

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: current.accent }} />
          <div className="min-w-0">
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45 leading-none">
              {current.label}
            </h2>
            <p
              className="text-[10px] mt-1 leading-none truncate"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {TABS.map(tab => {
            const isActive = tab.key === active
            const TabIcon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                style={{
                  background: isActive ? `${tab.accent}18` : 'transparent',
                  color: isActive ? tab.accent : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${isActive ? `${tab.accent}30` : 'transparent'}`,
                  boxShadow: isActive ? `0 0 14px ${tab.accent}25` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                }}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'performers' ? (
        <PerformanceView outliers={outliers} patterns={patterns} daysLabel={daysLabel} headerless />
      ) : movers.length === 0 ? (
        <div
          className="rounded-xl px-4 py-6 text-[12px] text-center"
          style={{
            background: '#2d2c2a',
            border: '1px dashed rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          No view growth recorded yet. Snapshots run daily at 06:00 UTC (Vercel
          Hobby plan — Pro unlocks 6h sync) — come back in 24h for day-over-day
          deltas.
        </div>
      ) : (
        <MoverGrid movers={movers} />
      )}
    </section>
  )
}
