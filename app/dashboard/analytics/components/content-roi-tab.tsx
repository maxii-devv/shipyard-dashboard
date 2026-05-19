'use client'

import { useMemo } from 'react'
import { BarChart2, TrendingUp, PieChart, Award } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from './chart-theme'
import {
  fmtNum, IG_TYPE_LABELS,
  type InstagramPost, type TwitterPost, type LinkedInPost, type YouTubePost,
} from './analytics-types'
import { SectionHeader, EmptySection } from './section-helpers'

interface ContentRoiTabProps {
  igPosts: InstagramPost[]
  igReels: InstagramPost[]
  twPosts: TwitterPost[]
  liPosts: LinkedInPost[]
  ytPosts?: YouTubePost[]
}

const PIE_COLORS = ['#e1306c', '#1d9bf0', '#0a66c2', '#dc2626', '#a855f7', '#10b981', '#f59e0b']

interface UnifiedPost {
  platform: string
  type: string
  engagement: number
  reach: number
  content: string
  date: string
}

export function ContentRoiTab({ igPosts, igReels, twPosts, liPosts, ytPosts = [] }: ContentRoiTabProps) {
  // Unify all posts into a single format
  const allPosts: UnifiedPost[] = useMemo(() => {
    const posts: UnifiedPost[] = []

    for (const p of igPosts) {
      posts.push({
        platform: 'Instagram',
        type: IG_TYPE_LABELS[p.type] ?? p.type,
        engagement: p.engagement,
        reach: p.reach,
        content: p.content?.slice(0, 80) ?? '(no caption)',
        date: p.publishedAt?.dateTime ?? '',
      })
    }
    for (const p of igReels) {
      posts.push({
        platform: 'Instagram',
        type: 'Reel',
        engagement: p.engagement,
        reach: p.reach,
        content: p.content?.slice(0, 80) ?? '(no caption)',
        date: p.publishedAt?.dateTime ?? '',
      })
    }
    for (const p of twPosts) {
      posts.push({
        platform: 'Twitter/X',
        type: 'Tweet',
        engagement: p.totalEngagement,
        reach: p.totalImpressions,
        content: p.text?.slice(0, 80) ?? '',
        date: p.createdAt?.dateTime ?? '',
      })
    }
    for (const p of liPosts) {
      posts.push({
        platform: 'LinkedIn',
        type: 'Post',
        engagement: p.totalEngagement,
        reach: p.totalImpressions,
        content: p.text?.slice(0, 80) ?? '',
        date: p.createdAt?.dateTime ?? '',
      })
    }
    for (const p of ytPosts) {
      posts.push({
        platform: 'YouTube',
        type: 'Video',
        engagement: p.engagement,
        reach: p.views,
        content: p.title?.slice(0, 80) ?? '(untitled)',
        date: p.publishedAt?.dateTime ?? '',
      })
    }

    return posts
  }, [igPosts, igReels, twPosts, liPosts, ytPosts])

  // Format performance (avg engagement by content type)
  const formatPerformance = useMemo(() => {
    const byType = new Map<string, { count: number; totalEng: number; totalReach: number }>()
    for (const p of allPosts) {
      const key = `${p.platform} ${p.type}`
      const entry = byType.get(key) ?? { count: 0, totalEng: 0, totalReach: 0 }
      entry.count++
      entry.totalEng += p.engagement
      entry.totalReach += p.reach
      byType.set(key, entry)
    }
    return [...byType.entries()]
      .map(([type, d]) => ({
        type,
        avgEngagement: Number((d.totalEng / d.count).toFixed(2)),
        avgReach: Math.round(d.totalReach / d.count),
        count: d.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
  }, [allPosts])

  // Platform performance
  const platformPerformance = useMemo(() => {
    const byPlatform = new Map<string, { count: number; totalEng: number; totalReach: number }>()
    for (const p of allPosts) {
      const entry = byPlatform.get(p.platform) ?? { count: 0, totalEng: 0, totalReach: 0 }
      entry.count++
      entry.totalEng += p.engagement
      entry.totalReach += p.reach
      byPlatform.set(p.platform, entry)
    }
    return [...byPlatform.entries()].map(([platform, d]) => ({
      platform,
      avgEngagement: Number((d.totalEng / d.count).toFixed(2)),
      avgReach: Math.round(d.totalReach / d.count),
      count: d.count,
    }))
  }, [allPosts])

  // Content mix (pie chart data)
  const contentMix = useMemo(() => {
    const byType = new Map<string, number>()
    for (const p of allPosts) {
      byType.set(p.type, (byType.get(p.type) ?? 0) + 1)
    }
    return [...byType.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [allPosts])

  // Top performers
  const topPerformers = useMemo(() => {
    return [...allPosts].sort((a, b) => b.engagement - a.engagement).slice(0, 10)
  }, [allPosts])

  // Reach efficiency (reach per post by platform)
  const reachEfficiency = useMemo(() => {
    return platformPerformance.map(p => ({
      platform: p.platform,
      reachPerPost: p.avgReach,
      fill: p.platform === 'YouTube' ? CHART_COLORS.youtube
        : p.platform === 'Instagram' ? CHART_COLORS.instagram
        : p.platform === 'Twitter/X' ? CHART_COLORS.twitter
        : CHART_COLORS.linkedin,
    }))
  }, [platformPerformance])

  if (allPosts.length === 0) {
    return <EmptySection label="No content data available for ROI analysis" />
  }

  return (
    <div className="space-y-8">
      {/* Format Performance */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionHeader icon={BarChart2} iconBg="rgba(59,130,246,0.3)" title="Format Performance" />
        <p className="text-[10px] -mt-3 mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Avg engagement % by content type across all platforms</p>
        <ResponsiveContainer width="100%" height={Math.max(180, formatPerformance.length * 36)}>
          <BarChart data={formatPerformance} layout="vertical" margin={{ ...CHART_MARGIN, left: 100 }}>
            <CartesianGrid horizontal={false} {...GRID_STYLE} />
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="type" tick={AXIS_TICK} axisLine={false} tickLine={false} width={100} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, _name, entry) => {
                const count = (entry as { payload?: { count?: number } })?.payload?.count ?? 0
                return [`${v}% (${count} posts)`, 'Avg Engagement']
              }}
            />
            <Bar dataKey="avgEngagement" fill={CHART_COLORS.engagement} radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Reach efficiency + content mix side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <SectionHeader icon={TrendingUp} iconBg="rgba(16,185,129,0.3)" title="Reach Efficiency" />
          <p className="text-[10px] -mt-3 mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Avg reach per post by platform</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reachEfficiency} margin={CHART_MARGIN} barSize={40}>
              <CartesianGrid vertical={false} {...GRID_STYLE} />
              <XAxis dataKey="platform" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtNum(v as number), 'Avg Reach/Post']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="reachPerPost" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <SectionHeader icon={PieChart} iconBg="rgba(168,85,247,0.3)" title="Content Mix" />
          <p className="text-[10px] -mt-3 mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Distribution of content types</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <RePieChart>
                <Pie
                  data={contentMix}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  stroke="none"
                >
                  {contentMix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {contentMix.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[11px] flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.name}</span>
                  <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top performers */}
      <div>
        <SectionHeader icon={Award} iconBg="rgba(245,158,11,0.3)" title="Top Performing Content" count={topPerformers.length} countLabel="posts" />
        <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          {topPerformers.map((p, i) => {
            const platformColor = p.platform === 'Instagram' ? CHART_COLORS.instagram
              : p.platform === 'Twitter/X' ? CHART_COLORS.twitter
              : CHART_COLORS.linkedin
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ background: i < 3 ? `${platformColor}25` : 'rgba(255,255,255,0.05)', color: i < 3 ? platformColor : 'rgba(255,255,255,0.3)' }}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${platformColor}15`, color: platformColor }}>
                      {p.platform}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                      {p.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 line-clamp-1">{p.content}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono" style={{ color: p.engagement > 5 ? '#10b981' : '#fff' }}>
                    {p.engagement.toFixed(1)}%
                  </p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmtNum(p.reach)} reach</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
