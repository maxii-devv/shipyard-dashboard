'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Tag, FileSearch, Activity, Instagram, Youtube, Settings, BarChart3, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Sparkline } from '@/components/sparkline'
import { useSettings } from '@/components/settings-context'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType | (() => React.ReactNode)
  exact?: boolean
  color?: string
  disabled?: boolean
}

interface NavSection {
  label?: string
  items: NavItem[]
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  )
}

function MetaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 5c-2.4 0-4.3 1.8-5.5 4-1.2-2.2-3.1-4-5.5-4C3.4 5 1.5 8.1 1.5 12s1.9 7 4.9 7c2.4 0 4.3-1.8 5.6-4 1.3 2.2 3.2 4 5.5 4 3 0 4.9-3.1 4.9-7s-1.9-7-4.9-7Zm-11 11.5c-1.6 0-2.6-2-2.6-4.5s1-4.5 2.6-4.5c1.6 0 2.9 2 4 4.5-1.1 2.5-2.4 4.5-4 4.5Zm11 0c-1.6 0-2.9-2-4-4.5 1.1-2.5 2.4-4.5 4-4.5 1.6 0 2.6 2 2.6 4.5s-1 4.5-2.6 4.5Z" />
    </svg>
  )
}

const sections: NavSection[] = [
  {
    label: 'Platforms',
    items: [
      { href: '/dashboard', label: 'Instagram', icon: Instagram, exact: true, color: '#e1306c' },
      { href: '/dashboard/youtube', label: 'YouTube', icon: Youtube, color: '#ff0000' },
      { href: '/dashboard/x', label: 'X', icon: XIcon, color: '#ffffff' },
      { href: '/dashboard/tiktok', label: 'TikTok', icon: TikTokIcon, color: '#25f4ee' },
      { href: '/dashboard/meta-ads', label: 'Meta Ads', icon: MetaIcon, color: '#0866ff' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, color: '#38bdf8' },
      { href: '/dashboard/tag', label: 'Tag Posts', icon: Tag, color: '#f59e0b', disabled: true },
      { href: '/dashboard/review', label: 'Review', icon: FileSearch, color: '#6366f1', disabled: true },
      { href: '/dashboard/system', label: 'System', icon: Activity, color: '#34d399', disabled: true },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { href: '/dashboard/preferences', label: 'Settings', icon: Settings, color: '#a78bfa' },
    ],
  },
]

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  accentColor,
  disabled,
}: {
  href: string
  label: string
  icon: React.ElementType | (() => React.ReactNode)
  exact?: boolean
  accentColor?: string
  disabled?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  const color = accentColor ?? '#dc2626'

  return (
    <Link
      href={href}
      prefetch={!disabled}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
      style={{
        background: isActive ? `${color}15` : 'transparent',
        color: isActive ? color : 'rgba(255,255,255,0.4)',
        border: isActive ? `1px solid ${color}25` : '1px solid transparent',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
        }
      }}
    >
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-80">
        <Icon className="w-4 h-4" />
      </span>
      {label}
    </Link>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtSparkDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface SidebarStatsPayload {
  totalViews: number
  spark: number[]
  sparkDates: string[]
  days: number
}

function ProfileStats() {
  const searchParams = useSearchParams()
  const daysParam = searchParams?.get('days')
  const days = Math.min(Math.max(parseInt(daysParam ?? '30', 10) || 30, 1), 365)

  const [stats, setStats] = useState<SidebarStatsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/sidebar-stats?days=${days}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d && typeof d.totalViews === 'number') {
          setStats({
            totalViews: d.totalViews,
            spark: Array.isArray(d.spark) ? d.spark : [],
            sparkDates: Array.isArray(d.sparkDates) ? d.sparkDates : [],
            days: typeof d.days === 'number' ? d.days : days,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  const sparkDatesFormatted = stats?.sparkDates.map(fmtSparkDate) ?? []

  return (
    <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{
            background: '#1c1b1a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/izan-logo.avif"
            alt="@madebyizan"
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/50 truncate">@madebyizan</p>
          {loading ? (
            <div className="h-4 w-14 rounded bg-white/5 animate-pulse mt-0.5" />
          ) : stats && stats.totalViews > 0 ? (
            <p className="text-[15px] font-bold text-white font-mono leading-tight">
              {fmt(stats.totalViews)}
              <span className="text-[9px] font-medium text-white/25 ml-1 font-sans">
                views · {days}d
              </span>
            </p>
          ) : (
            <p className="text-[10px] text-white/30 mt-0.5">No data yet</p>
          )}
        </div>
      </div>
      {stats && stats.spark.length >= 2 && (
        <div className="mt-2 -mx-1">
          <Sparkline
            data={stats.spark}
            dates={sparkDatesFormatted}
            interactive
            valueFormatter={n =>
              n >= 1_000_000
                ? `${(n / 1_000_000).toFixed(1)}M views`
                : n >= 1_000
                ? `${(n / 1_000).toFixed(1)}K views`
                : `${Math.round(n)} views`
            }
            height={28}
            color="#e1306c"
            strokeWidth={1.5}
            showDot
            fill
          />
        </div>
      )}
    </div>
  )
}

/** Icon-only entry used when the sidebar is collapsed to the rail. */
function RailItem({
  href,
  label,
  icon: Icon,
  exact,
  accentColor,
  disabled,
}: {
  href: string
  label: string
  icon: React.ElementType | (() => React.ReactNode)
  exact?: boolean
  accentColor?: string
  disabled?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  const color = accentColor ?? '#dc2626'

  return (
    <Link
      href={href}
      prefetch={!disabled}
      title={label}
      aria-label={label}
      className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
      style={{
        background: isActive ? `${color}22` : 'transparent',
        color: isActive ? color : 'rgba(255,255,255,0.45)',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
        }
      }}
    >
      <Icon className="w-[18px] h-[18px]" />
    </Link>
  )
}

interface SidebarProps {
  userEmail?: string | null
}

export function Sidebar({ userEmail: _userEmail }: SidebarProps) {
  const { sidebarHidden, toggleSidebar } = useSettings()

  // Collapsed: a slim Claude-style icon rail (still visible) rather
  // than fully hiding the panel.
  if (sidebarHidden) {
    return (
      <aside
        data-tour="sidebar"
        className="fixed top-3 left-3 z-10 flex flex-col items-center rounded-2xl overflow-hidden"
        style={{
          width: 60,
          background: '#1f1e1d',
          border: '1px solid rgba(255,255,255,0.08)',
          height: 'calc(100vh - 24px)',
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        <button
          onClick={toggleSidebar}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--app-accent)'
            e.currentTarget.style.color = '#1f1e1d'
            e.currentTarget.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <nav className="flex-1 mt-4 flex flex-col items-center gap-1 overflow-y-auto w-full">
          {sections
            .flatMap(s => s.items)
            .map(item => (
              <RailItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                exact={item.exact}
                accentColor={item.color}
                disabled={item.disabled}
              />
            ))}
        </nav>

        <div
          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-2"
          title="@madebyizan"
          style={{ background: '#1a1917', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/izan-logo.avif"
            alt="@madebyizan"
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
      </aside>
    )
  }

  return (
    <aside
      data-tour="sidebar"
      className="fixed top-3 left-3 w-64 flex flex-col z-10 rounded-2xl overflow-hidden"
      style={{
        background: '#1f1e1d',
        border: '1px solid rgba(255,255,255,0.08)',
        height: 'calc(100vh - 24px)',
      }}
    >
      <button
        onClick={toggleSidebar}
        title="Hide sidebar"
        aria-label="Hide sidebar"
        className="absolute top-2.5 right-2.5 flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 transition-all z-10"
        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--app-accent)'
          e.currentTarget.style.color = '#262624'
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <PanelLeftClose className="w-4 h-4" />
      </button>

      <Suspense
        fallback={
          <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                style={{
                  background: '#1c1b1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-14 rounded bg-white/5 animate-pulse mt-1.5" />
              </div>
            </div>
          </div>
        }
      >
        <ProfileStats />
      </Suspense>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-5">
        {sections.map((section, idx) => (
          <div key={section.label ?? `section-${idx}`}>
            {section.label && (
              <p
                className="text-[9px] px-3 mb-1.5 font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  exact={item.exact}
                  accentColor={item.color}
                  disabled={item.disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="px-4 py-3 text-[10px]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        Data syncs daily at 06:00 UTC
        <span style={{ display: 'block', marginTop: 2, color: 'rgba(255,255,255,0.18)' }}>
          (Vercel Hobby plan — Pro unlocks 6h sync)
        </span>
      </div>
    </aside>
  )
}
