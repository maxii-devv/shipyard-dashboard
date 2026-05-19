'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DailyActivity, PostingInsight } from '@/lib/services/postingActivityService'

interface PostingHeatmapProps {
  data: DailyActivity[]
  insight?: PostingInsight
  days?: number
}

function fmtCellDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ACCENT = '#e1306c'

function cellColor(posts: number): string {
  if (posts === 0) return 'rgba(255,255,255,0.04)'
  if (posts === 1) return `${ACCENT}40`
  if (posts === 2) return `${ACCENT}80`
  if (posts === 3) return `${ACCENT}c0`
  return ACCENT
}

export function PostingHeatmap({ data, insight, days = 365 }: PostingHeatmapProps) {
  const [hover, setHover] = useState<{ date: string; posts: number; views: number; x: number; y: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const byDate = new Map(data.map(d => [d.date, d]))

  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() - 1)

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
  const weeks = Math.ceil(totalDays / 7)

  const cells: { date: string; posts: number; views: number; col: number; row: number }[] = []
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start)
      cellDate.setUTCDate(start.getUTCDate() + w * 7 + d)
      if (cellDate > end) continue
      const iso = cellDate.toISOString().slice(0, 10)
      const entry = byDate.get(iso)
      cells.push({
        date: iso,
        posts: entry?.posts ?? 0,
        views: entry?.views ?? 0,
        col: w,
        row: d,
      })
      if (d === 0 && cellDate.getUTCMonth() !== lastMonth) {
        monthLabels.push({ col: w, label: MONTH_NAMES[cellDate.getUTCMonth()] })
        lastMonth = cellDate.getUTCMonth()
      }
    }
  }

  const totalPosts = data.reduce((s, d) => s + d.posts, 0)
  const activeDays = data.filter(d => d.posts > 0).length

  const cellSize = 11
  const gap = 3
  const labelOffset = 24
  const monthLabelHeight = 18
  const svgWidth = labelOffset + weeks * (cellSize + gap)
  const svgHeight = monthLabelHeight + 7 * (cellSize + gap)

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `${ACCENT}20` }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: '#fff' }}>
            Posting Activity
          </h3>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {totalPosts} posts · {activeDays} active days · last {days}d
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {monthLabels.map(({ col, label }) => (
            <text
              key={`${col}-${label}`}
              x={labelOffset + col * (cellSize + gap)}
              y={12}
              fontSize={10}
              fill="rgba(255,255,255,0.4)"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {label}
            </text>
          ))}

          {[1, 3, 5].map(d => (
            <text
              key={d}
              x={0}
              y={monthLabelHeight + d * (cellSize + gap) + cellSize - 2}
              fontSize={9}
              fill="rgba(255,255,255,0.3)"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {WEEK_DAYS[d]}
            </text>
          ))}

          {cells.map(({ date, posts, views, col, row }) => {
            const cellX = labelOffset + col * (cellSize + gap)
            const cellY = monthLabelHeight + row * (cellSize + gap)
            const isHovered = hover?.date === date
            return (
              <rect
                key={date}
                x={cellX}
                y={cellY}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={cellColor(posts)}
                stroke={isHovered ? '#fff' : 'transparent'}
                strokeWidth={isHovered ? 1.2 : 0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect()
                  setHover({
                    date,
                    posts,
                    views,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  })
                }}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
      </div>

      {mounted && hover &&
        createPortal(
          <div
            className="pointer-events-none whitespace-nowrap"
            style={{
              position: 'fixed',
              left: hover.x,
              top: hover.y - 10,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(20,20,20,0.96)',
              border: `1px solid ${ACCENT}40`,
              borderRadius: 6,
              padding: '5px 9px',
              fontSize: 11,
              color: '#fff',
              boxShadow: `0 4px 12px rgba(0,0,0,0.4), 0 0 8px ${ACCENT}30`,
              lineHeight: 1.4,
              zIndex: 9999,
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              {fmtCellDate(hover.date)}
            </div>
            <div style={{ color: ACCENT, fontFamily: 'ui-monospace, monospace', fontWeight: 700, marginTop: 2 }}>
              {hover.posts === 0
                ? 'No posts'
                : `${hover.posts} post${hover.posts === 1 ? '' : 's'}${hover.views > 0 ? ` · ${fmtViews(hover.views)} views` : ''}`}
            </div>
          </div>,
          document.body
        )}

      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            style={{
              width: 11,
              height: 11,
              borderRadius: 2,
              background: cellColor(level),
            }}
          />
        ))}
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>More</span>
      </div>

      {insight && insight.best_dow && (
        <div
          className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <InsightTile
            label="Best day to post"
            value={insight.best_dow.dow_name}
            sub={`${fmtViews(insight.best_dow.avg_views)} avg views · ${insight.best_dow.post_count} post${insight.best_dow.post_count === 1 ? '' : 's'}`}
            tint={ACCENT}
          />
          {insight.worst_dow && insight.worst_dow.dow !== insight.best_dow.dow && (
            <InsightTile
              label="Lowest-yield day"
              value={insight.worst_dow.dow_name}
              sub={`${fmtViews(insight.worst_dow.avg_views)} avg views · ${insight.worst_dow.post_count} post${insight.worst_dow.post_count === 1 ? '' : 's'}`}
              tint="rgba(255,255,255,0.4)"
            />
          )}
          {insight.sample_size_warning && (
            <div
              className="md:col-span-2 text-[10px] px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.14)',
                color: 'rgba(251,191,36,0.85)',
              }}
            >
              {insight.sample_size_warning}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InsightTile({
  label,
  value,
  sub,
  tint,
}: {
  label: string
  value: string
  sub: string
  tint: string
}) {
  return (
    <div
      className="flex items-baseline gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div>
        <p
          className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {label}
        </p>
        <p className="text-[18px] font-bold tracking-tight" style={{ color: tint }}>
          {value}
        </p>
      </div>
      <span className="text-[11px] ml-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {sub}
      </span>
    </div>
  )
}
