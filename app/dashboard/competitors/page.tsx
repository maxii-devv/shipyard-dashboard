'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, RefreshCw, Plus, Bell, BellOff,
  Table2, LayoutGrid, Youtube, Instagram, Linkedin,
  ExternalLink, Heart, ChevronDown, ChevronUp,
} from 'lucide-react'

interface CompetitorSocial {
  id: string
  competitor_id: string
  platform: string
  handle: string
  follower_count: number | null
  bio: string | null
  profile_pic_url: string | null
  extra_metrics: Record<string, unknown>
}

interface Competitor {
  id: string
  name: string
  slug: string
  niche: string | null
  brand: string | null
  is_friend: boolean
  avatar_url: string | null
  active: boolean
  socials: CompetitorSocial[]
}

interface Alert {
  id: string
  alert_type: string
  title: string
  created_at: string
  is_read: boolean
  competitor: { name: string; slug: string } | null
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#dc2626',
  instagram: '#e1306c',
  linkedin: '#0077b5',
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
}

const PLATFORM_ORDER = ['youtube', 'instagram', 'linkedin']

function formatFollowers(n: number | null): string {
  if (!n) return '\u2014'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [alertsOpen, setAlertsOpen] = useState(true)

  const fetchCompetitors = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/competitors')
    const data = await res.json()
    setCompetitors(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchAlerts = useCallback(async () => {
    const res = await fetch('/api/competitors/alerts?unread=true')
    const data = await res.json()
    setAlerts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchCompetitors()
    fetchAlerts()
  }, [fetchCompetitors, fetchAlerts])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/competitors/sync', { method: 'POST' })
      await fetchCompetitors()
      await fetchAlerts()
    } catch {
      // silently fail for now
    }
    setSyncing(false)
  }

  const handleMarkAllRead = async () => {
    await fetch('/api/competitors/alerts/mark-all-read', { method: 'POST' })
    setAlerts([])
  }

  const getSocial = (comp: Competitor, platform: string) =>
    comp.socials?.find(s => s.platform === platform)

  return (
    <div className="min-h-screen p-8" style={{ background: '#262624' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Users className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Competitors</h1>
            <p className="text-xs text-white/40">{competitors.length} tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <Link
            data-tour="add-competitor-btn"
            href="/dashboard/competitors/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Competitor
          </Link>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="mb-6 rounded-xl" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">{alerts.length} unread alert{alerts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleMarkAllRead() }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white/30 hover:text-white/50 transition-colors"
              >
                <BellOff className="w-3 h-3" />
                Mark all read
              </button>
              {alertsOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
            </div>
          </button>
          {alertsOpen && (
            <div className="px-4 pb-3 flex flex-col gap-1.5">
              {alerts.slice(0, 8).map(alert => (
                <div key={alert.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-xs text-white/50">{alert.title}</span>
                  <span className="text-[10px] text-white/20 ml-4 shrink-0">{timeAgo(alert.created_at)}</span>
                </div>
              ))}
              {alerts.length > 8 && (
                <p className="text-[10px] text-white/20 text-center pt-1">+{alerts.length - 8} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1.5 mb-6">
        <button
          onClick={() => setView('cards')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: view === 'cards' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: view === 'cards' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
            border: view === 'cards' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Cards
        </button>
        <button
          onClick={() => setView('table')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: view === 'table' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: view === 'table' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
            border: view === 'table' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
          }}
        >
          <Table2 className="w-3.5 h-3.5" />
          Table
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: '#2d2c2a' }} />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#2d2c2a' }}>
            <Users className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">No competitors tracked yet</p>
          <p className="text-white/20 text-xs mt-1">Click "Add Competitor" to get started</p>
        </div>
      ) : view === 'cards' ? (
        /* Cards view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {competitors.map(comp => (
            <Link
              key={comp.id}
              href={`/dashboard/competitors/${comp.id}`}
              className="group rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-white/10"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Name + badge */}
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white/85 leading-snug group-hover:text-white transition-colors truncate">
                    {comp.name}
                  </h3>
                  {comp.brand && (
                    <p className="text-[10px] text-white/25 mt-0.5 truncate">{comp.brand}</p>
                  )}
                </div>
                {comp.is_friend && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ml-2"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                  >
                    <Heart className="w-2.5 h-2.5" />
                    Friend
                  </span>
                )}
              </div>

              {/* Niche */}
              {comp.niche && (
                <p className="text-xs text-white/30 line-clamp-2 leading-relaxed">{comp.niche}</p>
              )}

              {/* Platform stats */}
              <div className="mt-auto flex flex-col gap-1.5">
                {PLATFORM_ORDER.map(platform => {
                  const social = getSocial(comp, platform)
                  if (!social) return null
                  const color = PLATFORM_COLORS[platform]
                  return (
                    <div key={platform} className="flex items-center gap-2">
                      <span style={{ color }} className="flex items-center">
                        {PLATFORM_ICONS[platform]}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {formatFollowers(social.follower_count)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end">
                <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="rounded-xl overflow-hidden" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider w-24" />
                  {competitors.map(comp => (
                    <th key={comp.id} className="px-4 py-3 text-center">
                      <Link href={`/dashboard/competitors/${comp.id}`} className="hover:text-white transition-colors">
                        <span className="text-xs font-medium text-white/70">{comp.name}</span>
                        {comp.is_friend && (
                          <Heart className="w-2.5 h-2.5 inline-block ml-1 text-green-500" style={{ verticalAlign: 'middle' }} />
                        )}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLATFORM_ORDER.map(platform => {
                  const color = PLATFORM_COLORS[platform]
                  return (
                    <tr key={platform} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color }}>{PLATFORM_ICONS[platform]}</span>
                          <span className="text-[11px] font-medium capitalize" style={{ color }}>{platform}</span>
                        </div>
                      </td>
                      {competitors.map(comp => {
                        const social = getSocial(comp, platform)
                        return (
                          <td key={comp.id} className="px-4 py-3 text-center">
                            <span className="text-sm font-medium" style={{ color: social?.follower_count ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}>
                              {formatFollowers(social?.follower_count ?? null)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
