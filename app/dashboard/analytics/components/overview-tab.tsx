'use client'

import { useMemo } from 'react'
import { Instagram, Twitter, Linkedin, Youtube, TrendingUp, TrendingDown, Minus, Eye, Heart, BarChart3, Users } from 'lucide-react'
import { fmtNum, avg, type AnalyticsData } from './analytics-types'
import { CHART_COLORS } from './chart-theme'
import { CrossPlatformReachChart, CrossPlatformEngagementChart, PostingVolumeChart } from './cross-platform-chart'
import { AiInsightsPanel } from './ai-insights-panel'

// ─── Hero stat card ──────────────────────────────────────────────────────────

function HeroStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color: color ?? '#fff' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{sub}</p>}
    </div>
  )
}

// ─── Platform card ───────────────────────────────────────────────────────────

function PlatformCard({ icon: Icon, name, color, iconBg, followers, posts, reach, engagement }: {
  icon: React.ElementType
  name: string
  color: string
  iconBg: string
  followers: number | null
  posts: number
  reach: number
  engagement: number
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{name}</p>
        </div>
        {followers != null && (
          <div className="text-right">
            <p className="text-sm font-bold font-mono" style={{ color }}>{fmtNum(followers)}</p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>followers</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Posts</p>
          <p className="text-sm font-bold font-mono text-white">{posts}</p>
        </div>
        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Reach</p>
          <p className="text-sm font-bold font-mono text-white">{fmtNum(reach)}</p>
        </div>
        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Eng Rate</p>
          <p className="text-sm font-bold font-mono" style={{ color: engagement > 3 ? '#10b981' : '#fff' }}>
            {engagement > 0 ? `${engagement.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Top content row ─────────────────────────────────────────────────────────

interface TopPost {
  platform: string
  platformColor: string
  content: string
  engagement: number
  reach: number
  likes: number
  imageUrl?: string | null
  date: string
}

function TopContentRow({ post, rank }: { post: TopPost; rank: number }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-1"
        style={{
          background: rank <= 3 ? `${post.platformColor}20` : 'rgba(255,255,255,0.05)',
          color: rank <= 3 ? post.platformColor : 'rgba(255,255,255,0.3)',
        }}
      >
        #{rank}
      </span>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ background: '#1a1a1a' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${post.platformColor}15`, color: post.platformColor }}>
            {post.platform}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{post.date}</span>
        </div>
        <p className="text-[11px] text-white/60 line-clamp-1">{post.content}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold font-mono" style={{ color: post.engagement > 5 ? '#10b981' : '#fff' }}>
          {post.engagement.toFixed(1)}%
        </p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{fmtNum(post.reach)} reach</p>
      </div>
    </div>
  )
}

// ─── Main overview tab ───────────────────────────────────────────────────────

export function OverviewTab({ data }: { data: AnalyticsData }) {
  const allIg = [...data.igPosts, ...data.igReels]

  // YouTube views from timeline (more accurate) or post-level data
  const ytTimelineViews = data.ytTimeline.reduce((s, p) => s + p.value, 0)
  const ytPostViews = data.ytPosts.reduce((s, p) => s + p.views, 0)
  const ytViews = ytTimelineViews > 0 ? ytTimelineViews : ytPostViews

  // Aggregate metrics
  const totalPosts = allIg.length + data.twPosts.length + data.liPosts.length + data.ytPosts.length
  const totalReach = allIg.reduce((s, p) => s + p.reach, 0)
    + data.twPosts.reduce((s, p) => s + p.totalImpressions, 0)
    + data.liPosts.reduce((s, p) => s + p.totalImpressions, 0)
    + ytViews
  const totalFollowers = (data.igStats?.Followers ?? 0) + (data.twStats?.Followers ?? 0) + (data.liStats?.Followers ?? 0) + (data.ytStats?.Subscribers ?? 0)
  const overallEngagement = avg([
    ...allIg.map(p => p.engagement),
    ...data.twPosts.map(p => p.totalEngagement),
    ...data.liPosts.map(p => p.totalEngagement),
    ...data.ytPosts.map(p => p.engagement),
  ])

  // Platform card data
  const igReach = allIg.reduce((s, p) => s + p.reach, 0)
  const igEng = avg(allIg.map(p => p.engagement))
  const twReach = data.twPosts.reduce((s, p) => s + p.totalImpressions, 0)
  const twEng = avg(data.twPosts.map(p => p.totalEngagement))
  const liReach = data.liPosts.reduce((s, p) => s + p.totalImpressions, 0)
  const liEng = avg(data.liPosts.map(p => p.totalEngagement))
  const ytEng = avg(data.ytPosts.map(p => p.engagement))

  // Top performing content across all platforms
  const topPosts = useMemo((): TopPost[] => {
    const posts: TopPost[] = []

    for (const p of allIg) {
      posts.push({
        platform: 'Instagram',
        platformColor: CHART_COLORS.instagram,
        content: p.content?.slice(0, 100) || '(no caption)',
        engagement: p.engagement,
        reach: p.reach,
        likes: p.likes,
        imageUrl: p.imageUrl,
        date: p.publishedAt?.dateTime ? new Date(p.publishedAt.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      })
    }
    for (const p of data.twPosts) {
      posts.push({
        platform: 'Twitter/X',
        platformColor: CHART_COLORS.twitter,
        content: p.text?.slice(0, 100) || '',
        engagement: p.totalEngagement,
        reach: p.totalImpressions,
        likes: p.totalLikes ?? 0,
        date: p.createdAt?.dateTime ? new Date(p.createdAt.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      })
    }
    for (const p of data.liPosts) {
      posts.push({
        platform: 'LinkedIn',
        platformColor: CHART_COLORS.linkedin,
        content: p.text?.slice(0, 100) || '',
        engagement: p.totalEngagement,
        reach: p.totalImpressions,
        likes: p.totalLikes,
        imageUrl: p.picture,
        date: p.createdAt?.dateTime ? new Date(p.createdAt.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      })
    }
    for (const p of data.ytPosts) {
      posts.push({
        platform: 'YouTube',
        platformColor: CHART_COLORS.youtube,
        content: p.title?.slice(0, 100) || '(untitled)',
        engagement: p.engagement,
        reach: p.views,
        likes: p.likes,
        imageUrl: p.thumbnailUrl,
        date: p.publishedAt?.dateTime ? new Date(p.publishedAt.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      })
    }

    return posts.sort((a, b) => b.engagement - a.engagement).slice(0, 5)
  }, [data.igPosts, data.igReels, data.twPosts, data.liPosts, data.ytPosts]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroStat
          label="Total Posts"
          value={String(totalPosts)}
          sub="across all platforms"
        />
        <HeroStat
          label="Total Reach"
          value={fmtNum(totalReach)}
          sub="impressions + views"
        />
        <HeroStat
          label="Avg Engagement"
          value={overallEngagement > 0 ? `${overallEngagement.toFixed(1)}%` : '—'}
          color={overallEngagement > 3 ? '#10b981' : '#fff'}
          sub="across social posts"
        />
        <HeroStat
          label="Total Followers"
          value={fmtNum(totalFollowers)}
          sub="across all platforms"
        />
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PlatformCard
          icon={Instagram}
          name="Instagram"
          color={CHART_COLORS.instagram}
          iconBg="linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)"
          followers={data.igStats?.Followers ?? null}
          posts={allIg.length}
          reach={igReach}
          engagement={igEng}
        />
        <PlatformCard
          icon={Twitter}
          name="Twitter / X"
          color={CHART_COLORS.twitter}
          iconBg={CHART_COLORS.twitter}
          followers={data.twStats?.Followers ?? null}
          posts={data.twPosts.length}
          reach={twReach}
          engagement={twEng}
        />
        <PlatformCard
          icon={Linkedin}
          name="LinkedIn"
          color={CHART_COLORS.linkedin}
          iconBg={CHART_COLORS.linkedin}
          followers={data.liStats?.Followers ?? null}
          posts={data.liPosts.length}
          reach={liReach}
          engagement={liEng}
        />
        <PlatformCard
          icon={Youtube}
          name="YouTube"
          color={CHART_COLORS.youtube}
          iconBg={CHART_COLORS.youtube}
          followers={data.ytStats?.Subscribers ?? null}
          posts={data.ytPosts.length}
          reach={ytViews}
          engagement={ytEng}
        />
      </div>

      {/* Cross-platform comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CrossPlatformReachChart
          igPosts={data.igPosts}
          igReels={data.igReels}
          twPosts={data.twPosts}
          liPosts={data.liPosts}
          ytViews={ytViews}
        />
        <CrossPlatformEngagementChart
          igPosts={data.igPosts}
          igReels={data.igReels}
          twPosts={data.twPosts}
          liPosts={data.liPosts}
          ytPosts={data.ytPosts}
        />
      </div>

      {/* Top performing content */}
      {topPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)' }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            </div>
            <h3 className="text-sm font-semibold text-white">Top Performing Content</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
              by engagement
            </span>
          </div>
          <div className="rounded-xl divide-y divide-white/[0.04]" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {topPosts.map((post, i) => (
              <TopContentRow key={i} post={post} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Posting volume */}
      <PostingVolumeChart
        igPosts={data.igPosts}
        igReels={data.igReels}
        twPosts={data.twPosts}
        liPosts={data.liPosts}
        ytPosts={data.ytPosts}
      />

      {/* AI Insights */}
      <AiInsightsPanel data={data} />
    </div>
  )
}
