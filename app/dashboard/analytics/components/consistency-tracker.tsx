'use client'

import { useMemo } from 'react'
import type { InstagramPost } from './analytics-types'

export function ConsistencyTracker({ posts, reels }: {
  posts: InstagramPost[]; reels: InstagramPost[]
}) {
  const weeks = useMemo(() => {
    const all = [...posts, ...reels]
    const result: { label: string; count: number }[] = []
    for (let w = 3; w >= 0; w--) {
      const start = new Date(Date.now() - (w + 1) * 7 * 24 * 60 * 60 * 1000)
      const end = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000)
      const count = all.filter(p => {
        if (!p.publishedAt?.dateTime) return false
        const d = new Date(p.publishedAt.dateTime)
        return d >= start && d < end
      }).length
      const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1}w ago`
      result.push({ label, count })
    }
    return result
  }, [posts, reels])

  const maxCount = Math.max(...weeks.map(w => w.count), 1)
  const totalPosts = posts.length + reels.length
  const avgPerWeek = (totalPosts / 4).toFixed(1)
  const currentStreak = weeks.slice().reverse().findIndex(w => w.count === 0)
  const streakWeeks = currentStreak === -1 ? 4 : currentStreak

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="space-y-2">
          {weeks.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] w-20 flex-shrink-0 text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>{w.label}</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', height: 6 }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(w.count / maxCount) * 100}%`,
                    background: w.count === 0 ? 'rgba(239,68,68,0.4)' : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  }}
                />
              </div>
              <span className="text-[11px] font-mono w-6 text-right" style={{ color: w.count > 0 ? 'rgba(255,255,255,0.6)' : '#f87171' }}>{w.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Avg / week</p>
          <p className="text-2xl font-mono font-bold text-white mt-0.5">{avgPerWeek}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>posts + reels</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Active streak</p>
          <p className="text-2xl font-mono font-bold mt-0.5" style={{ color: streakWeeks > 0 ? '#10b981' : '#f87171' }}>{streakWeeks}w</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {streakWeeks > 0 ? 'consecutive weeks' : 'no posts this week'}
          </p>
        </div>
      </div>
    </div>
  )
}
