'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, AlertTriangle, Target } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK, GRID_STYLE, CHART_MARGIN } from '../analytics/components/chart-theme'
import { fmtNum, fmtDate } from '../analytics/components/analytics-types'
import { StatPill } from '../analytics/components/stat-pill'
import { SectionHeader } from '../analytics/components/section-helpers'
import {
  getMetaAdsData, roas, ctr, cpc, cpm, cpa, verdict, VERDICT_META,
  type MetaAdsCampaign,
} from './placeholder-data'

const money = (n: number, cur = '$') =>
  n >= 1000 ? `${cur}${(n / 1000).toFixed(1)}k` : `${cur}${Math.round(n)}`

type CampSort = 'roas' | 'spend' | 'revenue' | 'conversions'

export function MetaAdsClient() {
  const data = useMemo(() => getMetaAdsData(), [])
  const [sort, setSort] = useState<CampSort>('roas')

  const totals = useMemo(() => {
    const t = data.daily.reduce(
      (a, d) => ({
        spend: a.spend + d.spend,
        revenue: a.revenue + d.revenue,
        impressions: a.impressions + d.impressions,
        clicks: a.clicks + d.clicks,
        conversions: a.conversions + d.conversions,
      }),
      { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 },
    )
    return t
  }, [data])

  const series = useMemo(
    () =>
      data.daily.map(d => ({
        date: fmtDate(d.date),
        spend: d.spend,
        revenue: d.revenue,
        roas: Number(roas(d.revenue, d.spend).toFixed(2)),
      })),
    [data],
  )

  const spark = useMemo(
    () => ({
      spend: data.daily.map(d => d.spend),
      revenue: data.daily.map(d => d.revenue),
      roas: data.daily.map(d => Number(roas(d.revenue, d.spend).toFixed(2))),
      conversions: data.daily.map(d => d.conversions),
    }),
    [data],
  )

  const campaignsSorted = useMemo(
    () =>
      [...data.campaigns].sort((a, b) => {
        switch (sort) {
          case 'roas': return roas(b.revenue, b.spend) - roas(a.revenue, a.spend)
          case 'spend': return b.spend - a.spend
          case 'revenue': return b.revenue - a.revenue
          case 'conversions': return b.conversions - a.conversions
        }
      }),
    [data, sort],
  )

  const campChart = useMemo(
    () =>
      [...data.campaigns]
        .map(c => ({
          name: c.name.length > 18 ? c.name.slice(0, 17) + '…' : c.name,
          roas: Number(roas(c.revenue, c.spend).toFixed(2)),
          color: VERDICT_META[verdict(c)].color,
        }))
        .sort((a, b) => b.roas - a.roas),
    [data],
  )

  const blendedRoas = roas(totals.revenue, totals.spend)
  const killCount = data.campaigns.filter(c => verdict(c) === 'KILL').length
  const scaleCount = data.campaigns.filter(c => verdict(c) === 'SCALE').length

  return (
    <div className="space-y-8">
      {/* Placeholder notice */}
      {data.isPlaceholder && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <span className="font-semibold" style={{ color: '#f59e0b' }}>Placeholder data.</span>{' '}
            These are mock numbers for layout review. Once Izan&apos;s Meta Ads account is
            connected, real spend, revenue and ROAS replace this automatically — no UI changes
            needed (see <code className="font-mono text-[11px]">placeholder-data.ts</code>).
          </p>
        </div>
      )}

      {/* Account overview */}
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-6 flex-wrap"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0866ff, #0a3cff)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.5 5c-2.4 0-4.3 1.8-5.5 4-1.2-2.2-3.1-4-5.5-4C3.4 5 1.5 8.1 1.5 12s1.9 7 4.9 7c2.4 0 4.3-1.8 5.6-4 1.3 2.2 3.2 4 5.5 4 3 0 4.9-3.1 4.9-7s-1.9-7-4.9-7Zm-11 11.5c-1.6 0-2.6-2-2.6-4.5s1-4.5 2.6-4.5c1.6 0 2.9 2 4 4.5-1.1 2.5-2.4 4.5-4 4.5Zm11 0c-1.6 0-2.9-2-4-4.5 1.1-2.5 2.4-4.5 4-4.5 1.6 0 2.6 2 2.6 4.5s-1 4.5-2.6 4.5Z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-white">{blendedRoas.toFixed(2)}x</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>blended ROAS</p>
        </div>
        <div className="ml-auto flex gap-6 flex-wrap">
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-white">{money(totals.spend)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>spend</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-white">{money(totals.revenue)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>revenue</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono" style={{ color: '#10b981' }}>{scaleCount}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>to scale</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono" style={{ color: '#ef4444' }}>{killCount}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>to kill</p>
          </div>
        </div>
      </div>

      {/* Spend vs Revenue + ROAS trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">Spend vs Revenue</h3>
          <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Daily, last {data.daily.length} days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.likes} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.likes} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.engagement} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.engagement} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} {...GRID_STYLE} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `$${fmtNum(v)}`} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [`$${fmtNum(v as number)}`, name === 'spend' ? 'Spend' : 'Revenue']} />
              <Area type="monotone" dataKey="spend" stroke={CHART_COLORS.likes} fill="url(#spendGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.engagement} fill="url(#revGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">ROAS Trend</h3>
          <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Return on ad spend (break-even = 1.0x)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.reach} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.reach} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} {...GRID_STYLE} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}x`, 'ROAS']} />
              <Area type="monotone" dataKey="roas" stroke={CHART_COLORS.reach} fill="url(#roasGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatPill label="Spend" value={money(totals.spend)} sparkData={spark.spend} sparkColor={CHART_COLORS.likes} />
        <StatPill label="Revenue" value={money(totals.revenue)} sparkData={spark.revenue} sparkColor={CHART_COLORS.engagement} />
        <StatPill
          label="ROAS"
          value={`${blendedRoas.toFixed(2)}x`}
          color={blendedRoas >= 2 ? 'text-green-400' : blendedRoas >= 1 ? 'text-amber-400' : 'text-red-400'}
          sparkData={spark.roas}
          sparkColor={CHART_COLORS.reach}
        />
        <StatPill label="Conversions" value={totals.conversions} sparkData={spark.conversions} sparkColor={CHART_COLORS.comments} />
        <StatPill label="CTR" value={`${ctr(totals.clicks, totals.impressions).toFixed(2)}%`} />
        <StatPill label="CPA" value={money(cpa(totals.spend, totals.conversions))} />
        <StatPill label="CPC" value={`$${cpc(totals.spend, totals.clicks).toFixed(2)}`} />
        <StatPill label="CPM" value={`$${cpm(totals.spend, totals.impressions).toFixed(2)}`} />
        <StatPill label="Impressions" value={totals.impressions} />
        <StatPill label="Clicks" value={totals.clicks} />
      </div>

      {/* ROAS by campaign */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-semibold text-white mb-1">ROAS by Campaign</h3>
        <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Green = scale · amber = watch · red = kill</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={campChart} margin={CHART_MARGIN} barSize={32}>
            <CartesianGrid vertical={false} {...GRID_STYLE} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}x`, 'ROAS']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
              {campChart.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign table — what to kill / scale */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <SectionHeader icon={Target} iconBg="linear-gradient(135deg, #0866ff, #0a3cff)" title="Campaigns" count={data.campaigns.length} countLabel="campaigns" />
          <div className="flex gap-1">
            {(['roas', 'spend', 'revenue', 'conversions'] as CampSort[]).map(k => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className="text-[11px] px-2.5 py-1 rounded-md capitalize transition-colors"
                style={{
                  background: sort === k ? 'rgba(8,102,255,0.15)' : 'transparent',
                  color: sort === k ? '#5b9bff' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${sort === k ? 'rgba(8,102,255,0.3)' : 'transparent'}`,
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className="grid items-center px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ gridTemplateColumns: '2.4fr 1fr 1fr 1fr 0.8fr 0.8fr 1.1fr', color: 'rgba(255,255,255,0.25)' }}
          >
            <span>Campaign</span><span>Spend</span><span>Revenue</span><span>ROAS</span>
            <span>CTR</span><span>CPA</span><span>Verdict</span>
          </div>
          {campaignsSorted.map((c: MetaAdsCampaign) => {
            const v = verdict(c)
            const vm = VERDICT_META[v]
            const r = roas(c.revenue, c.spend)
            return (
              <div
                key={c.id}
                className="grid items-center px-4 py-3 text-[12px] border-t border-white/[0.04]"
                style={{ gridTemplateColumns: '2.4fr 1fr 1fr 1fr 0.8fr 0.8fr 1.1fr' }}
              >
                <div className="min-w-0 pr-3">
                  <p className="text-white font-medium truncate">{c.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {c.objective}
                    <span
                      className="ml-2 px-1.5 py-px rounded"
                      style={{
                        background: c.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                        color: c.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {c.status}
                    </span>
                  </p>
                </div>
                <span className="font-mono text-white/80">{money(c.spend)}</span>
                <span className="font-mono text-white/80">{money(c.revenue)}</span>
                <span className="font-mono font-bold" style={{ color: vm.color }}>{r.toFixed(2)}x</span>
                <span className="font-mono text-white/60">{ctr(c.clicks, c.impressions).toFixed(2)}%</span>
                <span className="font-mono text-white/60">{money(cpa(c.spend, c.conversions))}</span>
                <span
                  className="text-[11px] font-semibold px-2 py-1 rounded-md w-fit"
                  style={{ background: `${vm.color}1f`, color: vm.color }}
                  title={vm.hint}
                >
                  {vm.label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] mt-3 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <TrendingUp className="w-3 h-3" />
          Verdict thresholds: ROAS ≥ 2.5 scale · ≥ 1.3 keep · ≥ 0.8 watch · below kill. Tune in placeholder-data.ts.
        </p>
      </div>
    </div>
  )
}
