'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from './chart-theme'
import { fmtNum, avg, type InstagramPost, type TwitterPost, type LinkedInPost, type YouTubePost } from './analytics-types'

interface CrossPlatformChartProps {
  igPosts: InstagramPost[]
  igReels: InstagramPost[]
  twPosts: TwitterPost[]
  liPosts: LinkedInPost[]
  ytViews?: number
  ytPosts?: YouTubePost[]
}

export function CrossPlatformReachChart({ igPosts, igReels, twPosts, liPosts, ytViews = 0 }: CrossPlatformChartProps) {
  const data = useMemo(() => {
    const allIg = [...igPosts, ...igReels]
    return [
      { platform: 'YouTube', value: ytViews, fill: CHART_COLORS.youtube },
      { platform: 'Instagram', value: allIg.reduce((s, p) => s + p.reach, 0), fill: CHART_COLORS.instagram },
      { platform: 'LinkedIn', value: liPosts.reduce((s, p) => s + p.totalImpressions, 0), fill: CHART_COLORS.linkedin },
      { platform: 'Twitter/X', value: twPosts.reduce((s, p) => s + p.totalImpressions, 0), fill: CHART_COLORS.twitter },
    ]
  }, [igPosts, igReels, twPosts, liPosts, ytViews])

  if (data.every(d => d.value === 0)) return null

  return (
    <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Total Reach / Impressions</h3>
      <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Across all platforms in period</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={CHART_MARGIN} barSize={40}>
          <CartesianGrid vertical={false} {...GRID_STYLE} />
          <XAxis dataKey="platform" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} width={45} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [fmtNum(value as number), 'Reach']}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CrossPlatformEngagementChart({ igPosts, igReels, twPosts, liPosts, ytPosts = [] }: CrossPlatformChartProps) {
  const data = useMemo(() => {
    const allIg = [...igPosts, ...igReels]
    return [
      { platform: 'YouTube', value: avg(ytPosts.map(p => p.engagement)), fill: CHART_COLORS.youtube },
      { platform: 'Instagram', value: avg(allIg.map(p => p.engagement)), fill: CHART_COLORS.instagram },
      { platform: 'LinkedIn', value: avg(liPosts.map(p => p.totalEngagement)), fill: CHART_COLORS.linkedin },
      { platform: 'Twitter/X', value: avg(twPosts.map(p => p.totalEngagement)), fill: CHART_COLORS.twitter },
    ]
  }, [igPosts, igReels, twPosts, liPosts, ytPosts])

  if (data.every(d => d.value === 0)) return null

  return (
    <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Avg Engagement Rate</h3>
      <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Average engagement % per post</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={CHART_MARGIN} barSize={40}>
          <CartesianGrid vertical={false} {...GRID_STYLE} />
          <XAxis dataKey="platform" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={45} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Engagement']}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PostingVolumeChart({ igPosts, igReels, twPosts, liPosts, ytPosts = [] }: CrossPlatformChartProps) {
  const data = useMemo(() => {
    const allIg = [...igPosts, ...igReels]

    // Build weekly buckets
    const weeks: { label: string; start: Date; end: Date }[] = []
    const now = new Date()
    for (let w = 11; w >= 0; w--) {
      const start = new Date(now)
      start.setDate(now.getDate() - (w + 1) * 7)
      const end = new Date(now)
      end.setDate(now.getDate() - w * 7)
      const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeks.push({ label, start, end })
    }

    return weeks.map(({ label, start, end }) => ({
      week: label,
      YouTube: ytPosts.filter(p => { if (!p.publishedAt?.dateTime) return false; const d = new Date(p.publishedAt.dateTime); return d >= start && d < end }).length,
      Instagram: allIg.filter(p => { if (!p.publishedAt?.dateTime) return false; const d = new Date(p.publishedAt.dateTime); return d >= start && d < end }).length,
      'Twitter/X': twPosts.filter(p => { if (!p.createdAt?.dateTime) return false; const d = new Date(p.createdAt.dateTime); return d >= start && d < end }).length,
      LinkedIn: liPosts.filter(p => { if (!p.createdAt?.dateTime) return false; const d = new Date(p.createdAt.dateTime); return d >= start && d < end }).length,
    }))
  }, [igPosts, igReels, twPosts, liPosts, ytPosts])

  if (data.every(d => d.Instagram === 0 && d['Twitter/X'] === 0 && d.LinkedIn === 0 && d.YouTube === 0)) return null

  return (
    <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 className="text-sm font-semibold text-white mb-1">Posting Volume</h3>
      <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Posts per week by platform (last 12 weeks)</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} {...GRID_STYLE} />
          <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
          <Bar dataKey="YouTube" stackId="a" fill={CHART_COLORS.youtube} />
          <Bar dataKey="Instagram" stackId="a" fill={CHART_COLORS.instagram} />
          <Bar dataKey="Twitter/X" stackId="a" fill={CHART_COLORS.twitter} />
          <Bar dataKey="LinkedIn" stackId="a" fill={CHART_COLORS.linkedin} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
