'use client'

import { useState, useEffect } from 'react'
import { Sparkline } from '@/components/sparkline'
import Link from 'next/link'
import { Youtube, Instagram, Linkedin, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCard {
  label: string
  thisWeek: number | null
  lastWeek: number | null
  sparkData: number[]
  color: string
  href: string
  icon: React.ReactNode
  fallback?: string
}

interface PlatformData {
  data: any | null
  loaded: boolean
}

function parseRolling7Days(data: any): { thisWeek: number; lastWeek: number; spark: number[] } | null {
  const arr = Array.isArray(data) ? data : []
  if (arr.length === 0) return null

  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const sevenAgo = new Date(now)
  sevenAgo.setDate(sevenAgo.getDate() - 7)
  sevenAgo.setHours(0, 0, 0, 0)
  const fourteenAgo = new Date(sevenAgo)
  fourteenAgo.setDate(fourteenAgo.getDate() - 7)

  const sorted = [...arr].sort((a, b) => {
    const ta = Number(a[0]) > 1e12 ? Number(a[0]) : new Date(a[0]).getTime()
    const tb = Number(b[0]) > 1e12 ? Number(b[0]) : new Date(b[0]).getTime()
    return ta - tb
  })

  let thisWeek = 0
  let lastWeek = 0
  const values = sorted.map((p: any) => parseFloat(p[1]) || 0)

  for (const entry of sorted) {
    const ts = Number(entry[0]) > 1e12 ? Number(entry[0]) : new Date(entry[0]).getTime()
    const val = parseFloat(entry[1]) || 0
    const entryDate = new Date(ts)

    if (entryDate >= sevenAgo) {
      thisWeek += val
    } else if (entryDate >= fourteenAgo && entryDate < sevenAgo) {
      lastWeek += val
    }
  }

  if (thisWeek === 0 && lastWeek === 0) return null
  return { thisWeek, lastWeek, spark: values.slice(-14) }
}

export function MetricsStrip() {
  const [platforms, setPlatforms] = useState<Record<string, PlatformData>>({
    youtube: { data: null, loaded: false },
    instagram: { data: null, loaded: false },
    linkedin: { data: null, loaded: false },
  })

  useEffect(() => {
    const now = new Date().toISOString().split('.')[0]
    const threeWeeksAgo = new Date()
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)
    const from = threeWeeksAgo.toISOString().split('.')[0]
    const startStr = threeWeeksAgo.toISOString().replace(/-/g, '').split('T')[0]
    const endStr = new Date().toISOString().replace(/-/g, '').split('T')[0]

    // YouTube: daily views
    fetch(`/api/metricool?endpoint=timeline&metric=ytviews&start=${startStr}&end=${endStr}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const parsed = parseRolling7Days(d)
        setPlatforms(prev => ({ ...prev, youtube: { data: parsed, loaded: true } }))
      })
      .catch(() => setPlatforms(prev => ({ ...prev, youtube: { data: null, loaded: true } })))

    // Instagram: daily reach
    fetch(`/api/metricool?endpoint=timeline&metric=igreach&start=${startStr}&end=${endStr}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const parsed = parseRolling7Days(d)
        setPlatforms(prev => ({ ...prev, instagram: { data: parsed, loaded: true } }))
      })
      .catch(() => setPlatforms(prev => ({ ...prev, instagram: { data: null, loaded: true } })))

    // LinkedIn: post-level impressions bucketed by publish date into 7-day windows
    const liFrom = new Date()
    liFrom.setDate(liFrom.getDate() - 21)
    fetch(`/api/metricool?endpoint=linkedin_posts&from=${liFrom.toISOString().split('.')[0]}&to=${now}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const posts = d?.data ?? (Array.isArray(d) ? d : [])
        if (posts.length > 0) {
          const nowDate = new Date()
          nowDate.setHours(23, 59, 59, 999)
          const sevenAgo = new Date(nowDate)
          sevenAgo.setDate(sevenAgo.getDate() - 7)
          sevenAgo.setHours(0, 0, 0, 0)
          const fourteenAgo = new Date(sevenAgo)
          fourteenAgo.setDate(fourteenAgo.getDate() - 7)

          let thisWeek = 0
          let lastWeek = 0
          const sorted = [...posts].sort((a: any, b: any) =>
            new Date(a.created?.dateTime || '').getTime() - new Date(b.created?.dateTime || '').getTime()
          )
          for (const p of sorted) {
            const pubDate = new Date(p.created?.dateTime || '')
            const imp = p.impressions ?? 0
            if (pubDate >= sevenAgo) thisWeek += imp
            else if (pubDate >= fourteenAgo) lastWeek += imp
          }
          const spark = sorted.map((p: any) => p.impressions ?? 0)
          if (thisWeek > 0 || lastWeek > 0) {
            setPlatforms(prev => ({ ...prev, linkedin: { data: { thisWeek, lastWeek, spark }, loaded: true } }))
            return
          }
        }
        setPlatforms(prev => ({ ...prev, linkedin: { data: null, loaded: true } }))
      })
      .catch(() => setPlatforms(prev => ({ ...prev, linkedin: { data: null, loaded: true } })))
  }, [])

  const loading = !platforms.youtube.loaded || !platforms.instagram.loaded || !platforms.linkedin.loaded

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toLocaleString()
  }

  function weekDelta(thisWeek: number, lastWeek: number): { pct: number; label: string; color: string; Icon: React.ElementType } {
    if (lastWeek === 0) return { pct: 0, label: 'new', color: 'rgba(255,255,255,0.3)', Icon: Minus }
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    if (pct > 0) return { pct, label: `+${pct}%`, color: '#10b981', Icon: TrendingUp }
    if (pct < 0) return { pct, label: `${pct}%`, color: '#ef4444', Icon: TrendingDown }
    return { pct: 0, label: '0%', color: 'rgba(255,255,255,0.3)', Icon: Minus }
  }

  const cards: MetricCard[] = []

  const configs = [
    { key: 'youtube', label: 'YouTube', color: '#dc2626', href: '/dashboard/youtube', icon: <Youtube className="w-3.5 h-3.5" />, fallback: 'Connect YouTube' },
    { key: 'instagram', label: 'Instagram', color: '#e1306c', href: '/dashboard/instagram', icon: <Instagram className="w-3.5 h-3.5" />, fallback: 'Connect Instagram' },
    { key: 'linkedin', label: 'LinkedIn', color: '#0077b5', href: '/dashboard/linkedin', icon: <Linkedin className="w-3.5 h-3.5" />, fallback: 'Connect LinkedIn' },
  ]

  for (const cfg of configs) {
    const d = platforms[cfg.key].data
    cards.push(d ? {
      label: cfg.label,
      thisWeek: d.thisWeek,
      lastWeek: d.lastWeek,
      sparkData: d.spark ?? [],
      color: cfg.color,
      href: cfg.href,
      icon: cfg.icon,
    } : {
      label: cfg.label,
      thisWeek: null,
      lastWeek: null,
      sparkData: [],
      color: cfg.color,
      href: cfg.href,
      icon: cfg.icon,
      fallback: cfg.fallback,
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="h-3 w-16 rounded bg-white/5 mb-3" />
            <div className="h-7 w-20 rounded bg-white/5 mb-2" />
            <div className="h-3 w-12 rounded bg-white/5" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(card => {
        const hasData = card.thisWeek != null
        const delta = hasData ? weekDelta(card.thisWeek!, card.lastWeek ?? 0) : null

        return (
          <Link key={card.label} href={card.href} className="group">
            <div
              className="rounded-xl p-4 h-full relative overflow-hidden transition-all hover:bg-white/[0.04]"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {hasData ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color: card.color }}>{card.icon}</span>
                    <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {card.label}
                    </p>
                    {delta && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold ml-auto" style={{ color: delta.color }}>
                        <delta.Icon className="w-3 h-3" />
                        {delta.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold font-mono text-white relative z-10">{fmt(card.thisWeek!)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    last 7 days {card.lastWeek != null && card.lastWeek > 0 ? `· ${fmt(card.lastWeek)} prior` : ''}
                  </p>
                  {card.sparkData.length >= 2 && (
                    <div className="absolute bottom-0 left-0 right-0 z-0 opacity-50 group-hover:opacity-70 transition-opacity">
                      <Sparkline
                        data={card.sparkData}
                        height={36}
                        color={card.color}
                        strokeWidth={1.5}
                        showDot={false}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 gap-1">
                  <span style={{ color: card.color }}>{card.icon}</span>
                  <p className="text-[11px] font-medium" style={{ color: card.color }}>
                    {card.fallback}
                  </p>
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
