'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Tooltip } from '@/components/ui/tooltip'

interface ActivityDay {
  total: number
  instagram: number
  linkedin: number
  youtube: number
}

interface PostingActivityData {
  activity: Record<string, ActivityDay>
  streaks: { current: number; longest: number; postedToday: boolean }
  totals: { instagram: number; linkedin: number; youtube: number; total: number; activeDays: number }
  errors?: string[]
}

interface GridDay {
  date: string
  count: number
  instagram: number
  linkedin: number
  youtube: number
  future: boolean
}

const CELL_SIZE = 12
const GAP = 3
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getColor(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.04)'
  if (count === 1) return 'rgba(34,197,94,0.3)'
  if (count === 2) return 'rgba(34,197,94,0.55)'
  return 'rgba(34,197,94,0.85)'
}

function formatTooltip(day: GridDay): string {
  if (day.future) return ''
  const d = new Date(day.date + 'T12:00:00')
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (day.count === 0) return `${label}: No posts`
  const parts: string[] = []
  if (day.instagram > 0) parts.push(`${day.instagram} IG`)
  if (day.linkedin > 0) parts.push(`${day.linkedin} LI`)
  if (day.youtube > 0) parts.push(`${day.youtube} YT`)
  return `${label}: ${day.count} post${day.count !== 1 ? 's' : ''} (${parts.join(', ')})`
}

function buildGrid(activity: Record<string, ActivityDay>, days = 365): { weeks: GridDay[][]; monthLabels: { label: string; col: number }[] } {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  const dayOfWeek = start.getDay()
  start.setDate(start.getDate() - dayOfWeek)

  const weeks: GridDay[][] = []
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  let currentWeek: GridDay[] = []

  const cursor = new Date(start)
  cursor.setHours(12, 0, 0, 0)

  while (cursor <= today || currentWeek.length > 0) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const isFuture = dateStr > todayStr
    const a = activity[dateStr]

    currentWeek.push({
      date: dateStr,
      count: isFuture ? 0 : (a?.total ?? 0),
      instagram: isFuture ? 0 : (a?.instagram ?? 0),
      linkedin: isFuture ? 0 : (a?.linkedin ?? 0),
      youtube: isFuture ? 0 : (a?.youtube ?? 0),
      future: isFuture,
    })

    if (currentWeek.length === 1) {
      const m = cursor.getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS_SHORT[m], col: weeks.length })
        lastMonth = m
      }
    }

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }

    cursor.setDate(cursor.getDate() + 1)
    if (isFuture && currentWeek.length === 0) break
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  return { weeks, monthLabels }
}

function getLast7Days(activity: Record<string, ActivityDay>): { date: string; dayLabel: string; posted: boolean }[] {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const days: { date: string; dayLabel: string; posted: boolean }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      date: dateStr,
      dayLabel: DAY_LABELS_SHORT[d.getDay()],
      posted: (activity[dateStr]?.total ?? 0) > 0,
    })
  }

  return days
}

function getStreakWarning(streaks: { current: number; postedToday: boolean }): { message: string; urgency: 'low' | 'medium' | 'high' } | null {
  if (streaks.postedToday || streaks.current === 0) return null

  const hour = new Date().getHours()

  if (hour >= 22) {
    return { message: `Post now or lose your ${streaks.current}-day streak!`, urgency: 'high' }
  }
  if (hour >= 18) {
    return { message: `Don't forget to post today — ${streaks.current}-day streak on the line`, urgency: 'medium' }
  }
  if (hour >= 12) {
    return { message: `No posts yet today — ${streaks.current}-day streak active`, urgency: 'low' }
  }
  return null
}

function FlameIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="flame-outer" x1="32" y1="56" x2="32" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="flame-inner" x1="32" y1="56" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#fcd34d" />
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <path
        d="M32 4C32 4 16 20 16 36C16 44.8 23.2 52 32 52C40.8 52 48 44.8 48 36C48 20 32 4 32 4Z"
        fill="url(#flame-outer)"
      />
      <path
        d="M32 4C32 4 12 22 12 38C12 49.04 20.96 58 32 58C43.04 58 52 49.04 52 38C52 22 32 4 32 4Z"
        fill="url(#flame-outer)"
        opacity="0.6"
      />
      {/* Inner flame */}
      <path
        d="M32 24C32 24 24 32 24 40C24 44.4 27.6 48 32 48C36.4 48 40 44.4 40 40C40 32 32 24 32 24Z"
        fill="url(#flame-inner)"
      />
    </svg>
  )
}

function Skeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? '' : 'flex gap-4'}>
      <div
        className="rounded-xl p-5 flex-1"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="h-4 w-32 rounded bg-white/5 animate-pulse mb-4" />
        <div className="flex gap-[3px]">
          {Array.from({ length: compact ? 14 : 30 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-[2px] animate-pulse"
                  style={{ width: CELL_SIZE, height: CELL_SIZE, background: 'rgba(255,255,255,0.03)' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {!compact && (
        <div
          className="rounded-xl p-6 w-64 shrink-0 flex flex-col items-center justify-center animate-pulse"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="w-20 h-20 rounded-full bg-white/5 mb-3" />
          <div className="h-4 w-24 rounded bg-white/5 mb-4" />
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PostingTracker({ compact = false }: { compact?: boolean } = {}) {
  const [data, setData] = useState<PostingActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<GridDay | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const today = new Date()
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    fetch(`/api/posting-activity?today=${localDate}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grid = useMemo(() => {
    if (!data) return null
    return buildGrid(data.activity, compact ? 90 : 365)
  }, [data, compact])

  const last7 = useMemo(() => {
    if (!data) return []
    return getLast7Days(data.activity)
  }, [data])

  if (loading) return <Skeleton compact={compact} />

  if (!data || !grid) {
    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Connect your platforms in Settings to see posting activity.
        </p>
      </div>
    )
  }

  const { weeks, monthLabels } = grid
  const { streaks, totals } = data
  const streakWarning = getStreakWarning(streaks)

  return (
    <div className={compact ? '' : 'flex gap-4'}>
      {/* Heatmap card */}
      <div
        className="rounded-xl p-5 space-y-3 flex-1 min-w-0"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-sm font-semibold text-white">Posting Activity</h2>

        {/* Heatmap */}
        <div className="overflow-x-auto relative" ref={gridRef}>
          <div style={{ minWidth: weeks.length * (CELL_SIZE + GAP) + 30 }}>
            {/* Month labels */}
            <div className="flex" style={{ paddingLeft: 30, marginBottom: 4 }}>
              {monthLabels.map((m, i) => {
                const nextCol = monthLabels[i + 1]?.col ?? weeks.length
                const span = nextCol - m.col
                return (
                  <div
                    key={`${m.label}-${m.col}`}
                    className="text-[9px] shrink-0"
                    style={{ width: span * (CELL_SIZE + GAP), color: 'rgba(255,255,255,0.2)' }}
                  >
                    {span >= 3 ? m.label : ''}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-0">
              <div className="flex flex-col shrink-0" style={{ width: 30, gap: GAP }}>
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                  <div
                    key={i}
                    className="text-[9px] flex items-center"
                    style={{ height: CELL_SIZE, color: 'rgba(255,255,255,0.2)' }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ gap: GAP }}>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className="rounded-[2px] cursor-default"
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          background: day.future ? 'transparent' : getColor(day.count),
                        }}
                        onMouseEnter={e => {
                          if (day.future) return
                          const rect = gridRef.current?.getBoundingClientRect()
                          const cellRect = e.currentTarget.getBoundingClientRect()
                          if (rect) {
                            setTooltipPos({
                              x: cellRect.left - rect.left + cellRect.width / 2,
                              y: cellRect.top - rect.top,
                            })
                          }
                          setHoveredDay(day)
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating tooltip */}
          {hoveredDay && (
            <div
              className="pointer-events-none absolute z-50 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-opacity duration-100"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y - 8,
                transform: 'translate(-50%, -100%)',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                color: '#fff',
              }}
            >
              {(() => {
                const d = new Date(hoveredDay.date + 'T12:00:00')
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                if (hoveredDay.count === 0) return (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>No posts</span>
                  </>
                )
                const parts: { label: string; count: number; color: string }[] = []
                if (hoveredDay.instagram > 0) parts.push({ label: 'IG', count: hoveredDay.instagram, color: '#e1306c' })
                if (hoveredDay.linkedin > 0) parts.push({ label: 'LI', count: hoveredDay.linkedin, color: '#0ea5e9' })
                if (hoveredDay.youtube > 0) parts.push({ label: 'YT', count: hoveredDay.youtube, color: '#dc2626' })
                return (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{hoveredDay.count}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>post{hoveredDay.count !== 1 ? 's' : ''}</span>
                    {parts.length > 0 && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 5px' }}>|</span>
                        {parts.map((p, i) => (
                          <span key={p.label}>
                            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 3px' }}>·</span>}
                            <span style={{ color: p.color, fontWeight: 600 }}>{p.count}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>{p.label}</span>
                          </span>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Legend + platform totals */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Less</span>
            {[0, 1, 2, 3].map(n => (
              <div
                key={n}
                className="rounded-[2px]"
                style={{ width: 10, height: 10, background: getColor(n) }}
              />
            ))}
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>More</span>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'IG', count: totals.instagram, color: '#e1306c' },
              { label: 'LI', count: totals.linkedin, color: '#0ea5e9' },
              { label: 'YT', count: totals.youtube, color: '#dc2626' },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {p.label}: {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duolingo-style streak card — hidden in compact mode */}
      {!compact && (
        <div
          className="rounded-xl p-6 w-64 shrink-0 flex flex-col items-center justify-center"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Flame + number */}
          <div className="relative flex items-center justify-center mb-1">
            <FlameIcon size={90} />
            <span
              className="absolute text-3xl font-black text-white"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', top: '50%', transform: 'translateY(-35%)' }}
            >
              {streaks.current}
            </span>
          </div>

          <p className="text-sm font-bold text-white mb-3">
            day streak!
          </p>

          {/* Streak warning */}
          {streakWarning && (
            <div
              className="w-full rounded-lg px-3 py-1.5 mb-3 text-center"
              style={{
                background: streakWarning.urgency === 'high'
                  ? 'rgba(239,68,68,0.15)'
                  : streakWarning.urgency === 'medium'
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(255,255,255,0.05)',
                border: `1px solid ${
                  streakWarning.urgency === 'high'
                    ? 'rgba(239,68,68,0.3)'
                    : streakWarning.urgency === 'medium'
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(255,255,255,0.08)'
                }`,
              }}
            >
              <p
                className="text-[10px] font-medium"
                style={{
                  color: streakWarning.urgency === 'high'
                    ? '#ef4444'
                    : streakWarning.urgency === 'medium'
                      ? '#f59e0b'
                      : 'rgba(255,255,255,0.4)',
                }}
              >
                {streakWarning.message}
              </p>
            </div>
          )}

          {/* Last 7 days row */}
          <div className="flex items-center justify-between w-full mb-3">
            {last7.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={day.posted ? {
                    background: 'rgba(245,158,11,0.15)',
                    border: '2px solid #f59e0b',
                    color: '#f59e0b',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {day.posted ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    day.dayLabel
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Longest streak: {streaks.longest} days
          </p>
        </div>
      )}
    </div>
  )
}
