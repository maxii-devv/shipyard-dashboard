'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, ArrowRight, Bell, TrendingUp, TrendingDown, FileText, PenLine } from 'lucide-react'

interface Alert {
  id: string
  alert_type: string
  title: string
  created_at: string
  is_read: boolean
  competitor: { name: string; slug: string } | null
}

const ALERT_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  bio_changed: PenLine,
  follower_spike: TrendingUp,
  follower_drop: TrendingDown,
  new_post: FileText,
}

const ALERT_COLORS: Record<string, string> = {
  bio_changed: '#f59e0b',
  follower_spike: '#22c55e',
  follower_drop: '#ef4444',
  new_post: '#3b82f6',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function CompetitorIntel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/competitors/alerts?unread=true')
      .then(r => r.json())
      .then(data => {
        setAlerts(Array.isArray(data) ? data.slice(0, 5) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#f97316' }} />
          <h2 className="text-sm font-semibold text-white">Competitor Intel</h2>
          {!loading && alerts.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
              <Bell className="w-2.5 h-2.5" />
              {alerts.length}
            </span>
          )}
        </div>
        <Link href="/dashboard/competitors" className="flex items-center gap-1 text-[11px] transition-colors text-white/30 hover:text-white/60">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No new competitor activity</p>
      ) : (
        <div className="space-y-1.5">
          {alerts.map(alert => {
            const Icon = ALERT_ICONS[alert.alert_type] || Bell
            const color = ALERT_COLORS[alert.alert_type] || '#888'
            return (
              <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-3 h-3" style={{ color }} />
                </div>
                <p className="text-[12px] text-white/60 truncate flex-1">{alert.title}</p>
                <span className="text-[10px] text-white/20 flex-shrink-0">{timeAgo(alert.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
