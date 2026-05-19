'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, Radio } from 'lucide-react'
import { Video } from '@/lib/types'

const statusConfig = {
  in_progress:     { label: 'In Progress',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  ready_to_create: { label: 'Ready to Create', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',       dot: 'bg-pink-400' },
  editing:         { label: 'Editing',         color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  ready:           { label: 'Ready',           color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       dot: 'bg-blue-400' },
  scheduled:       { label: 'Scheduled',       color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  published:       { label: 'Published',       color: 'bg-green-500/20 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
}

interface MetricoolPost {
  postId?: string
  id?: number
  type?: string
  publishedAt?: { dateTime: string; timezone: string }
  publicationDate?: { dateTime: string; timezone: string }
  content?: string
  text?: string
  url?: string
  network?: string
  likes?: number
  comments?: number
  engagement?: number
  reach?: number
}

interface MetricoolScheduledPost {
  id: number
  text?: string
  publicationDate?: { dateTime: string; timezone: string }
  providers?: { network: string; status: string }[]
  draft?: boolean
}

const NETWORK_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  instagram: { bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30', dot: 'bg-pink-400', label: 'IG' },
  linkedin:  { bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',  dot: 'bg-blue-400',  label: 'LI' },
  youtube:   { bg: 'bg-red-500/20 text-red-300 border-red-500/30',    dot: 'bg-red-400',   label: 'YT' },
  twitter:   { bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',    dot: 'bg-sky-400',   label: 'TW' },
  facebook:  { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400', label: 'FB' },
  default:   { bg: 'bg-gray-500/20 text-gray-300 border-gray-500/30', dot: 'bg-gray-400',  label: 'SM' },
}

const platformIcon: Record<string, string> = {
  youtube: '▶️',
  tiktok: '🎵',
  instagram: '📸',
  twitter: '🐦',
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getVideoDate(video: Video): string | null {
  return video.scheduled_at ?? video.published_at ?? video.target_date ?? null
}

function isTargetOnly(item: { scheduled_at?: string | null; published_at?: string | null; target_date?: string | null }): boolean {
  return !item.scheduled_at && !item.published_at && !!item.target_date
}

interface SocialPost {
  id: string
  title: string
  platform: string
  type: string
  caption: string | null
  status: string
  scheduled_at: string | null
  published_at: string | null
  target_date: string | null
}

export function ContentCalendar({ videos, socialPosts = [] }: { videos: Video[]; socialPosts?: SocialPost[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [mcPosts, setMcPosts] = useState<MetricoolPost[]>([])
  const [mcScheduled, setMcScheduled] = useState<MetricoolScheduledPost[]>([])
  const [mcLoading, setMcLoading] = useState(false)

  // Fetch Metricool posts for the current month view
  useEffect(() => {
    const from = new Date(year, month, 1).toISOString().split('.')[0]
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString().split('.')[0]
    setMcLoading(true)

    // Fetch Metricool social posts
    Promise.all([
      fetch(`/api/metricool?endpoint=instagram_posts&from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
      fetch(`/api/metricool?endpoint=instagram_reels&from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
      fetch(`/api/metricool?endpoint=linkedin_posts&from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
      fetch(`/api/metricool?endpoint=twitter_posts&from=${from}&to=${to}`).then(r => r.json()).catch(() => null),
    ])
      .then(([ig, reels, li, tw]) => {
        const igPosts = (ig?.data ?? []).map((p: MetricoolPost) => ({ ...p, network: 'instagram' }))
        const reelPosts = (reels?.data ?? []).map((p: MetricoolPost) => ({ ...p, network: 'instagram' }))
        const liPosts = (li?.data ?? []).map((p: MetricoolPost) => ({ ...p, network: 'linkedin' }))
        const twPosts = (tw?.data ?? []).map((p: MetricoolPost) => ({ ...p, network: 'twitter' }))
        // Deduplicate by postId (reels may overlap with posts)
        const all = [...igPosts, ...reelPosts, ...liPosts, ...twPosts]
        const seen = new Set<string>()
        const deduped = all.filter(p => {
          const key = String(p.postId ?? p.id ?? Math.random())
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setMcPosts(deduped)
      })
      .finally(() => setMcLoading(false))

    // Fetch Metricool scheduled (pending) posts
    fetch(`/api/metricool?endpoint=scheduled_posts&start=${from}&end=${to}`)
      .then(r => r.json())
      .then(data => setMcScheduled(data?.data ?? []))
      .catch(() => setMcScheduled([]))

  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Build grid cells with actual dates
  const cells: { day: number; currentMonth: boolean; dateKey: string }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i)
    cells.push({ day: d.getDate(), currentMonth: false, dateKey: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateKey: `${year}-${month}-${d}` })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, month + 1, d)
    cells.push({ day: d, currentMonth: false, dateKey: `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}` })
  }

  // Helper to get dateKey from a Date object
  function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }

  // Map videos to dates
  const videosByDate: Record<string, Video[]> = {}
  videos.forEach(v => {
    const dateStr = getVideoDate(v)
    if (!dateStr) return
    const d = new Date(dateStr)
    const key = toDateKey(d)
    if (!videosByDate[key]) videosByDate[key] = []
    videosByDate[key].push(v)
  })

  // Map Metricool posts to dates
  const mcPostsByDate: Record<string, MetricoolPost[]> = {}
  mcPosts.forEach(p => {
    const dateStr = p.publishedAt?.dateTime ?? p.publicationDate?.dateTime ?? null
    if (!dateStr) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const key = toDateKey(d)
    if (!mcPostsByDate[key]) mcPostsByDate[key] = []
    mcPostsByDate[key].push(p)
  })

  // Map social posts (from Supabase) to dates
  const spByDate: Record<string, SocialPost[]> = {}
  socialPosts.forEach(p => {
    const dateStr = p.published_at ?? p.scheduled_at ?? p.target_date ?? null
    if (!dateStr) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const key = toDateKey(d)
    if (!spByDate[key]) spByDate[key] = []
    spByDate[key].push(p)
  })

  // Map Metricool scheduled posts to dates (pending posts not yet published)
  // Deduplicate: skip if already shown as analytics post or Supabase social post
  const mcAnalyticsIds = new Set(mcPosts.map(p => String(p.id ?? '')).filter(Boolean))
  const supabaseMcIds = new Set(socialPosts.filter(p => (p as any).metricool_post_id).map(p => String((p as any).metricool_post_id)))
  const mcSchedByDate: Record<string, MetricoolScheduledPost[]> = {}
  mcScheduled.forEach(p => {
    // Skip drafts
    if (p.draft) return
    // Skip if already in analytics or tracked via Supabase
    if (mcAnalyticsIds.has(String(p.id))) return
    if (supabaseMcIds.has(String(p.id))) return
    const dateStr = p.publicationDate?.dateTime
    if (!dateStr) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const key = toDateKey(d)
    if (!mcSchedByDate[key]) mcSchedByDate[key] = []
    mcSchedByDate[key].push(p)
  })

  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  // Unscheduled videos list (no scheduled_at, no published_at, and no target_date)
  const unscheduled = videos.filter(v => !v.scheduled_at && !v.published_at && !v.target_date)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-gray-400 mt-1">Schedule and track your content pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-lg font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-gray-400">{cfg.label}</span>
          </div>
        ))}
        <div className="w-px h-3 bg-gray-700 mx-1" />
        <span className="text-gray-600">Platforms:</span>
        {(['youtube', 'instagram', 'linkedin', 'twitter'] as const).map(n => (
          <div key={n} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${NETWORK_COLORS[n].dot}`} />
            <span className="text-gray-500">{n.charAt(0).toUpperCase() + n.slice(1)}</span>
          </div>
        ))}
        <div className="w-px h-3 bg-gray-700 mx-1" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-dashed border-gray-400 opacity-60" />
          <span className="text-gray-500">Target</span>
        </div>
        {mcLoading && <span className="text-gray-600 italic">Loading posts...</span>}
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="px-3 py-3 text-xs font-medium text-gray-500 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const isToday = cell.currentMonth && isCurrentMonth && cell.day === today
            const dk = cell.dateKey
            const dayVideos = videosByDate[dk] ?? []
            const dayMcPosts = mcPostsByDate[dk] ?? []
            const dayMcSched = mcSchedByDate[dk] ?? []
            const daySocialPosts = spByDate[dk] ?? []
            const isLastRow = idx >= 35
            const totalItems = dayVideos.length + dayMcPosts.length + dayMcSched.length + daySocialPosts.length
            const maxVisible = 4
            const videoSlice = dayVideos.slice(0, maxVisible)
            const mcSlice = dayMcPosts.slice(0, Math.max(0, maxVisible - videoSlice.length))
            const mcSchedSlice = dayMcSched.slice(0, Math.max(0, maxVisible - videoSlice.length - mcSlice.length))
            const spSlice = daySocialPosts.slice(0, Math.max(0, maxVisible - videoSlice.length - mcSlice.length - mcSchedSlice.length))

            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border-b border-r border-gray-800/50 ${
                  !cell.currentMonth ? 'opacity-30' : ''
                } ${idx % 7 === 6 ? 'border-r-0' : ''} ${isLastRow ? 'border-b-0' : ''}`}
              >
                <div className={`text-sm font-medium mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-red-600 text-white' : 'text-gray-400'
                }`}>
                  {cell.day}
                </div>
                <div className="space-y-1">
                  {videoSlice.map(video => {
                    const cfg = statusConfig[video.status]
                    const target = isTargetOnly(video)
                    return (
                      <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                        <div className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 truncate cursor-pointer hover:opacity-80 transition-opacity ${cfg.color} ${target ? 'border-dashed opacity-60' : ''} border`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${target ? 'border border-current bg-transparent' : cfg.dot}`} />
                          <span className="truncate">{video.title}</span>
                        </div>
                      </Link>
                    )
                  })}
                  {mcSlice.map((post, pi) => {
                    const network = post.network ?? 'default'
                    const cfg = NETWORK_COLORS[network] ?? NETWORK_COLORS.default
                    const bodyText = post.content ?? post.text ?? ''
                    const preview = bodyText.slice(0, 40) || `${cfg.label} post`
                    const key = String(post.postId ?? post.id ?? pi)
                    const href = post.url || undefined
                    return href ? (
                      <a key={key} href={href} target="_blank" rel="noopener noreferrer" title={bodyText}>
                        <div className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 truncate cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} border`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className="truncate">{preview}</span>
                        </div>
                      </a>
                    ) : (
                      <div key={key} title={bodyText} className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 truncate ${cfg.bg} border`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="truncate">{preview}</span>
                      </div>
                    )
                  })}
                  {mcSchedSlice.map((post) => {
                    const network = post.providers?.[0]?.network ?? 'default'
                    const cfg = NETWORK_COLORS[network] ?? NETWORK_COLORS.default
                    const bodyText = post.text ?? ''
                    const preview = bodyText.slice(0, 40) || `${cfg.label} scheduled`
                    return (
                      <div key={post.id} title={`⏳ Scheduled: ${bodyText}`} className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 truncate ${cfg.bg} border border-dashed`}>
                        <Clock className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
                        <span className="truncate">{preview}</span>
                      </div>
                    )
                  })}
                  {spSlice.map(post => {
                    const cfg = NETWORK_COLORS[post.platform] ?? NETWORK_COLORS.default
                    const preview = post.title || (post.caption?.slice(0, 40) ?? `${cfg.label} post`)
                    const statusCfg = statusConfig[post.status as keyof typeof statusConfig]
                    const statusDot = statusCfg?.dot ?? cfg.dot
                    const target = isTargetOnly(post)
                    return (
                      <Link key={post.id} href={`/dashboard/${post.platform}/${post.id}`}>
                        <div className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 truncate cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${target ? 'border-dashed opacity-60' : ''} border`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${target ? 'border border-current bg-transparent' : statusDot}`} />
                          <span className="truncate">{preview}</span>
                        </div>
                      </Link>
                    )
                  })}
                  {totalItems > maxVisible && (
                    <div className="text-xs text-gray-500 px-1">+{totalItems - maxVisible} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled Videos */}
      {unscheduled.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Unscheduled Videos
            <span className="text-sm font-normal text-gray-500">({unscheduled.length})</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduled.map(video => {
              const cfg = statusConfig[video.status]
              return (
                <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                  <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-3 flex items-center gap-3 transition-all cursor-pointer">
                    <span className="text-lg">{platformIcon[video.platform] ?? '📹'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{video.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs mt-1 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Unscheduled Social Posts (no scheduled_at, no published_at, and no target_date) */}
      {socialPosts.filter(p => !p.scheduled_at && !p.published_at && !p.target_date).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Unscheduled Social Posts
            <span className="text-sm font-normal text-gray-500">({socialPosts.filter(p => !p.scheduled_at && !p.published_at && !p.target_date).length})</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {socialPosts.filter(p => !p.scheduled_at && !p.published_at && !p.target_date).map(post => {
              const netCfg = NETWORK_COLORS[post.platform] ?? NETWORK_COLORS.default
              const sCfg = statusConfig[post.status as keyof typeof statusConfig]
              return (
                <Link key={post.id} href={`/dashboard/${post.platform}/${post.id}`}>
                  <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-3 flex items-center gap-3 transition-all cursor-pointer">
                    <div className={`w-2 h-2 rounded-full ${netCfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{post.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs mt-1 ${sCfg?.color ?? netCfg.bg}`}>
                        {sCfg?.label ?? post.status}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
