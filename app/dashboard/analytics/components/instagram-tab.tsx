'use client'

import { useState, useMemo } from 'react'
import { Instagram, Eye, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from './chart-theme'
import {
  fmtNum, fmtDate, avg, IG_TYPE_LABELS,
  type InstagramPost, type InstagramStory, type InstagramStats, type SortKey,
} from './analytics-types'
import { StatPill } from './stat-pill'
import { SectionHeader, EmptySection, SortControl } from './section-helpers'
import { IgPostRow, ReelRow, StoryRow } from './post-rows'
import { BestTimeHeatmap } from './best-time-heatmap'
import { ConsistencyTracker } from './consistency-tracker'
import type { ContentItem } from '@/components/content-detail-modal'

interface InstagramTabProps {
  igPosts: InstagramPost[]
  igReels: InstagramPost[]
  igStories: InstagramStory[]
  igStats: InstagramStats | null
  onSelectContent: (item: ContentItem) => void
}

export function InstagramTab({ igPosts, igReels, igStories, igStats, onSelectContent }: InstagramTabProps) {
  const [igSort, setIgSort] = useState<SortKey>('engagement')

  const igSorted = useMemo(() => [...igPosts].sort((a, b) => {
    switch (igSort) {
      case 'engagement': return b.engagement - a.engagement
      case 'reach': return b.reach - a.reach
      case 'likes': return b.likes - a.likes
      case 'saved': return b.saved - a.saved
      case 'comments': return b.comments - a.comments
    }
  }), [igPosts, igSort])

  const igAvgEng = avg(igPosts.map(p => p.engagement))
  const igTotalReach = igPosts.reduce((s, p) => s + p.reach, 0)
  const igTotalLikes = igPosts.reduce((s, p) => s + p.likes, 0)
  const igTotalSaved = igPosts.reduce((s, p) => s + p.saved, 0)
  const igTotalComments = igPosts.reduce((s, p) => s + p.comments, 0)

  const igByType = igPosts.reduce((acc, p) => {
    const label = IG_TYPE_LABELS[p.type] ?? p.type
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Daily series for charts
  const dailySeries = useMemo(() => {
    const allPosts = [...igPosts, ...igReels]
      .filter(p => p.publishedAt?.dateTime)
      .sort((a, b) => new Date(a.publishedAt.dateTime).getTime() - new Date(b.publishedAt.dateTime).getTime())
    if (allPosts.length < 2) return []

    const byDay = new Map<string, { reach: number; likes: number; engagement: number[]; saved: number }>()
    for (const p of allPosts) {
      const key = p.publishedAt.dateTime.slice(0, 10)
      const entry = byDay.get(key) ?? { reach: 0, likes: 0, engagement: [], saved: 0 }
      entry.reach += p.reach
      entry.likes += p.likes
      entry.engagement.push(p.engagement)
      entry.saved += p.saved
      byDay.set(key, entry)
    }

    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date: fmtDate(date),
      reach: d.reach,
      likes: d.likes,
      engagement: Number((d.engagement.reduce((s, v) => s + v, 0) / d.engagement.length).toFixed(2)),
      saves: d.saved,
    }))
  }, [igPosts, igReels])

  // Sparkline data for stat pills
  const igDailySeries = useMemo(() => {
    const allPosts = [...igPosts, ...igReels]
      .filter(p => p.publishedAt?.dateTime)
      .sort((a, b) => new Date(a.publishedAt.dateTime).getTime() - new Date(b.publishedAt.dateTime).getTime())
    if (allPosts.length < 2) return { reach: [], likes: [], engagement: [], saved: [] }
    const byDay = new Map<string, { reach: number; likes: number; engagement: number[]; saved: number }>()
    for (const p of allPosts) {
      const key = p.publishedAt.dateTime.slice(0, 10)
      const entry = byDay.get(key) ?? { reach: 0, likes: 0, engagement: [], saved: 0 }
      entry.reach += p.reach; entry.likes += p.likes; entry.engagement.push(p.engagement); entry.saved += p.saved
      byDay.set(key, entry)
    }
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
    return {
      reach: days.map(([, d]) => d.reach),
      likes: days.map(([, d]) => d.likes),
      engagement: days.map(([, d]) => d.engagement.reduce((s, v) => s + v, 0) / d.engagement.length),
      saved: days.map(([, d]) => d.saved),
    }
  }, [igPosts, igReels])

  // Format performance for bar chart
  const formatPerformance = useMemo(() => {
    const allPosts = [...igPosts, ...igReels]
    const byType = new Map<string, { count: number; totalEng: number; totalReach: number }>()
    for (const p of allPosts) {
      const label = IG_TYPE_LABELS[p.type] ?? p.type
      const entry = byType.get(label) ?? { count: 0, totalEng: 0, totalReach: 0 }
      entry.count++
      entry.totalEng += p.engagement
      entry.totalReach += p.reach
      byType.set(label, entry)
    }
    return [...byType.entries()].map(([type, d]) => ({
      type,
      avgEngagement: Number((d.totalEng / d.count).toFixed(2)),
      avgReach: Math.round(d.totalReach / d.count),
      count: d.count,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement)
  }, [igPosts, igReels])

  return (
    <div className="space-y-8">
      {/* Stats overview */}
      {igStats && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-6" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">{fmtNum(igStats.Followers)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>followers</p>
          </div>
          <div className="ml-auto flex gap-6">
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-white">{igPosts.length + igReels.length}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>posts in period</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-white">{igStories.length}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>stories</p>
            </div>
          </div>
        </div>
      )}

      {/* Engagement & Reach charts */}
      {dailySeries.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Engagement Over Time</h3>
            <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Daily avg engagement %</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailySeries} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.engagement} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.engagement} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Engagement']} />
                <Area type="monotone" dataKey="engagement" stroke={CHART_COLORS.engagement} fill="url(#engGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Reach & Saves</h3>
            <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Daily reach and saves</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailySeries} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.reach} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.reach} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.saves} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.saves} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} width={45} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} width={35} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [fmtNum(v as number), name]} />
                <Area yAxisId="left" type="monotone" dataKey="reach" stroke={CHART_COLORS.reach} fill="url(#reachGrad)" strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="saves" stroke={CHART_COLORS.saves} fill="url(#savesGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill label="Reach" value={igTotalReach} sparkData={igDailySeries.reach} sparkColor={CHART_COLORS.reach} />
        <StatPill label="Likes" value={igTotalLikes} sparkData={igDailySeries.likes} sparkColor={CHART_COLORS.likes} />
        <StatPill label="Saves" value={igTotalSaved} sparkData={igDailySeries.saved} sparkColor={CHART_COLORS.saves} />
        <StatPill label="Comments" value={igTotalComments} />
        <StatPill
          label="Avg Engagement"
          value={`${igAvgEng.toFixed(1)}%`}
          color={igAvgEng > 5 ? 'text-green-400' : igAvgEng > 2 ? 'text-amber-400' : 'text-white'}
          sparkData={igDailySeries.engagement}
          sparkColor={CHART_COLORS.engagement}
        />
      </div>

      {/* Post type breakdown */}
      {Object.keys(igByType).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Types:</span>
          {Object.entries(igByType).map(([type, count]) => {
            const colors: Record<string, string> = { Carousel: '#3b82f6', Video: '#a855f7', Photo: '#10b981', Reel: '#f59e0b' }
            const c = colors[type] ?? '#888'
            return (
              <span key={type} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: `${c}15`, color: c }}>
                {type} ({count})
              </span>
            )
          })}
        </div>
      )}

      {/* Format performance chart */}
      {formatPerformance.length > 1 && (
        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">Format Performance</h3>
          <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Avg engagement by content type</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={formatPerformance} margin={CHART_MARGIN} barSize={36}>
              <CartesianGrid vertical={false} {...GRID_STYLE} />
              <XAxis dataKey="type" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => {
                  if (name === 'avgEngagement') return [`${v}%`, 'Avg Engagement']
                  return [v, name]
                }}
              />
              <Bar dataKey="avgEngagement" fill={CHART_COLORS.engagement} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best Time to Post */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionHeader icon={TrendingUp} iconBg="rgba(139,92,246,0.3)" title="Best Time to Post" />
        <BestTimeHeatmap posts={[...igPosts, ...igReels]} />
      </div>

      {/* Consistency */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionHeader icon={TrendingUp} iconBg="rgba(168,85,247,0.3)" title="Posting Consistency" />
        <ConsistencyTracker posts={igPosts} reels={igReels} />
      </div>

      {/* Feed posts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Instagram} iconBg="linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" title="Feed Posts" count={igPosts.length} />
          <SortControl sort={igSort} setSort={setIgSort} />
        </div>
        {igSorted.length === 0 ? (
          <EmptySection label="No feed posts in this period" />
        ) : (
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {igSorted.map(p => (
              <IgPostRow
                key={p.postId}
                post={p}
                onSelect={() => onSelectContent({ platform: 'ig_post', data: p as never })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reels */}
      {igReels.length > 0 && (
        <div>
          <SectionHeader icon={Instagram} iconBg="rgba(168,85,247,0.3)" title="Reels" count={igReels.length} />
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[...igReels].sort((a, b) => b.engagement - a.engagement).map(p => (
              <ReelRow
                key={p.postId}
                post={p}
                onSelect={() => onSelectContent({ platform: 'ig_reel', data: p as never })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stories */}
      {igStories.length > 0 && (
        <div>
          <SectionHeader icon={Eye} iconBg="rgba(245,158,11,0.3)" title="Stories" count={igStories.length} countLabel="stories" />
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {igStories.map(s => (
              <StoryRow
                key={s.postId}
                story={s}
                onSelect={() => onSelectContent({ platform: 'ig_story', data: s as never })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
