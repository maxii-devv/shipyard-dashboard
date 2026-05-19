'use client'

import { useState, useEffect, useRef } from 'react'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface ActivityDay {
  total: number
  instagram: number
  linkedin: number
  youtube: number
}

interface StreakData {
  activity: Record<string, ActivityDay>
  streaks: { current: number; longest: number; postedToday: boolean }
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
      dayLabel: DAY_LABELS[d.getDay()],
      posted: (activity[dateStr]?.total ?? 0) > 0,
    })
  }
  return days
}

export function StreakBadge() {
  const [data, setData] = useState<StreakData | null>(null)
  const [showPopover, setShowPopover] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA')
    fetch(`/api/posting-activity?today=${localDate}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.streaks) setData(d) })
      .catch(() => {})
  }, [])

  if (!data) return null

  const { current, longest, postedToday } = data.streaks
  if (current === 0 && !postedToday) return null

  const estHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
  const atRisk = !postedToday && estHour >= 16
  const last7 = getLast7Days(data.activity ?? {})

  const streakWarning = (() => {
    if (postedToday || current === 0) return null
    const hour = new Date().getHours()
    if (hour >= 22) return { message: `Post now or lose your ${current}-day streak!`, urgency: 'high' as const }
    if (hour >= 18) return { message: `Don't forget to post today — ${current}-day streak on the line`, urgency: 'medium' as const }
    if (hour >= 12) return { message: `No posts yet today — ${current}-day streak active`, urgency: 'low' as const }
    return null
  })()

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setShowPopover(true)
  }

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setShowPopover(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-default"
        style={{
          background: atRisk ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${atRisk ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)'}`,
          color: '#f59e0b',
        }}
      >
        {/* Flame icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C12 2 4 9.5 4 14.5C4 18.64 7.58 22 12 22C16.42 22 20 18.64 20 14.5C20 9.5 12 2 12 2Z"
            fill="url(#flame-grad-badge)"
          />
          <path
            d="M12 22C14.21 22 16 19.76 16 17C16 14.24 12 9 12 9C12 9 8 14.24 8 17C8 19.76 9.79 22 12 22Z"
            fill="#fbbf24"
          />
          <defs>
            <linearGradient id="flame-grad-badge" x1="12" y1="2" x2="12" y2="22">
              <stop stopColor="#f59e0b" />
              <stop offset="1" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <span>{current}</span>
        <span style={{ color: 'rgba(245,158,11,0.6)', fontWeight: 400 }}>day{current !== 1 ? 's' : ''}</span>
        {atRisk && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#ef4444' }}
          />
        )}
      </div>

      {/* Hover popover */}
      {showPopover && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-xl p-6 flex flex-col items-center"
          style={{
            background: '#2d2c2a',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Flame + number */}
          <div className="relative flex items-center justify-center mb-1">
            <svg width={90} height={90} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="flame-outer-pop" x1="32" y1="56" x2="32" y2="4" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="flame-inner-pop" x1="32" y1="56" x2="32" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fbbf24" />
                  <stop offset="1" stopColor="#fcd34d" />
                </linearGradient>
              </defs>
              <path
                d="M32 4C32 4 16 20 16 36C16 44.8 23.2 52 32 52C40.8 52 48 44.8 48 36C48 20 32 4 32 4Z"
                fill="url(#flame-outer-pop)"
              />
              <path
                d="M32 4C32 4 12 22 12 38C12 49.04 20.96 58 32 58C43.04 58 52 49.04 52 38C52 22 32 4 32 4Z"
                fill="url(#flame-outer-pop)"
                opacity="0.6"
              />
              <path
                d="M32 24C32 24 24 32 24 40C24 44.4 27.6 48 32 48C36.4 48 40 44.4 40 40C40 32 32 24 32 24Z"
                fill="url(#flame-inner-pop)"
              />
            </svg>
            <span
              className="absolute text-3xl font-black text-white"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', top: '50%', transform: 'translateY(-35%)' }}
            >
              {current}
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

          {/* Last 7 days */}
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
            Longest streak: {longest} days
          </p>
        </div>
      )}
    </div>
  )
}
