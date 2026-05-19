'use client'

import { useState, useMemo, useRef } from 'react'
import type { InstagramPost } from './analytics-types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p']

export function BestTimeHeatmap({ posts }: { posts: InstagramPost[] }) {
  const [heatTip, setHeatTip] = useState<{ day: string; hour: string; val: number; count: number; x: number; y: number } | null>(null)
  const heatRef = useRef<HTMLDivElement>(null)

  const grid = useMemo(() => {
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const p of posts) {
      if (!p.publishedAt?.dateTime) continue
      const dt = new Date(p.publishedAt.dateTime)
      const day = dt.getDay()
      const hour = dt.getHours()
      counts[day][hour]++
      sums[day][hour] += p.engagement
    }
    const avgs: number[][] = Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 24 }, (_, h) => counts[d][h] > 0 ? sums[d][h] / counts[d][h] : 0)
    )
    return { avgs, counts }
  }, [posts])

  const maxVal = Math.max(...grid.avgs.flat(), 0.01)

  let bestDay = 0, bestHour = 0, bestVal = 0
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid.avgs[d][h] > bestVal) { bestVal = grid.avgs[d][h]; bestDay = d; bestHour = h }
    }
  }

  if (posts.length < 3) return (
    <div className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
      Not enough posts to detect patterns (need at least 3)
    </div>
  )

  const fmtHour = (h: number) => {
    const suffix = h >= 12 ? 'pm' : 'am'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display}${suffix}`
  }

  return (
    <div>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 text-xs"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399' }}
      >
        Best: <strong>{DAY_LABELS[bestDay]}s at {fmtHour(bestHour)}</strong> ({bestVal.toFixed(1)}% avg eng)
      </div>
      <div className="overflow-x-auto relative" ref={heatRef}>
        <div className="min-w-[560px]">
          <div className="flex mb-1 pl-9">
            {HOUR_LABELS.map((l, i) => (
              <div key={i} className="flex-1 text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>{l}</div>
            ))}
          </div>
          {DAY_LABELS.map((day, d) => (
            <div key={d} className="flex items-center mb-0.5">
              <span className="w-8 text-[9px] text-right pr-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{day}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const val = grid.avgs[d][h]
                const intensity = val / maxVal
                const isBest = d === bestDay && h === bestHour
                return (
                  <div
                    key={h}
                    className="flex-1 rounded-sm mx-px cursor-default"
                    style={{
                      height: 18,
                      background: isBest
                        ? '#10b981'
                        : val > 0
                        ? `rgba(139,92,246,${0.1 + intensity * 0.9})`
                        : 'rgba(255,255,255,0.03)',
                      border: isBest ? '1px solid rgba(16,185,129,0.5)' : '1px solid transparent',
                    }}
                    onMouseEnter={e => {
                      if (val === 0) return
                      const rect = heatRef.current?.getBoundingClientRect()
                      const cellRect = e.currentTarget.getBoundingClientRect()
                      if (rect) {
                        setHeatTip({
                          day, hour: fmtHour(h), val, count: grid.counts[d][h],
                          x: cellRect.left - rect.left + cellRect.width / 2,
                          y: cellRect.top - rect.top,
                        })
                      }
                    }}
                    onMouseLeave={() => setHeatTip(null)}
                  />
                )
              })}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pl-9">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Low</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <div key={v} className="w-4 h-3 rounded-sm" style={{ background: `rgba(139,92,246,${v})` }} />
              ))}
            </div>
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>High</span>
            <div className="w-4 h-3 rounded-sm ml-2" style={{ background: '#10b981' }} />
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Best slot</span>
          </div>
        </div>

        {heatTip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap"
            style={{
              left: heatTip.x, top: heatTip.y - 8, transform: 'translate(-50%, -100%)',
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: '#fff',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{heatTip.day} {heatTip.hour}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>{heatTip.val.toFixed(1)}%</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>eng</span>
            <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 5px' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{heatTip.count}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>post{heatTip.count !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
