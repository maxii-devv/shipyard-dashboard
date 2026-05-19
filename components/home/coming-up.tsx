'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'

interface ScheduledItem {
  id: string
  date: string
  time: string
  platform: string
  type: string
  title?: string
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c',
  linkedin: '#0ea5e9',
  youtube: '#dc2626',
  twitter: '#1da1f2',
  facebook: '#1877f2',
  tiktok: '#69c9d0',
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  youtube: 'YT',
  twitter: 'X',
  facebook: 'FB',
  tiktok: 'TT',
}

function getDayLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T12:00:00')
  date.setHours(0, 0, 0, 0)

  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ComingUp() {
  const [items, setItems] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/metricool?endpoint=scheduled_posts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        // Metricool scheduled posts format varies, normalize
        const posts = Array.isArray(data) ? data : (data.data ?? data.posts ?? [])
        const normalized: ScheduledItem[] = posts.map((p: any) => {
          const dateTime = p.date || p.scheduledDate || p.publishDate || ''
          const [date, time] = dateTime.includes('T')
            ? [dateTime.slice(0, 10), dateTime.slice(11, 16)]
            : [dateTime.slice(0, 10), '']
          return {
            id: p.id ?? `${date}-${p.network ?? p.platform}`,
            date,
            time,
            platform: (p.network ?? p.platform ?? '').toLowerCase(),
            type: p.type ?? p.contentType ?? 'post',
            title: p.text?.slice(0, 60) ?? p.title ?? undefined,
          }
        })
        // Sort by date/time, only future
        const today = new Date().toISOString().slice(0, 10)
        const future = normalized.filter(i => i.date >= today).sort((a, b) => {
          const da = `${a.date}${a.time}`
          const db = `${b.date}${b.time}`
          return da.localeCompare(db)
        })
        setItems(future.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div
        className="rounded-xl p-5 space-y-3 animate-pulse"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="h-4 w-24 rounded bg-white/5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-full rounded bg-white/5" />
        ))}
      </div>
    )
  }

  // Group by day
  const grouped: { label: string; items: ScheduledItem[] }[] = []
  for (const item of items) {
    const label = getDayLabel(item.date)
    const existing = grouped.find(g => g.label === label)
    if (existing) {
      existing.items.push(item)
    } else {
      grouped.push({ label, items: [item] })
    }
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4 h-full"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <h2 className="text-sm font-semibold text-white">Coming Up</h2>
        </div>
        <Link href="/dashboard/calendar" className="flex items-center gap-1 text-[11px] transition-colors text-white/30 hover:text-white/60">
          Calendar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {grouped.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Nothing scheduled for the next 14 days
          </p>
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium"
            style={{ color: '#3b82f6' }}
          >
            Schedule content <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const color = PLATFORM_COLORS[item.platform] ?? '#888'
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02]"
                    >
                      {item.time && (
                        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)', minWidth: 36 }}>
                          {item.time}
                        </span>
                      )}
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span
                        className="text-[10px] font-semibold flex-shrink-0"
                        style={{ color }}
                      >
                        {PLATFORM_LABELS[item.platform] ?? item.platform}
                      </span>
                      <span className="text-[11px] text-white/50 truncate flex-1">
                        {item.title ?? item.type}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
