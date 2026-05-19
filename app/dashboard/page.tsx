import Link from 'next/link'
import { extractPatterns, type BreakdownRow } from '@/lib/services/viralPatternsService'
import { getTopMoversWithHistory, type TopMover, type HistoryPoint } from '@/lib/services/growthService'
import { getPostingActivity, getPostingInsight, getLatestPost } from '@/lib/services/postingActivityService'
import { PostingHeatmap } from '@/components/posting-heatmap'
import { PerformanceView } from '@/components/performance-view'
import { MoverGrid } from '@/components/mover-grid'
import { CoachTabs } from '@/components/coach-tabs'
import { CoachChat } from '@/components/coach-chat'
import { LastPostCoach } from '@/components/last-post-coach'
import { generateInsights, generateSalesInsights, generateLastPostCoaching } from '@/lib/services/coachInsightsService'
import {
  TrendingUp,
  Zap,
  Layers,
  Eye,
  Bookmark,
  Heart,
  FileText,
} from 'lucide-react'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export const dynamic = 'force-dynamic'

function fmt(n: number | null | undefined): string {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(Math.round(v))
}

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const days = Math.min(Math.max(parseInt(params.days ?? '90', 10), 1), 365)
  const moversWindow = Math.min(days, 14)

  let data: Awaited<ReturnType<typeof extractPatterns>>
  let movers: (TopMover & { history: HistoryPoint[] })[] = []
  let activity: Awaited<ReturnType<typeof getPostingActivity>> = []
  let insight: Awaited<ReturnType<typeof getPostingInsight>> | null = null
  let latestPost: Awaited<ReturnType<typeof getLatestPost>> = null
  try {
    [data, movers, activity, insight, latestPost] = await Promise.all([
      extractPatterns(days),
      getTopMoversWithHistory(moversWindow, 8),
      getPostingActivity(365),
      getPostingInsight(Math.max(days, 90)),
      getLatestPost(),
    ])
  } catch (e) {
    return (
      <div className="p-8" style={{ background: '#262624', minHeight: '100vh' }}>
        <h1 className="text-2xl font-bold text-white mb-4">Viral Coach</h1>
        <p className="text-red-400 text-sm">
          Could not connect to database. Check DATABASE_URL in .env.local.
        </p>
        <pre className="text-xs text-white/40 mt-3">{(e as Error).message}</pre>
      </div>
    )
  }

  const { baseline, outliers, patterns, breakdown } = data
  const viewsCoach = generateInsights({ baseline, breakdown, insight, movers })
  const salesCoach = generateSalesInsights({ baseline, breakdown, insight, movers })
  const lastPostCoaching = latestPost ? generateLastPostCoaching(latestPost, baseline) : null

  return (
    <div className="p-8 space-y-6" style={{ background: '#262624', minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting()}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            What&apos;s working in your last {days} days of content
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[30, 60, 90].map(d => (
            <Link
              key={d}
              href={`/dashboard?days=${d}`}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: days === d ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.04)',
                color: days === d ? '#f87171' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${days === d ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {patterns.sample_size_warning && (
        <div
          className="rounded-xl px-4 py-3 text-[12px]"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.18)',
            color: '#fbbf24',
          }}
        >
          {patterns.sample_size_warning}
        </div>
      )}

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Avg Views"
          value={fmt(baseline.avg_views)}
          icon={<Eye className="w-5 h-5" />}
          iconColor="#60a5fa"
        />
        <StatCard
          label="Avg Saves"
          value={fmt(baseline.avg_saves)}
          icon={<Bookmark className="w-5 h-5" />}
          iconColor="#fbbf24"
        />
        <StatCard
          label="Avg Likes"
          value={fmt(baseline.avg_likes)}
          icon={<Heart className="w-5 h-5" />}
          iconColor="#e1306c"
        />
        <StatCard
          label="Engagement"
          value={`${((baseline.avg_engagement_rate ?? 0) * 100).toFixed(1)}%`}
          icon={<Zap className="w-5 h-5" />}
          iconColor="#34d399"
        />
        <StatCard
          label="Posts"
          value={String(baseline.post_count ?? 0)}
          icon={<FileText className="w-5 h-5" />}
          iconColor="#f87171"
          accent
        />
      </div>

      {/* ── Last Post Coaching ────────────────────────────────────────────── */}
      {latestPost && lastPostCoaching && (
        <LastPostCoach post={latestPost} coaching={lastPostCoaching} />
      )}

      {/* ── Coach (Sales / Views tabs) ────────────────────────────────────── */}
      <CoachTabs salesCoach={salesCoach} viewsCoach={viewsCoach} daysLabel={`${days}d`} />

      {/* ── Ask the Coach (Claude chat) ───────────────────────────────────── */}
      <CoachChat days={days} />

      {/* ── Top Performers + Patterns (filterable) ─────────────────────────── */}
      <PerformanceView outliers={outliers} patterns={patterns} daysLabel={`${days} days`} />

      {/* ── Top Movers ─────────────────────────────────────────────────────── */}
      <Section
        icon={<TrendingUp className="w-4 h-4" style={{ color: '#34d399' }} />}
        title={`Top Movers — last ${moversWindow}d`}
      >
        {movers.length === 0 ? (
          <Empty>
            No view growth recorded yet. Snapshots run daily at 06:00 UTC (Vercel Hobby plan — Pro unlocks 6h sync) — come back in 24h for day-over-day deltas.
          </Empty>
        ) : (
          <MoverGrid movers={movers} />
        )}
      </Section>

      {/* ── Posting Activity ───────────────────────────────────────────────── */}
      {activity.length > 0 && (
        <PostingHeatmap data={activity} insight={insight ?? undefined} days={365} />
      )}

      {/* ── Breakdown ──────────────────────────────────────────────────────── */}
      {(breakdown.by_hook_type.length > 0 ||
        breakdown.by_content_type.length > 0 ||
        breakdown.by_layout.length > 0) && (
        <Section
          icon={<Layers className="w-4 h-4" style={{ color: '#6366f1' }} />}
          title="Breakdown — all tagged posts"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {breakdown.by_hook_type.length > 0 && (
              <BreakdownTable title="Hook Type" rows={breakdown.by_hook_type} />
            )}
            {breakdown.by_content_type.length > 0 && (
              <BreakdownTable title="Content Type" rows={breakdown.by_content_type} />
            )}
            {breakdown.by_layout.length > 0 && (
              <BreakdownTable title="Layout" rows={breakdown.by_layout} />
            )}
          </div>
        </Section>
      )}

    </div>
  )
}

