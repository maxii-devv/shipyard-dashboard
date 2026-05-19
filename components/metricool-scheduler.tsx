'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Send, Trash2, CheckCircle2, Loader2, ExternalLink, AlertCircle } from 'lucide-react'

interface MetricoolSchedulerProps {
  socialPostId: string
  platform: string
  text: string
  hashtags?: string[]
  initialScheduledAt?: string | null
  initialMetricoolId?: number | null
  accentColor?: string
}

type ScheduleStatus = 'idle' | 'loading' | 'scheduled' | 'error'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Scheduled',
  PUBLISHED: 'Published',
  ERROR: 'Error',
  DRAFT: 'Draft',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#22c55e',
  PUBLISHED: '#a78bfa',
  ERROR: '#f87171',
  DRAFT: '#f59e0b',
}

export function MetricoolScheduler({
  socialPostId,
  platform,
  text,
  hashtags = [],
  initialScheduledAt,
  initialMetricoolId,
  accentColor = '#0077b5',
}: MetricoolSchedulerProps) {
  const [status, setStatus] = useState<ScheduleStatus>('loading')
  const [metricoolId, setMetricoolId] = useState<number | null>(initialMetricoolId ?? null)
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialScheduledAt
      ? new Date(initialScheduledAt).toISOString().slice(0, 16)
      : getDefaultDateTime()
  )
  const [metricoolStatus, setMetricoolStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [timezone, setTimezone] = useState('America/New_York')

  // Detect browser timezone on mount
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {}
  }, [])

  // Check current schedule status
  useEffect(() => {
    fetch(`/api/metricool/schedule?socialPostId=${socialPostId}`)
      .then(r => r.json())
      .then(data => {
        if (data.scheduled) {
          setMetricoolId(data.metricoolPostId)
          setMetricoolStatus(data.metricoolStatus)
          if (data.scheduledAt) {
            setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16))
          }
          setStatus('scheduled')
        } else {
          setStatus('idle')
        }
      })
      .catch(() => setStatus('idle'))
  }, [socialPostId])

  const handleSchedule = async () => {
    if (!text.trim()) {
      setError('Post content is required before scheduling.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/metricool/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialPostId,
          text,
          hashtags,
          scheduledAt,
          timezone,
          platform,
          draft: false,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Scheduling failed')
        return
      }
      setMetricoolId(data.metricoolPostId)
      setMetricoolStatus('PENDING')
      setStatus('scheduled')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnschedule = async () => {
    if (!confirm('Remove this post from Metricool?')) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/metricool/schedule?socialPostId=${socialPostId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to remove from Metricool')
        return
      }
      setMetricoolId(null)
      setMetricoolStatus(null)
      setStatus('idle')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Checking schedule...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <img src="https://app.metricool.com/favicon.ico" className="w-3 h-3" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Schedule via Metricool
        </span>
        {status === 'scheduled' && metricoolStatus && (
          <span
            className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              color: STATUS_COLORS[metricoolStatus] ?? '#fff',
              background: `${STATUS_COLORS[metricoolStatus] ?? '#fff'}15`,
            }}
          >
            {STATUS_LABELS[metricoolStatus] ?? metricoolStatus}
          </span>
        )}
      </div>

      {status === 'scheduled' ? (
        /* ── Scheduled state ── */
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'rgba(34,197,94,0.05)',
            border: '1px solid rgba(34,197,94,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white/80">Scheduled on Metricool</p>
              <p className="text-xs text-white/35">
                {new Date(scheduledAt).toLocaleString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
                {' · '}
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                  ID #{metricoolId}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://app.metricool.com/planner`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80"
              style={{ color: accentColor }}
            >
              <ExternalLink className="w-3 h-3" />
              View in Metricool
            </a>

            <button
              onClick={handleUnschedule}
              disabled={deleting}
              className="ml-auto flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#f87171',
              }}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              {deleting ? 'Removing...' : 'Unschedule'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Scheduling form ── */
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Datetime picker */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <Calendar className="w-3 h-3" /> Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={getMinDateTime()}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                colorScheme: 'dark',
              }}
            />
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Timezone: {timezone}
            </p>
          </div>

          {/* Preview */}
          {text && (
            <div
              className="rounded-lg p-3 text-xs leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.4)',
                maxHeight: 80,
                overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0))',
              }}
            >
              {text}
              {hashtags.length > 0 && (
                <span style={{ color: accentColor }}> {hashtags.join(' ')}</span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSchedule}
            disabled={submitting || !scheduledAt}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: accentColor, color: 'white' }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
            ) : (
              <><Send className="w-4 h-4" /> Schedule on {platform.charAt(0).toUpperCase() + platform.slice(1)}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function getDefaultDateTime(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

function getMinDateTime(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 10)
  return d.toISOString().slice(0, 16)
}
