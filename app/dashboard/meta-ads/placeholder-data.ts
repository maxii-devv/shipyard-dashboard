// ─────────────────────────────────────────────────────────────────────────────
// 🔌 SWAP POINT — META ADS DATA
//
// Everything in this file is PLACEHOLDER data so the page can be built and
// reviewed before we have access to Izan's Meta Ads account.
//
// When the Meta Marketing API (or a Metricool ads endpoint) is connected:
//   1. Replace `getMetaAdsData()` with a real fetch that returns the SAME
//      `MetaAdsData` shape (daily series + campaigns).
//   2. Delete `PLACEHOLDER` and the mock generators below.
//   3. Nothing in meta-ads-client.tsx needs to change — it only consumes the
//      typed `MetaAdsData` shape and the `verdict()` helper.
//
// The kill/scale logic in `verdict()` is REAL and reusable as-is — it just
// needs real numbers flowing into it.
// ─────────────────────────────────────────────────────────────────────────────

export interface MetaAdsDaily {
  date: string // ISO yyyy-mm-dd
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
}

export type CampaignStatus = 'ACTIVE' | 'PAUSED'

export interface MetaAdsCampaign {
  id: string
  name: string
  objective: 'Sales' | 'Leads' | 'Traffic' | 'Awareness'
  status: CampaignStatus
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
}

export interface MetaAdsData {
  /** Whether this is mock data — drives the on-page placeholder banner. */
  isPlaceholder: boolean
  currency: string
  daily: MetaAdsDaily[]
  campaigns: MetaAdsCampaign[]
}

// ─── Derived metrics (pure — work on real data unchanged) ────────────────────

export const roas = (revenue: number, spend: number) => (spend > 0 ? revenue / spend : 0)
export const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0
export const cpc = (spend: number, clicks: number) => (clicks > 0 ? spend / clicks : 0)
export const cpm = (spend: number, impressions: number) =>
  impressions > 0 ? (spend / impressions) * 1000 : 0
export const cpa = (spend: number, conversions: number) =>
  conversions > 0 ? spend / conversions : 0

export type Verdict = 'SCALE' | 'KEEP' | 'WATCH' | 'KILL'

export const VERDICT_META: Record<Verdict, { color: string; label: string; hint: string }> = {
  SCALE: { color: '#10b981', label: 'Scale', hint: 'Strong ROAS — increase budget' },
  KEEP: { color: '#3b82f6', label: 'Keep', hint: 'Profitable — hold steady' },
  WATCH: { color: '#f59e0b', label: 'Watch', hint: 'Marginal — tighten or test creative' },
  KILL: { color: '#ef4444', label: 'Kill', hint: 'Losing money — pause it' },
}

/**
 * Kill/scale decision. Real logic — wire real numbers in and it just works.
 * Thresholds are deliberately conservative; tune once real ROAS is known.
 */
export function verdict(c: Pick<MetaAdsCampaign, 'revenue' | 'spend'>): Verdict {
  const r = roas(c.revenue, c.spend)
  if (r >= 2.5) return 'SCALE'
  if (r >= 1.3) return 'KEEP'
  if (r >= 0.8) return 'WATCH'
  return 'KILL'
}

// ─── Mock generators (DELETE when real data is wired) ────────────────────────

function mockDaily(days: number): MetaAdsDaily[] {
  const out: MetaAdsDaily[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Deterministic wobble so charts look alive but never random per render.
    const w = Math.sin(i / 4) * 0.5 + Math.cos(i / 7) * 0.3
    const spend = Math.round(180 + w * 70 + (days - i) * 1.5)
    // ROAS hovers around a believable ~2.2x with daily variance.
    const dayRoas = 2.2 + w * 0.7
    const revenue = Math.round(spend * dayRoas)
    const impressions = Math.round(spend * (300 + w * 60))
    const clicks = Math.round(impressions * (0.016 + w * 0.003))
    // ~$45 average order value implied by revenue.
    const conversions = Math.max(1, Math.round(revenue / (45 + w * 8)))
    out.push({
      date: d.toISOString().slice(0, 10),
      spend,
      revenue,
      impressions,
      clicks,
      conversions,
    })
  }
  return out
}

const MOCK_CAMPAIGNS: MetaAdsCampaign[] = [
  { id: 'c1', name: 'AI Designer Academy — Broad', objective: 'Sales', status: 'ACTIVE', spend: 2840, revenue: 9120, impressions: 412000, clicks: 7600, conversions: 142 },
  { id: 'c2', name: 'Academy — Retargeting 30d', objective: 'Sales', status: 'ACTIVE', spend: 1190, revenue: 5360, impressions: 98000, clicks: 3100, conversions: 88 },
  { id: 'c3', name: 'Lead Magnet — Streetwear Founders', objective: 'Leads', status: 'ACTIVE', spend: 1620, revenue: 2010, impressions: 286000, clicks: 4200, conversions: 61 },
  { id: 'c4', name: 'High-Ticket Diagnostic — Lookalike 1%', objective: 'Leads', status: 'ACTIVE', spend: 2050, revenue: 1180, impressions: 244000, clicks: 2600, conversions: 19 },
  { id: 'c5', name: 'Reel Boost — Brand Awareness', objective: 'Awareness', status: 'PAUSED', spend: 740, revenue: 240, impressions: 510000, clicks: 1900, conversions: 6 },
  { id: 'c6', name: '7 Lab Agency — Cold Traffic', objective: 'Traffic', status: 'ACTIVE', spend: 1330, revenue: 3990, impressions: 176000, clicks: 5100, conversions: 47 },
]

export const PLACEHOLDER: MetaAdsData = {
  isPlaceholder: true,
  currency: 'USD',
  daily: mockDaily(30),
  campaigns: MOCK_CAMPAIGNS,
}

/**
 * The page calls this. Today it returns mock data; swap the body for a real
 * fetch returning `MetaAdsData` and the whole page lights up with real numbers.
 */
export function getMetaAdsData(): MetaAdsData {
  return PLACEHOLDER
}
