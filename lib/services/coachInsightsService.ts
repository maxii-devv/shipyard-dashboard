import type { BaselineMetrics, BreakdownRow } from '@/lib/services/viralPatternsService'
import type { PostingInsight, LatestPost } from '@/lib/services/postingActivityService'
import type { TopMover, HistoryPoint } from '@/lib/services/growthService'

const MIN_SAMPLE = 3
const WIN_VIEW_RATIO = 1.4
const FIX_VIEW_RATIO = 0.6
const DAY_WIN_RATIO = 1.2
const DAY_FIX_RATIO = 0.7

const SALES_WIN_RATE = 0.4
const SALES_FIX_RATE = 0.15
const INTENT_WIN_RATIO = 1.35
const VANITY_FIX_RATIO = 0.55

export type CoachCategory = 'hook' | 'content' | 'layout' | 'day' | 'mover' | 'sales' | 'cta' | 'saves' | 'comments' | 'shares'
export type CoachKind = 'win' | 'fix'

export interface CoachInsight {
  kind: CoachKind
  category: CoachCategory
  label: string
  detail: string
  action: string
  metric: number
}

interface InsightsInput {
  baseline: BaselineMetrics
  breakdown: {
    by_hook_type: BreakdownRow[]
    by_content_type: BreakdownRow[]
    by_layout: BreakdownRow[]
    by_cta_keyword: BreakdownRow[]
  }
  insight: PostingInsight | null
  movers: (TopMover & { history: HistoryPoint[] })[]
}

export interface CoachOutput {
  wins: CoachInsight[]
  fixes: CoachInsight[]
  empty_reason: string | null
}

export function generateInsights({ baseline, breakdown, insight, movers }: InsightsInput): CoachOutput {
  const avgViews = baseline?.avg_views ?? 0

  if (!avgViews || baseline.post_count < 5) {
    return {
      wins: [],
      fixes: [],
      empty_reason:
        baseline.post_count < 5
          ? `Need at least 5 posts in this window to surface patterns — currently ${baseline.post_count}`
          : 'No view data yet',
    }
  }

  const taggedCount =
    breakdown.by_hook_type.reduce((s, r) => s + r.count, 0) +
    breakdown.by_content_type.reduce((s, r) => s + r.count, 0) +
    breakdown.by_layout.reduce((s, r) => s + r.count, 0)

  const all: CoachInsight[] = []

  const processCategory = (category: 'hook' | 'content' | 'layout', rows: BreakdownRow[]) => {
    for (const row of rows) {
      if (row.count < MIN_SAMPLE) continue
      const ratio = row.avg_views / avgViews

      if (row.drove_sales_rate != null && row.reviewed_count >= MIN_SAMPLE && row.drove_sales_rate >= 0.5) {
        all.push({
          kind: 'win',
          category: 'sales',
          label: row.label,
          detail: `${Math.round(row.drove_sales_rate * 100)}% drove sales (${row.reviewed_count} reviewed)`,
          action: salesAction(category, row.label),
          metric: 10 + row.drove_sales_rate,
        })
      }

      if (ratio >= WIN_VIEW_RATIO) {
        all.push({
          kind: 'win',
          category,
          label: row.label,
          detail: `${ratio.toFixed(1)}× your avg views — ${row.count} posts`,
          action: winAction(category, row.label),
          metric: ratio,
        })
      } else if (ratio <= FIX_VIEW_RATIO) {
        all.push({
          kind: 'fix',
          category,
          label: row.label,
          detail: `${ratio.toFixed(1)}× your avg views — ${row.count} posts`,
          action: fixAction(category, row.label),
          metric: ratio,
        })
      }
    }
  }

  processCategory('hook', breakdown.by_hook_type)
  processCategory('content', breakdown.by_content_type)
  processCategory('layout', breakdown.by_layout)

  if (insight) {
    if (insight.best_dow && insight.best_dow.post_count >= 2) {
      const ratio = insight.best_dow.avg_views / avgViews
      if (ratio >= DAY_WIN_RATIO) {
        all.push({
          kind: 'win',
          category: 'day',
          label: insight.best_dow.dow_name,
          detail: `${ratio.toFixed(1)}× your avg views — ${insight.best_dow.post_count} posts`,
          action: `Schedule the next reel for a ${insight.best_dow.dow_name}`,
          metric: ratio,
        })
      }
    }
    if (insight.worst_dow && insight.worst_dow.post_count >= 3) {
      const ratio = insight.worst_dow.avg_views / avgViews
      if (ratio <= DAY_FIX_RATIO) {
        all.push({
          kind: 'fix',
          category: 'day',
          label: insight.worst_dow.dow_name,
          detail: `${ratio.toFixed(1)}× your avg views — ${insight.worst_dow.post_count} posts`,
          action: `${insight.worst_dow.dow_name}s underperform — push to another day`,
          metric: ratio,
        })
      }
    }
  }

  if (movers.length >= 3) {
    const top = movers.slice(0, 5)
    const totalDelta = top.reduce((s, m) => s + Number(m.views_delta || 0), 0)
    if (totalDelta > avgViews * 2) {
      all.push({
        kind: 'win',
        category: 'mover',
        label: 'Recent reels still climbing',
        detail: `Top ${top.length} gained ${fmt(totalDelta)} views in the mover window`,
        action: 'Resurface or remix what these reels share',
        metric: 1.5,
      })
    }
  }

  const wins = all.filter(i => i.kind === 'win').sort((a, b) => b.metric - a.metric).slice(0, 4)
  const fixes = all.filter(i => i.kind === 'fix').sort((a, b) => a.metric - b.metric).slice(0, 3)

  let empty_reason: string | null = null
  if (wins.length === 0 && fixes.length === 0) {
    empty_reason =
      taggedCount < 5
        ? 'Tag a few more posts (hook / content / layout) so the coach can compare categories'
        : 'No category is far enough above or below your baseline yet — keep posting'
  }

  return { wins, fixes, empty_reason }
}

