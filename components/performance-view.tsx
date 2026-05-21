'use client'

import { useMemo, useState } from 'react'
import { Flame, Hash } from 'lucide-react'
import { OutlierGrid } from '@/components/outlier-grid'
import type { OutlierPost, ViralPatterns } from '@/lib/services/viralPatternsService'

type FilterKind = 'hook_type' | 'content_type' | 'layout' | 'cta_keyword'

interface Filter {
  kind: FilterKind
  value: string
}

const KIND_LABELS: Record<FilterKind, string> = {
  hook_type: 'Hook',
  content_type: 'Content',
  layout: 'Layout',
  cta_keyword: 'CTA',
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

interface PerformanceViewProps {
  outliers: OutlierPost[]
  patterns: ViralPatterns['patterns']
  daysLabel: string
  /** When true, omit the "Top Performers" section header — the parent (e.g.
   *  PerformanceMoversTabs) is already rendering its own segmented-control
   *  header in that slot. The OutlierGrid and Patterns block still render. */
  headerless?: boolean
}

export function PerformanceView({ outliers, patterns, daysLabel, headerless = false }: PerformanceViewProps) {
  const [filter, setFilter] = useState<Filter | null>(null)

  const filteredOutliers = useMemo(() => {
    if (!filter) return outliers
    return outliers.filter(o => o[filter.kind] === filter.value)
  }, [outliers, filter])

  const hasPatterns =
    patterns.top_hook_styles.length > 0 ||
    patterns.best_cta_keywords.length > 0 ||
    patterns.best_content_types.length > 0 ||
    patterns.best_layouts.length > 0

  const toggle = (kind: FilterKind, value: string) => {
    setFilter(prev => (prev?.kind === kind && prev.value === value ? null : { kind, value }))
  }

  return (
    <>
      <section className="space-y-3">
        {!headerless && (
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45">
              Top Performers — {outliers.length} outlier{outliers.length !== 1 ? 's' : ''} (2x+ avg)
            </h2>
          </div>
        )}
        {outliers.length === 0 ? (
          <Empty>No outliers in the last {daysLabel}. Keep posting.</Empty>
        ) : (
          <OutlierGrid
            outliers={filteredOutliers}
            activeFilter={filter ? { kind: KIND_LABELS[filter.kind], value: filter.value } : null}
            onClearFilter={() => setFilter(null)}
          />
        )}
      </section>

      {hasPatterns && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4" style={{ color: '#e1306c' }} />
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45">
              Patterns — from outliers · click any row to filter
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {patterns.top_hook_styles.length > 0 && (
              <PatternCard
                title="Hook Styles"
                accent="#f87171"
                kind="hook_type"
                items={patterns.top_hook_styles.map(h => ({
                  label: h.style,
                  value: h.avg_views,
                  count: h.count,
                }))}
                activeValue={filter?.kind === 'hook_type' ? filter.value : null}
                onSelect={value => toggle('hook_type', value)}
              />
            )}
            {patterns.best_cta_keywords.length > 0 && (
              <PatternCard
                title="CTA Keywords"
                accent="#34d399"
                kind="cta_keyword"
                items={patterns.best_cta_keywords.map(k => ({
                  label: k.keyword,
                  value: k.avg_views,
                  count: k.count,
                }))}
                activeValue={filter?.kind === 'cta_keyword' ? filter.value : null}
                onSelect={value => toggle('cta_keyword', value)}
              />
            )}
            {patterns.best_content_types.length > 0 && (
              <PatternCard
                title="Content Types"
                accent="#6366f1"
                kind="content_type"
                items={patterns.best_content_types.map(t => ({
                  label: t.type,
                  value: t.avg_views,
                  count: t.count,
                }))}
                activeValue={filter?.kind === 'content_type' ? filter.value : null}
                onSelect={value => toggle('content_type', value)}
              />
            )}
            {patterns.best_layouts.length > 0 && (
              <PatternCard
                title="Layouts"
                accent="#f59e0b"
                kind="layout"
                items={patterns.best_layouts.map(l => ({
                  label: l.layout,
                  value: l.avg_views,
                  count: l.count,
                }))}
                activeValue={filter?.kind === 'layout' ? filter.value : null}
                onSelect={value => toggle('layout', value)}
              />
            )}
          </div>
        </section>
      )}
    </>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-6 text-[12px] text-center"
      style={{
        background: '#2d2c2a',
        border: '1px dashed rgba(255,255,255,0.07)',
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      {children}
    </div>
  )
}

interface PatternItem {
  label: string
  value: number
  count: number
}

function PatternCard({
  title,
  accent,
  items,
  activeValue,
  onSelect,
}: {
  title: string
  accent: string
  kind: FilterKind
  items: PatternItem[]
  activeValue: string | null
  onSelect: (value: string) => void
}) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-[11px] uppercase tracking-widest font-semibold text-white/45">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 5).map(item => {
          const isActive = activeValue === item.label
          return (
            <button
              key={item.label}
              onClick={() => onSelect(item.label)}
              className="w-full text-left rounded-lg px-2 py-1.5 space-y-1 transition-colors"
              style={{
                background: isActive ? `${accent}15` : 'transparent',
                border: `1px solid ${isActive ? `${accent}30` : 'transparent'}`,
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className="truncate pr-2"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)' }}
                >
                  {item.label}
                </span>
                <span
                  className="font-mono"
                  style={{ color: isActive ? accent : 'rgba(255,255,255,0.4)' }}
                >
                  {fmt(item.value)}
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    background: accent,
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
