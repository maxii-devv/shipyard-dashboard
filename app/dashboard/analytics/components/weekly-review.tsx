'use client'

import { useMemo } from 'react'
import { Instagram, Linkedin, Youtube, Twitter, Calendar } from 'lucide-react'
import { fmtDate, fmtNum, type InstagramPost, type TwitterPost, type LinkedInPost, type InstagramStats, type TwitterStats, type LinkedInStats, type YouTubeStats } from './analytics-types'
import { ChangeBadge } from './section-helpers'

interface WeeklyPlatformData {
  thisWeek: { posts: number; reach: number; likes: number; comments: number; engagement: number; followers?: number }
  lastWeek: { posts: number; reach: number; likes: number; comments: number; engagement: number; followers?: number }
}

export function WeeklyReview({ igPosts, igReels, twPosts, liPosts, igStats, twStats, liStats, ytStats }: {
  igPosts: InstagramPost[]; igReels: InstagramPost[]; twPosts: TwitterPost[]; liPosts: LinkedInPost[]
  igStats: InstagramStats | null; twStats: TwitterStats | null; liStats: LinkedInStats | null; ytStats: YouTubeStats | null
}) {
  const data = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - mondayOffset)
    thisMonday.setHours(0, 0, 0, 0)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)

    const inThisWeek = (dt?: string) => dt ? new Date(dt) >= thisMonday : false
    const inLastWeek = (dt?: string) => { if (!dt) return false; const d = new Date(dt); return d >= lastMonday && d < thisMonday }

    const allIg = [...igPosts, ...igReels]
    const igThisWeek = allIg.filter(p => inThisWeek(p.publishedAt?.dateTime))
    const igLastWeek = allIg.filter(p => inLastWeek(p.publishedAt?.dateTime))
    const ig: WeeklyPlatformData = {
      thisWeek: {
        posts: igThisWeek.length,
        reach: igThisWeek.reduce((s, p) => s + p.reach, 0),
        likes: igThisWeek.reduce((s, p) => s + p.likes, 0),
        comments: igThisWeek.reduce((s, p) => s + p.comments, 0),
        engagement: igThisWeek.length ? igThisWeek.reduce((s, p) => s + p.engagement, 0) / igThisWeek.length : 0,
        followers: igStats?.Followers,
      },
      lastWeek: {
        posts: igLastWeek.length,
        reach: igLastWeek.reduce((s, p) => s + p.reach, 0),
        likes: igLastWeek.reduce((s, p) => s + p.likes, 0),
        comments: igLastWeek.reduce((s, p) => s + p.comments, 0),
        engagement: igLastWeek.length ? igLastWeek.reduce((s, p) => s + p.engagement, 0) / igLastWeek.length : 0,
      },
    }

    const twThisWeek = twPosts.filter(p => inThisWeek(p.createdAt?.dateTime))
    const twLastWeek = twPosts.filter(p => inLastWeek(p.createdAt?.dateTime))
    const tw: WeeklyPlatformData = {
      thisWeek: {
        posts: twThisWeek.length,
        reach: twThisWeek.reduce((s, p) => s + p.totalImpressions, 0),
        likes: twThisWeek.reduce((s, p) => s + p.totalLikes, 0),
        comments: twThisWeek.reduce((s, p) => s + (p.totalReplies ?? 0), 0),
        engagement: twThisWeek.length ? twThisWeek.reduce((s, p) => s + p.totalEngagement, 0) / twThisWeek.length : 0,
        followers: twStats?.Followers,
      },
      lastWeek: {
        posts: twLastWeek.length,
        reach: twLastWeek.reduce((s, p) => s + p.totalImpressions, 0),
        likes: twLastWeek.reduce((s, p) => s + p.totalLikes, 0),
        comments: twLastWeek.reduce((s, p) => s + (p.totalReplies ?? 0), 0),
        engagement: twLastWeek.length ? twLastWeek.reduce((s, p) => s + p.totalEngagement, 0) / twLastWeek.length : 0,
      },
    }

    const liThisWeek = liPosts.filter(p => inThisWeek(p.createdAt?.dateTime))
    const liLastWeek = liPosts.filter(p => inLastWeek(p.createdAt?.dateTime))
    const li: WeeklyPlatformData = {
      thisWeek: {
        posts: liThisWeek.length,
        reach: liThisWeek.reduce((s, p) => s + p.totalImpressions, 0),
        likes: liThisWeek.reduce((s, p) => s + p.totalLikes, 0),
        comments: liThisWeek.reduce((s, p) => s + p.totalComments, 0),
        engagement: liThisWeek.length ? liThisWeek.reduce((s, p) => s + p.totalEngagement, 0) / liThisWeek.length : 0,
        followers: liStats?.Followers,
      },
      lastWeek: {
        posts: liLastWeek.length,
        reach: liLastWeek.reduce((s, p) => s + p.totalImpressions, 0),
        likes: liLastWeek.reduce((s, p) => s + p.totalLikes, 0),
        comments: liLastWeek.reduce((s, p) => s + p.totalComments, 0),
        engagement: liLastWeek.length ? liLastWeek.reduce((s, p) => s + p.totalEngagement, 0) / liLastWeek.length : 0,
      },
    }

    return { ig, tw, li }
  }, [igPosts, igReels, twPosts, liPosts, igStats, twStats, liStats])

  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - mondayOffset)
  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)
  const weekLabel = `${fmtDate(thisMonday.toISOString())} – ${fmtDate(thisSunday.toISOString())}`

  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, iconBg: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', color: '#e1306c', data: data.ig, reachLabel: 'Reach' },
    { key: 'twitter', label: 'Twitter / X', icon: Twitter, iconBg: '#1d9bf0', color: '#1d9bf0', data: data.tw, reachLabel: 'Impressions' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, iconBg: '#0a66c2', color: '#0a66c2', data: data.li, reachLabel: 'Impressions' },
  ]

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.3)' }}>
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Weekly Review</h2>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{weekLabel}</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
          vs prior week
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {platforms.map(({ key, label, icon: Icon, iconBg, color, data: pd, reachLabel }) => {
          const hasData = pd.thisWeek.posts > 0 || pd.lastWeek.posts > 0
          return (
            <div key={key} className="rounded-xl overflow-hidden" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1"><p className="text-sm font-medium text-white">{label}</p></div>
                {pd.thisWeek.followers != null && (
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono" style={{ color }}>{fmtNum(pd.thisWeek.followers)}</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>followers</p>
                  </div>
                )}
              </div>
              {!hasData ? (
                <div className="px-4 pb-4">
                  <p className="text-[11px] text-center py-4" style={{ color: 'rgba(255,255,255,0.15)' }}>No posts this week or last</p>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-2">
                  {([
                    { label: 'Posts', thisVal: pd.thisWeek.posts, lastVal: pd.lastWeek.posts },
                    { label: reachLabel, thisVal: pd.thisWeek.reach, lastVal: pd.lastWeek.reach },
                    { label: 'Likes', thisVal: pd.thisWeek.likes, lastVal: pd.lastWeek.likes },
                    { label: 'Comments', thisVal: pd.thisWeek.comments, lastVal: pd.lastWeek.comments },
                    { label: 'Avg Engagement', thisVal: pd.thisWeek.engagement, lastVal: pd.lastWeek.engagement, isPercent: true },
                  ] as { label: string; thisVal: number; lastVal: number; isPercent?: boolean }[]).map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-white">
                          {row.isPercent ? `${row.thisVal.toFixed(1)}%` : fmtNum(row.thisVal)}
                        </span>
                        <ChangeBadge current={row.thisVal} previous={row.lastVal} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {ytStats && (
        <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#dc2626' }}>
            <Youtube className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-medium text-white flex-1">YouTube</p>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Subscribers</p>
              <p className="text-sm font-mono font-bold text-red-400">{fmtNum(ytStats.Subscribers)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Total Views</p>
              <p className="text-sm font-mono font-bold text-white">{fmtNum(ytStats.Views)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Videos</p>
              <p className="text-sm font-mono font-bold text-white">{fmtNum(ytStats.Videos)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
