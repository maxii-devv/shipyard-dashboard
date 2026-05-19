'use client'

import { useState } from 'react'
import { DollarSign, Eye, Sparkles } from 'lucide-react'
import { CoachPanel } from '@/components/coach-panel'
import type { CoachOutput } from '@/lib/services/coachInsightsService'

type TabKey = 'sales' | 'views'

interface CoachTabsProps {
  salesCoach: CoachOutput
  viewsCoach: CoachOutput
  daysLabel: string
}

const TABS: { key: TabKey; label: string; accent: string; icon: React.ElementType; subtitle: string }[] = [
  {
    key: 'sales',
    label: 'Sales Coach',
    accent: '#22d3ee',
    icon: DollarSign,
    subtitle: 'What drives sales, saves, comments, and DMs',
  },
  {
    key: 'views',
    label: 'Views Coach',
    accent: '#a78bfa',
    icon: Eye,
    subtitle: 'What gets the most reach and growth',
  },
]

export function CoachTabs({ salesCoach, viewsCoach, daysLabel }: CoachTabsProps) {
  const [active, setActive] = useState<TabKey>('sales')
  const current = TABS.find(t => t.key === active)!
  const data = active === 'sales' ? salesCoach : viewsCoach

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: current.accent }} />
          <div className="min-w-0">
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45 leading-none">
              Coach — {daysLabel}
            </h2>
            <p
              className="text-[10px] mt-1 leading-none truncate"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {current.subtitle}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {TABS.map(tab => {
            const isActive = tab.key === active
            const Icon = tab.icon
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
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'sales' ? (
        <CoachPanel
          wins={data.wins}
          fixes={data.fixes}
          emptyReason={data.empty_reason}
          winsTitle="Drives sales / DMs / intent"
          fixesTitle="Looks like reach, not revenue"
          winsEmptyText="No sales-converting category yet — tick 'Drove Sales' on a few posts in Notion"
          fixesEmptyText="Nothing is leaking reach without converting"
        />
      ) : (
        <CoachPanel
          wins={data.wins}
          fixes={data.fixes}
          emptyReason={data.empty_reason}
        />
      )}
    </section>
  )
}