function winAction(category: 'hook' | 'content' | 'layout', label: string): string {
  switch (category) {
    case 'hook':
      return `Lead more reels with ${label} hooks`
    case 'content':
      return `Make more ${label} content`
    case 'layout':
      return `Use the ${label} layout more often`
  }
}

function fixAction(category: 'hook' | 'content' | 'layout', label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks underperform — skip them for a bit`
    case 'content':
      return `Cut back on ${label} until the rest of the bucket lifts`
    case 'layout':
      return `${label} layout isn't landing — rethink the format`
  }
}

function salesAction(category: 'hook' | 'content' | 'layout', label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks convert — lean on them when promoting the academy`
    case 'content':
      return `${label} content is your sales engine — schedule more around launches`
    case 'layout':
      return `${label} converts — use it for offer-driven reels`
  }
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

type SalesCategoryKey = 'hook' | 'content' | 'layout' | 'cta'

export function generateSalesInsights({ baseline, breakdown }: InsightsInput): CoachOutput {
  const avgViews = baseline?.avg_views ?? 0
  const avgSaves = baseline?.avg_saves ?? 0
  const avgComments = baseline?.avg_comments ?? 0
  const avgShares = baseline?.avg_shares ?? 0

  if (!avgViews || baseline.post_count < 5) {
    return {
      wins: [],
      fixes: [],
      empty_reason:
        baseline.post_count < 5
          ? `Need at least 5 posts in this window — currently ${baseline.post_count}`
          : 'No view data yet',
    }
  }

  const reviewedTotal =
    breakdown.by_hook_type.reduce((s, r) => s + r.reviewed_count, 0) +
    breakdown.by_content_type.reduce((s, r) => s + r.reviewed_count, 0) +
    breakdown.by_layout.reduce((s, r) => s + r.reviewed_count, 0) +
    breakdown.by_cta_keyword.reduce((s, r) => s + r.reviewed_count, 0)

  const baselineSaveRate = avgViews > 0 ? avgSaves / avgViews : 0
  const baselineCommentRate = avgViews > 0 ? avgComments / avgViews : 0
  const baselineShareRate = avgViews > 0 ? avgShares / avgViews : 0

  const all: CoachInsight[] = []

  const processCategory = (category: SalesCategoryKey, rows: BreakdownRow[]) => {
    for (const row of rows) {
      if (row.count < MIN_SAMPLE) continue

      if (
        row.drove_sales_rate != null &&
        row.reviewed_count >= MIN_SAMPLE &&
        row.drove_sales_rate >= SALES_WIN_RATE
      ) {
        all.push({
          kind: 'win',
          category: 'sales',
          label: `${row.label}${category === 'cta' ? ' CTA' : ''}`,
          detail: `${Math.round(row.drove_sales_rate * 100)}% drove sales — ${row.reviewed_count} reviewed`,
          action: saleWinAction(category, row.label),
          metric: 100 + row.drove_sales_rate * 100,
        })
        continue
      }

      if (
        row.drove_sales_rate != null &&
        row.reviewed_count >= MIN_SAMPLE &&
        row.drove_sales_rate <= SALES_FIX_RATE
      ) {
        all.push({
          kind: 'fix',
          category: 'sales',
          label: `${row.label}${category === 'cta' ? ' CTA' : ''}`,
          detail: `Only ${Math.round(row.drove_sales_rate * 100)}% drove sales — ${row.reviewed_count} reviewed`,
          action: saleFixAction(category, row.label),
          metric: row.drove_sales_rate,
        })
        continue
      }

      const saveRate = row.avg_views > 0 ? row.avg_saves / row.avg_views : 0
      const commentRate = row.avg_views > 0 ? row.avg_comments / row.avg_views : 0
      const shareRate = row.avg_views > 0 ? row.avg_shares / row.avg_views : 0

      if (baselineSaveRate > 0 && saveRate / baselineSaveRate >= INTENT_WIN_RATIO && row.avg_saves >= 3) {
        all.push({
          kind: 'win',
          category: 'saves',
          label: row.label,
          detail: `${(saveRate / baselineSaveRate).toFixed(1)}× save rate vs avg — bookmarked content (${row.count} posts)`,
          action: savesAction(category, row.label),
          metric: 50 + saveRate / baselineSaveRate,
        })
      }

      if (baselineCommentRate > 0 && commentRate / baselineCommentRate >= INTENT_WIN_RATIO && row.avg_comments >= 2) {
        all.push({
          kind: 'win',
          category: 'comments',
          label: row.label,
          detail: `${(commentRate / baselineCommentRate).toFixed(1)}× comment rate — drives DMs (${row.count} posts)`,
          action: commentsAction(category, row.label),
          metric: 40 + commentRate / baselineCommentRate,
        })
      }

      if (baselineShareRate > 0 && shareRate / baselineShareRate >= INTENT_WIN_RATIO && row.avg_shares >= 2) {
        all.push({
          kind: 'win',
          category: 'shares',
          label: row.label,
          detail: `${(shareRate / baselineShareRate).toFixed(1)}× share rate — people are spreading it (${row.count} posts)`,
          action: sharesAction(category, row.label),
          metric: 30 + shareRate / baselineShareRate,
        })
      }

      if (
        baselineSaveRate > 0 &&
        saveRate / baselineSaveRate <= VANITY_FIX_RATIO &&
        row.avg_views / avgViews >= 1.2 &&
        row.count >= MIN_SAMPLE
      ) {
        all.push({
          kind: 'fix',
          category: 'saves',
          label: row.label,
          detail: `High views (${(row.avg_views / avgViews).toFixed(1)}×) but only ${(saveRate / baselineSaveRate).toFixed(1)}× save rate — vanity reach`,
          action: vanityAction(category, row.label),
          metric: saveRate / baselineSaveRate,
        })
      }
    }
  }

  processCategory('hook', breakdown.by_hook_type)
  processCategory('content', breakdown.by_content_type)
  processCategory('layout', breakdown.by_layout)
  processCategory('cta', breakdown.by_cta_keyword)

  // Dedupe wins by label+category so we don't show duplicates
  const seen = new Set<string>()
  const dedupedWins = all
    .filter(i => i.kind === 'win')
    .sort((a, b) => b.metric - a.metric)
    .filter(i => {
      const k = `${i.category}|${i.label}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 4)

  const dedupedFixes = all
    .filter(i => i.kind === 'fix')
    .sort((a, b) => a.metric - b.metric)
    .slice(0, 3)

  let empty_reason: string | null = null
  if (dedupedWins.length === 0 && dedupedFixes.length === 0) {
    empty_reason =
      reviewedTotal < 3
        ? 'Tick the "Drove Sales" checkbox in Notion on a few posts so I can spot what converts'
        : 'No category stands out for sales or deep engagement yet — keep posting and reviewing'
  }

  return { wins: dedupedWins, fixes: dedupedFixes, empty_reason }
}

function saleWinAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks convert — use them on launch / academy posts`
    case 'content':
      return `${label} content is your sales engine — schedule more around offers`
    case 'layout':
      return `${label} layout converts — use it for revenue-driving reels`
    case 'cta':
      return `"${label}" CTA is the one that closes — reuse it in the next launch`
  }
}

function saleFixAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks don't convert — keep them for top-of-funnel only`
    case 'content':
      return `${label} content isn't selling — try a stronger offer angle`
    case 'layout':
      return `${label} layout reaches but doesn't close — pair with a sharper CTA`
    case 'cta':
      return `"${label}" CTA underperforms — test a different keyword`
  }
}

function savesAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks get bookmarked — repurpose as carousels people save`
    case 'content':
      return `${label} content gets saved — turn it into a lead magnet anchor`
    case 'layout':
      return `${label} layout drives saves — use it for high-value teaching reels`
    case 'cta':
      return `Pair "${label}" CTA with a saveable resource to capture intent`
  }
}

function commentsAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks spark conversations — great for DM-driven launches`
    case 'content':
      return `${label} content gets replies — feed it into your DM funnel`
    case 'layout':
      return `${label} layout invites comments — use it when you want inbound`
    case 'cta':
      return `"${label}" CTA gets people commenting — keep using it for DM routing`
  }
}

function sharesAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks get shared — schedule them when you want reach`
    case 'content':
      return `${label} content is share-worthy — make more of it for cold reach`
    case 'layout':
      return `${label} layout travels — use it when launching a new offer`
    case 'cta':
      return `"${label}" CTA is share-friendly — keep it in the rotation`
  }
}

function vanityAction(category: SalesCategoryKey, label: string): string {
  switch (category) {
    case 'hook':
      return `${label} hooks reach but don't stick — pair with a stronger value beat`
    case 'content':
      return `${label} content brings views but no intent — tighten the CTA`
    case 'layout':
      return `${label} layout looks good but doesn't convert — rework the offer slide`
    case 'cta':
      return `"${label}" CTA hits but doesn't get saved — sharpen the promise`
  }
}

export type LastPostSignalKind = 'win' | 'fix' | 'neutral'

export interface LastPostSignal {
  kind: LastPostSignalKind
  label: string
  detail: string
}

export interface LastPostCoaching {
  signals: LastPostSignal[]
  advice: string
  mediaLabel: string
  postedAgo: string
  caption: string
}

const POST_WIN = 1.3
const POST_FIX = 0.7

export function generateLastPostCoaching(
  post: LatestPost,
  baseline: BaselineMetrics
): LastPostCoaching {
  const mediaLabel = mediaTypeLabel(post.media_type)
  const postedAgo = relativeTime(post.post_timestamp)
  const caption = (post.caption ?? '').slice(0, 140) + ((post.caption ?? '').length > 140 ? '…' : '')

  const signals: LastPostSignal[] = []

  const avgViews = baseline?.avg_views ?? 0
  const viewRatio = avgViews > 0 ? post.views / avgViews : 0

  if (avgViews > 0) {
    if (viewRatio >= POST_WIN) {
      signals.push({
        kind: 'win',
        label: 'Views',
        detail: `${viewRatio.toFixed(1)}× your avg (${fmt(post.views)})`,
      })
    } else if (viewRatio <= POST_FIX) {
      signals.push({
        kind: 'fix',
        label: 'Views',
        detail: `${viewRatio.toFixed(1)}× your avg (${fmt(post.views)})`,
      })
    } else {
      signals.push({
        kind: 'neutral',
        label: 'Views',
        detail: `on par with avg (${fmt(post.views)})`,
      })
    }
  }

  const baselineSaveRate = avgViews > 0 ? baseline.avg_saves / avgViews : 0
  const baselineCommentRate = avgViews > 0 ? baseline.avg_comments / avgViews : 0
  const baselineShareRate = avgViews > 0 ? baseline.avg_shares / avgViews : 0

  const postSaveRate = post.views > 0 ? post.saves / post.views : 0
  const postCommentRate = post.views > 0 ? post.comments / post.views : 0
  const postShareRate = post.views > 0 ? post.shares / post.views : 0

  if (baselineSaveRate > 0 && post.views >= 100) {
    const r = postSaveRate / baselineSaveRate
    if (r >= POST_WIN)
      signals.push({ kind: 'win', label: 'Saves', detail: `${r.toFixed(1)}× rate — bookmark-worthy` })
    else if (r <= POST_FIX)
      signals.push({ kind: 'fix', label: 'Saves', detail: `${r.toFixed(1)}× rate — shallow` })
  }

  if (baselineCommentRate > 0 && post.views >= 100) {
    const r = postCommentRate / baselineCommentRate
    if (r >= POST_WIN)
      signals.push({ kind: 'win', label: 'Comments', detail: `${r.toFixed(1)}× rate — sparks DMs` })
    else if (r <= POST_FIX)
      signals.push({ kind: 'fix', label: 'Comments', detail: `${r.toFixed(1)}× rate — quiet` })
  }

  if (baselineShareRate > 0 && post.views >= 100) {
    const r = postShareRate / baselineShareRate
    if (r >= POST_WIN)
      signals.push({ kind: 'win', label: 'Shares', detail: `${r.toFixed(1)}× rate — travels` })
    else if (r <= POST_FIX)
      signals.push({ kind: 'fix', label: 'Shares', detail: `${r.toFixed(1)}× rate — not spreading` })
  }

  const advice = synthesizeLastPostAdvice(post, viewRatio, signals)

  return { signals, advice, mediaLabel, postedAgo, caption }
}