// ── Components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconColor,
  accent,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  iconColor?: string
  accent?: boolean
}) {
  const tint = iconColor ?? '#ffffff'
  return (
    <div
      className="rounded-xl px-4 py-4 flex items-center justify-between gap-3"
      style={{
        background: accent ? 'rgba(220,38,38,0.08)' : '#2d2c2a',
        border: `1px solid ${accent ? 'rgba(220,38,38,0.18)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="min-w-0">
        <div
          className="text-2xl font-bold leading-none tracking-tight font-mono"
          style={{ color: accent ? '#f87171' : '#fff' }}
        >
          {value}
        </div>
        <div
          className="text-[10px] uppercase tracking-wider font-medium mt-2"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {label}
        </div>
      </div>
      {icon && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${tint}15`,
            color: tint,
            border: `1px solid ${tint}20`,
          }}
        >
          {icon}
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-white/45">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-6 text-[12px] text-center"
      style={{
        background: '#2d2c2a',
        border: '1px dashed rgba(255,255,255,0.07)',
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      {children}
    </div>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-[11px] uppercase tracking-widest font-semibold text-white/45">
        {title}
      </div>
      <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th className="text-left text-[9px] uppercase tracking-wide font-medium pb-2 text-white/30"></th>
            <th className="text-right text-[9px] uppercase tracking-wide font-medium pb-2 text-white/30">
              Avg V
            </th>
            <th className="text-right text-[9px] uppercase tracking-wide font-medium pb-2 text-white/30">
              Avg S
            </th>
            <th className="text-right text-[9px] uppercase tracking-wide font-medium pb-2 text-white/30">
              Eng%
            </th>
            <th className="text-right text-[9px] uppercase tracking-wide font-medium pb-2 text-white/30">
              Posts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rowBorder = idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'
            return (
              <tr key={row.label}>
                <td className="py-2 text-white/80 truncate max-w-[120px]" style={{ borderTop: rowBorder }}>
                  {row.label}
                </td>
                <td className="py-2 text-right text-white/65" style={{ borderTop: rowBorder }}>
                  {fmt(row.avg_views)}
                </td>
                <td className="py-2 text-right text-white/65" style={{ borderTop: rowBorder }}>
                  {fmt(row.avg_saves)}
                </td>
                <td className="py-2 text-right text-white/65" style={{ borderTop: rowBorder }}>
                  {((row.avg_engagement_rate ?? 0) * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right text-white/30" style={{ borderTop: rowBorder }}>
                  {row.count}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

