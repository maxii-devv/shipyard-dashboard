'use client'

import { useMemo } from 'react'
import { Youtube, Eye, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from './chart-theme'
import { fmtNum, fmtDate, type YouTubePost, type YouTubeStats, type TimelinePoint } from './analytics-types'
import { StatPill } from './stat-pill'
import { SectionHeader, EmptySection } from './section-helpers'

interface YouTubeTabProps {
  ytPosts: YouTubePost[]
  ytTimeline: TimelinePoint[]
  ytStats: YouTubeStats | null
}

export function YouTubeTab({ ytPosts, ytTimeline, ytStats }: YouTubeTabProps) {
  const totalViews = ytPosts.reduce((s, p) => s + p.views, 0)
  const totalLikes = ytPosts.reduce((s, p) => s + p.likes, 0)
  const totalComments = ytPosts.reduce((s, p) => s + p.comments, 0)
  const totalMinutes = ytPosts.reduce((s, p) => s + p.estimatedMinutesWatched, 0)
  const timelineViews = ytTimeline.reduce((s, p) => s + p.value, 0)

  // Use timeline total if available (more accurate than post-level), fall back to post-level
  const displayViews = timelineViews > 0 ? timelineViews : totalViews

  // Daily views chart data from timeline
  const dailyViewsData = useMemo(() => {
    if (ytTimeline.length < 2) return []
    return ytTimeline.map(p => ({
      date: fmtDate(p.date),
      views: p.value,
    }))
  }, [ytTimeline])

  // Sparkline data
  const viewsSpark = useMemo(() => ytTimeline.map(p => p.value), [ytTimeline])

  // Sort videos by views
  const sortedVideos = useMemo(() =>
    [...ytPosts].sort((a, b) => b.views - a.views),
  [ytPosts])

  return (
    <div className="space-y-8">
      {/* Stats overview */}
      <div className="rounded-xl px-5 py-4 flex items-center gap-6" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: CHART_COLORS.youtube }}>
          <Youtube className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-white">{fmtNum(displayViews)}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>views in period</p>
        </div>
        <div className="ml-auto flex gap-6">
          {ytStats?.Subscribers != null && (
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-white">{fmtNum(ytStats.Subscribers)}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>subscribers</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-white">{ytPosts.length}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>videos in period</p>
          </div>
        </div>
      </div>

      {/* Daily views chart */}
      {dailyViewsData.length > 1 && (
        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">Daily Views</h3>
          <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Views per day from YouTube timeline</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyViewsData} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="ytViewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.youtube} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.youtube} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} {...GRID_STYLE} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtNum(v as number), 'Views']} />
              <Area type="monotone" dataKey="views" stroke={CHART_COLORS.youtube} fill="url(#ytViewsGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill label="Views" value={displayViews} sparkData={viewsSpark} sparkColor={CHART_COLORS.youtube} />
        <StatPill label="Likes" value={totalLikes} sparkColor={CHART_COLORS.likes} />
        <StatPill label="Comments" value={totalComments} />
        <StatPill label="Videos" value={ytPosts.length} />
        {totalMinutes > 0 && (
          <StatPill label="Watch Time" value={`${fmtNum(Math.round(totalMinutes / 60))}h`} />
        )}
      </div>

      {/* Video list */}
      <div>
        <SectionHeader icon={Youtube} iconBg={CHART_COLORS.youtube} title="Videos" count={ytPosts.length} countLabel="videos" />
        {sortedVideos.length === 0 ? (
          <EmptySection label="No YouTube videos in this period" />
        ) : (
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {sortedVideos.map((video, i) => (
              <div key={video.postId || i} className="flex items-start gap-3 p-3">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="w-24 h-14 rounded-lg object-cover shrink-0"
                    style={{ background: '#1a1a1a' }}
                  />
                ) : (
                  <div className="w-24 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                    <Youtube className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {video.publishedAt?.dateTime ? fmtDate(video.publishedAt.dateTime) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">
                    {video.title || '(untitled)'}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <Eye className="w-3 h-3" /> {fmtNum(video.views)} views
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {fmtNum(video.likes)} likes
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {fmtNum(video.comments)} comments
                    </span>
                    {video.estimatedMinutesWatched > 0 && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <Clock className="w-3 h-3" /> {fmtNum(Math.round(video.estimatedMinutesWatched))}m watched
                      </span>
                    )}
                    {video.engagement > 0 && (
                      <span className="text-[11px] font-semibold" style={{ color: video.engagement > 5 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                        {video.engagement.toFixed(1)}% eng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
