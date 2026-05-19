'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Instagram, RefreshCw, Twitter, Youtube, Linkedin, BarChart2, TrendingUp,
} from 'lucide-react'
import { ContentDetailModal, type ContentItem } from '@/components/content-detail-modal'
import {
  toIso, PRESETS,
  type Tab, type AnalyticsData, type TimelinePoint,
} from './components/analytics-types'
import { OverviewTab } from './components/overview-tab'
import { InstagramTab } from './components/instagram-tab'
import { TwitterTab } from './components/twitter-tab'
import { YouTubeTab } from './components/youtube-tab'
import { LinkedInTab } from './components/linkedin-tab'
import { ContentRoiTab } from './components/content-roi-tab'

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart2, color: '#dc2626' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, color: '#dc2626' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#e1306c' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0a66c2' },
  { key: 'twitter', label: 'Twitter/X', icon: Twitter, color: '#1d9bf0' },
  { key: 'roi', label: 'Content ROI', icon: TrendingUp, color: '#10b981' },
]

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [preset, setPreset] = useState(30)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailContent, setDetailContent] = useState<ContentItem | null>(null)

  const [data, setData] = useState<AnalyticsData>({
    igPosts: [], igReels: [], igStories: [],
    igStats: null, twPosts: [], twStats: null,
    liPosts: [], liStats: null, ytStats: null,
    ytPosts: [], ytTimeline: [],
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - preset)
    const fromStr = toIso(from)
    const toStr = toIso(now)
    const todayYmd = now.toISOString().replace(/-/g, '').split('T')[0]
    const fromYmd = from.toISOString().replace(/-/g, '').split('T')[0]

    try {
      const [
        igAnalyticsRes,
        twRes, twStatsRes, liRes, liStatsRes, ytStatsRes,
        ytPostsRes, ytTimelineRes,
      ] = await Promise.all([
        // Instagram now comes from our own Supabase-backed route (Graph API
        // sync), not Metricool — no third-party dependency.
        fetch(`/api/instagram/analytics?days=${preset}`),
        fetch(`/api/metricool?endpoint=twitter_posts&from=${fromStr}&to=${toStr}`),
        fetch(`/api/metricool?endpoint=twitter_stats&date=${todayYmd}`),
        fetch(`/api/metricool?endpoint=linkedin_posts&from=${fromStr}&to=${toStr}`),
        fetch(`/api/metricool?endpoint=linkedin_stats&date=${todayYmd}`),
        fetch(`/api/metricool?endpoint=youtube_stats&date=${todayYmd}`),
        fetch(`/api/metricool?endpoint=youtube_posts&from=${fromStr}&to=${toStr}`),
        fetch(`/api/metricool?endpoint=timeline&metric=ytviews&start=${fromYmd}&end=${todayYmd}`),
      ])

      const [
        igAnalytics,
        twData, twStatsData, liData, liStatsData, ytStatsData,
        ytPostsData, ytTimelineData,
      ] = await Promise.all([
        igAnalyticsRes.json(),
        twRes.json(), twStatsRes.json(), liRes.json(), liStatsRes.json(), ytStatsRes.json(),
        ytPostsRes.json(), ytTimelineRes.json(),
      ])

      // Transform LinkedIn posts — Metricool returns different field names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liPosts = (liData?.data ?? []).map((p: any) => ({
        postId: p.postId ?? '',
        text: p.comment ?? '',
        createdAt: p.createdAt ?? p.created ?? { dateTime: '' },
        totalImpressions: p.impressions ?? 0,
        totalLikes: p.likes ?? 0,
        totalComments: p.comments ?? 0,
        totalShares: 0,
        totalClicks: 0,
        totalEngagement: p.engagement ?? 0,
        picture: p.picture,
        url: p.url,
      }))

      // Transform YouTube posts
      const ytPostsRaw = ytPostsData?.data ?? (Array.isArray(ytPostsData) ? ytPostsData : [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ytPosts = ytPostsRaw.map((p: any) => ({
        postId: p.postId ?? p.videoId ?? '',
        title: p.title ?? p.content ?? '',
        publishedAt: p.publishedAt ?? p.created ?? { dateTime: '' },
        views: p.views ?? p.reproductions ?? 0,
        likes: p.likes ?? 0,
        comments: p.comments ?? 0,
        thumbnailUrl: p.thumbnailUrl ?? p.imageUrl ?? null,
        url: p.url ?? '',
        engagement: p.engagement ?? 0,
        estimatedMinutesWatched: p.estimatedMinutesWatched ?? p.minutesWatched ?? 0,
      }))

      // Transform YouTube timeline — array of [timestamp_or_date, value_string] pairs
      const ytTimelineArr = Array.isArray(ytTimelineData) ? ytTimelineData : []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ytTimeline: TimelinePoint[] = ytTimelineArr.map((entry: any) => {
        const ts = Number(entry[0]) > 1e12 ? Number(entry[0]) : new Date(entry[0]).getTime()
        return {
          date: new Date(ts).toISOString().slice(0, 10),
          value: parseFloat(entry[1]) || 0,
        }
      }).sort((a: TimelinePoint, b: TimelinePoint) => a.date.localeCompare(b.date))

      // YouTube stats from Metricool (may return {} for some accounts)
      const ytStats = ytStatsData && !ytStatsData.error && ytStatsData.Subscribers != null ? ytStatsData : null

      // LinkedIn stats: Metricool often returns {} for personal profiles
      const liStats = liStatsData && !liStatsData.error && liStatsData.Followers != null ? liStatsData : null

      setData({
        igPosts: igAnalytics?.posts ?? [],
        igReels: igAnalytics?.reels ?? [],
        igStories: igAnalytics?.stories ?? [],
        // Follower/profile stats aren't retained by the Graph API sync; the
        // Instagram tab handles a null igStats gracefully.
        igStats: null,
        twPosts: twData?.data ?? [],
        twStats: twStatsData && !twStatsData.error ? twStatsData : null,
        liPosts,
        liStats,
        ytStats,
        ytPosts,
        ytTimeline,
      })
    } catch {
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [preset, refreshKey])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Cross-platform performance insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date presets */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => setPreset(p.days)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: preset === p.days ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: preset === p.days ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-lg transition-all hover:bg-white/5"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: active ? t.color : undefined }} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl h-48 animate-pulse" style={{ background: '#2d2c2a' }} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'youtube' && (
            <YouTubeTab
              ytPosts={data.ytPosts}
              ytTimeline={data.ytTimeline}
              ytStats={data.ytStats}
            />
          )}
          {tab === 'instagram' && (
            <InstagramTab
              igPosts={data.igPosts}
              igReels={data.igReels}
              igStories={data.igStories}
              igStats={data.igStats}
              onSelectContent={setDetailContent}
            />
          )}
          {tab === 'linkedin' && (
            <LinkedInTab
              liPosts={data.liPosts}
              liStats={data.liStats}
              onSelectContent={setDetailContent}
            />
          )}
          {tab === 'twitter' && (
            <TwitterTab
              twPosts={data.twPosts}
              twStats={data.twStats}
              onSelectContent={setDetailContent}
            />
          )}
          {tab === 'roi' && (
            <ContentRoiTab
              igPosts={data.igPosts}
              igReels={data.igReels}
              twPosts={data.twPosts}
              liPosts={data.liPosts}
              ytPosts={data.ytPosts}
            />
          )}
        </>
      )}

      {/* Detail modal */}
      <ContentDetailModal
        item={detailContent}
        onClose={() => setDetailContent(null)}
      />
    </div>
  )
}