function synthesizeLastPostAdvice(
  post: LatestPost,
  viewRatio: number,
  signals: LastPostSignal[]
): string {
  const hasSaveWin = signals.some(s => s.label === 'Saves' && s.kind === 'win')
  const hasSaveFix = signals.some(s => s.label === 'Saves' && s.kind === 'fix')
  const hasCommentWin = signals.some(s => s.label === 'Comments' && s.kind === 'win')
  const hasShareWin = signals.some(s => s.label === 'Shares' && s.kind === 'win')

  const hookTag = post.hook_type ? `${post.hook_type} hook` : 'this format'
  const cta = post.cta_keyword ? `"${post.cta_keyword}" CTA` : 'a CTA'

  if (viewRatio >= POST_WIN && hasSaveWin) {
    return `Strong reach AND deep value — DM the commenters and pin this. Make another with the same ${hookTag}.`
  }
  if (viewRatio >= POST_WIN && hasSaveFix) {
    return `Big reach but shallow — next post tighten the CTA so the views actually convert.`
  }
  if (viewRatio >= POST_WIN && hasCommentWin) {
    return `It's spreading and sparking conversation — route those comments to ${cta} while it's hot.`
  }
  if (viewRatio >= POST_WIN && hasShareWin) {
    return `Going viral via shares — push a follow-up reel this week to capture the momentum.`
  }
  if (viewRatio >= POST_WIN) {
    return `Reach above average — keep using the ${hookTag} and watch how the next 48h plays out.`
  }
  if (viewRatio <= POST_FIX && hasSaveWin) {
    return `Low reach but high save rate — the value lands, the hook didn't. Try a punchier opener on the next one.`
  }
  if (viewRatio <= POST_FIX && hasSaveFix) {
    return `Underperformed on reach AND saves — swap the hook style and tighten the CTA on the next post.`
  }
  if (viewRatio <= POST_FIX) {
    return `Reach below average — first 3 seconds didn't grab. Test a different hook style next.`
  }
  if (hasSaveWin) {
    return `Avg reach but people are saving — repurpose this into a carousel or pin it.`
  }
  if (hasCommentWin) {
    return `People are commenting — reply in DMs and route them to ${cta}.`
  }
  return `Solid post — keep posting and watch the next one for a clearer signal.`
}

function mediaTypeLabel(t: string): string {
  switch (t) {
    case 'VIDEO':
      return 'Reel'
    case 'CAROUSEL_ALBUM':
      return 'Carousel'
    case 'IMAGE':
      return 'Image'
    default:
      return 'Post'
  }
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
