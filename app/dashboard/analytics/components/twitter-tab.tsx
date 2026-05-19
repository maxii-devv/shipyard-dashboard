'use client'

import { useMemo } from 'react'
import { Twitter } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from './chart-theme'
import { fmtNum, fmtDate, avg, type TwitterPost, type TwitterStats } from './analytics-types'
import { StatPill } from './stat-pill'
import { SectionHeader, EmptySection } from './section-helpers'
import { TweetRow } from './post-rows'
import type { ContentItem } from '@/components/content-detail-modal'

interface TwitterTabProps {
  twPosts: TwitterPost[]
  twStats: TwitterStats | null
  onSelectContent: (item: ContentItem) => void
}

export function TwitterTab({ twPosts, twStats, onSelectContent }: TwitterTabProps) {
  const twTotalImpressions = twPosts.reduce((s, p) => s + p.totalImpressions, 0)
  const twTotalLikes = twPosts.reduce((s, p) => s + p.totalLikes, 0)
  const twAvgEng = avg(twPosts.map(p => p.totalEngagement))
  const twTotalRetweets = twPosts.reduce((s, p) => s + (p.totalRetweets ?? 0), 0)
  const twTotalReplies = twPosts.reduce((s, p) => s + (p.totalReplies ?? 0), 0)

  const dailySeries = useMemo(() => {
    const withDates = twPosts.filter(p => p.createdAt?.dateTime)
    if (withDates.length < 2) return []
    const sorted = [...withDates].sort(
      (a, b) => new Date(a.createdAt.dateTime).getTime() - new Date(b.createdAt.dateTime).getTime()
    )
    const byDay = new Map<string, { impressions: number; engagement: number[]; likes: number }>()
    for (const p of sorted) {
      const key = p.createdAt.dateTime.slice(0, 10)
      const entry = byDay.get(key) ?? { impressions: 0, engagement: [], likes: 0 }
      entry.impressions += p.totalImpressions
      entry.engagement.push(p.totalEngagement)
      entry.likes += p.totalLikes
      byDay.set(key, entry)
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date: fmtDate(date),
      impressions: d.impressions,
      engagement: Number((d.engagement.reduce((s, v) => s + v, 0) / d.engagement.length).toFixed(2)),
      likes: d.likes,
    }))
  }, [twPosts])

  const impressionsSeries = useMemo(() => {
    return [...twPosts]
      .filter(p => p.createdAt?.dateTime)
      .sort((a, b) => new Date(a.createdAt.dateTime).getTime() - new Date(b.createdAt.dateTime).getTime())
      .map(p => p.totalImpressions)
  }, [twPosts])

  return (
    <div className="space-y-8">
      {/* Stats overview */}
      {twStats && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-6" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: CHART_COLORS.twitter }}>
            <Twitter className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">{fmtNum(twStats.Followers)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>followers</p>
          </div>
          <div className="ml-auto">
            <p className="text-lg font-bold font-mono text-white">{twPosts.length}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>tweets in period</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {dailySeries.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Impressions Over Time</h3>
            <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Daily tweet impressions</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailySeries} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="twImpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.twitter} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.twitter} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} width={45} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtNum(v as number), 'Impressions']} />
                <Area type="monotone" dataKey="impressions" stroke={CHART_COLORS.twitter} fill="url(#twImpGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Engagement Over Time</h3>
            <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Daily avg engagement %</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailySeries} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="twEngGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.engagement} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.engagement} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Engagement']} />
                <Area type="monotone" dataKey="engagement" stroke={CHART_COLORS.engagement} fill="url(#twEngGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill label="Impressions" value={twTotalImpressions} sparkData={impressionsSeries} sparkColor={CHART_COLORS.twitter} />
        <StatPill label="Likes" value={twTotalLikes} sparkColor={CHART_COLORS.likes} />
        <StatPill label="Retweets" value={twTotalRetweets} />
        <StatPill label="Replies" value={twTotalReplies} />
        <StatPill
          label="Avg Engagement"
          value={`${twAvgEng.toFixed(1)}%`}
          color={twAvgEng > 3 ? 'text-green-400' : 'text-white'}
        />
      </div>

      {/* Tweet list */}
      <div>
        <SectionHeader icon={Twitter} iconBg={CHART_COLORS.twitter} title="Tweets" count={twPosts.length} countLabel="tweets" />
        {twPosts.length === 0 ? (
          <EmptySection label="No tweets in this period" />
        ) : (
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[...twPosts].sort((a, b) => b.totalEngagement - a.totalEngagement).map(t => (
              <TweetRow
                key={t.tweetId}
                tweet={t}
                onSelect={() => onSelectContent({ platform: 'tweet', data: t as never })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
