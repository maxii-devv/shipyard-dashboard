'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Youtube, Instagram, Linkedin, ExternalLink,
  Eye, ThumbsUp, MessageSquare, Clock, AlertTriangle, Globe,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFollowers(n: number | null): string {
  if (!n) return '\u2014'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#dc2626',
  instagram: '#e1306c',
  linkedin: '#0077b5',
}

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  youtube: Youtube,
  instagram: Instagram,
  linkedin: Linkedin,
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

function Sparkline({ data, color, width = 120, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types (inline — no shared types file for competitors yet)
// ---------------------------------------------------------------------------

interface Snapshot {
  id: string
  follower_count: number | null
  bio: string | null
  extra_metrics: Record<string, unknown> | null
  snapshot_date: string
}

interface Social {
  id: string
  platform: string
  handle: string
  profile_url: string | null
  follower_count: number | null
  bio: string | null
  data_source: string | null
  last_checked_at: string | null
  snapshots: Snapshot[]
}

interface Competitor {
  id: string
  name: string
  slug: string
  brand: string | null
  niche: string | null
  location: string | null
  background: string | null
  is_friend: boolean
  links: { label: string; url: string }[] | null
  business_notes: Record<string, string> | null
  content_style: string | null
  notable: string | null
  socials: Social[]
}

interface CompetitorPost {
  id: string
  platform: string
  title: string
  url: string | null
  content_type: string | null
  thumbnail_url: string | null
  published_at: string | null
  metrics: Record<string, number> | null
}

interface Alert {
  id: string
  alert_type: string
  title: string
  details: Record<string, unknown> | null
  social_id: string | null
  is_read: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [competitor, setCompetitor] = useState<Competitor | null>(null)
  const [posts, setPosts] = useState<CompetitorPost[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/competitors/${id}`).then(r => r.json()),
      fetch(`/api/competitors/${id}/posts`).then(r => r.json()),
      fetch(`/api/competitors/alerts?competitor_id=${id}`).then(r => r.json()),
    ]).then(([comp, p, a]) => {
      setCompetitor(comp)
      setPosts(Array.isArray(p) ? p : [])
      setAlerts(Array.isArray(a) ? a : [])
      setLoading(false)
    })
  }, [id])

  // Loading state
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#262624' }}>
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  )

  // Not found
  if (!competitor || competitor.id === undefined) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#262624' }}>
      <p className="text-white/40">Competitor not found</p>
    </div>
  )

  const bioAlerts = alerts.filter(a => a.alert_type === 'bio_changed')

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto" style={{ background: '#262624' }}>

      {/* ----------------------------------------------------------------- */}
      {/* 1. Header                                                         */}
      {/* ----------------------------------------------------------------- */}
      <Link href="/dashboard/competitors" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Competitors
      </Link>

      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white/90 truncate">{competitor.name}</h1>
            {competitor.is_friend && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                Friend
              </span>
            )}
          </div>
          {competitor.brand && (
            <p className="text-sm text-white/50 mb-1">{competitor.brand}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-white/35">
            {competitor.niche && <span>{competitor.niche}</span>}
            {competitor.location && (
              <>
                <span className="text-white/15">|</span>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{competitor.location}</span>
              </>
            )}
          </div>
          {competitor.background && (
            <p className="text-xs text-white/30 mt-2 max-w-xl leading-relaxed">{competitor.background}</p>
          )}

          {/* Link pills */}
          {competitor.links && competitor.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {competitor.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/50 hover:text-white/80 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <ExternalLink className="w-3 h-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <button disabled className="px-4 py-2 rounded-lg text-xs font-medium text-white/30 cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          Edit
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Social Accounts Grid                                           */}
      {/* ----------------------------------------------------------------- */}
      {competitor.socials && competitor.socials.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Social Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {competitor.socials.map(social => {
              const color = PLATFORM_COLORS[social.platform] || '#888'
              const Icon = PLATFORM_ICONS[social.platform] || Globe
              const snapData = (social.snapshots || [])
                .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
                .map(s => s.follower_count)
                .filter((v): v is number => v !== null)

              return (
                <div key={social.id} className="rounded-xl p-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      {social.profile_url ? (
                        <a href={social.profile_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline" style={{ color }}>
                          @{social.handle}
                        </a>
                      ) : (
                        <span className="text-sm font-medium" style={{ color }}>@{social.handle}</span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-white/80">{formatFollowers(social.follower_count)}</span>
                  </div>

                  {social.bio && (
                    <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{social.bio}</p>
                  )}

                  {snapData.length >= 2 && (
                    <div className="mb-3">
                      <Sparkline data={snapData} color={color} />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {social.data_source && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white/30"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {social.data_source}
                      </span>
                    )}
                    {social.last_checked_at && (
                      <span className="flex items-center gap-1 text-[10px] text-white/20">
                        <Clock className="w-3 h-3" />
                        {formatDate(social.last_checked_at)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. Bio Change Timeline                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-10">
        <h2 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          Bio Changes
        </h2>
        {bioAlerts.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm text-white/25">No bio changes detected yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bioAlerts.map(alert => {
              const social = competitor.socials?.find(s => s.id === alert.social_id)
              const platform = social?.platform
              const oldBio = alert.details?.old_bio as string | undefined
              const newBio = alert.details?.new_bio as string | undefined
              return (
                <div key={alert.id} className="rounded-xl p-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-white/30">{formatDate(alert.created_at)}</span>
                    {platform && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${PLATFORM_COLORS[platform] || '#888'}20`, color: PLATFORM_COLORS[platform] || '#888' }}>
                        {platform}
                      </span>
                    )}
                  </div>
                  {oldBio && (
                    <p className="text-xs text-red-400/70 line-through mb-1 leading-relaxed">{oldBio}</p>
                  )}
                  {newBio && (
                    <p className="text-xs text-green-400/70 leading-relaxed">{newBio}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Recent Posts Feed                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-10">
        <h2 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Recent Posts</h2>
        {posts.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm text-white/25">No tracked posts yet. Run a sync to discover YouTube videos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const pColor = PLATFORM_COLORS[post.platform] || '#888'
              const PIcon = PLATFORM_ICONS[post.platform] || Globe
              const metrics = post.metrics || {}
              return (
                <div key={post.id} className="rounded-xl p-4 flex gap-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {post.thumbnail_url && (
                    <img src={post.thumbnail_url} alt="" className="w-28 h-20 rounded-lg object-cover flex-shrink-0" style={{ background: '#1c1b1a' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: pColor }} />
                      <span className="text-sm font-medium text-white/80 truncate">{post.title}</span>
                    </div>
                    {post.published_at && (
                      <p className="text-[11px] text-white/25 mb-2">{formatDate(post.published_at)}</p>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-white/35">
                      {metrics.views !== undefined && (
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{metrics.views.toLocaleString()}</span>
                      )}
                      {metrics.likes !== undefined && (
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{metrics.likes.toLocaleString()}</span>
                      )}
                      {metrics.comments !== undefined && (
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{metrics.comments.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Business Intel                                                 */}
      {/* ----------------------------------------------------------------- */}
      {competitor.business_notes && Object.keys(competitor.business_notes).length > 0 && (
        <div className="mb-10">
          <h2 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Business Intel</h2>
          <div className="rounded-xl p-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="space-y-2.5">
              {Object.entries(competitor.business_notes).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3">
                  <span className="text-[11px] font-medium text-white/30 uppercase tracking-wide min-w-[100px] pt-0.5">{key}</span>
                  <span className="text-sm text-white/60 leading-relaxed">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Notable & Content Style                                        */}
      {/* ----------------------------------------------------------------- */}
      {(competitor.content_style || competitor.notable) && (
        <div className="mb-10">
          <h2 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Notes</h2>
          <div className="rounded-xl p-4 space-y-4" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {competitor.content_style && (
              <div>
                <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold block mb-1">Content Style</span>
                <p className="text-sm text-white/50 leading-relaxed">{competitor.content_style}</p>
              </div>
            )}
            {competitor.notable && (
              <div>
                <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold block mb-1">Notable</span>
                <p className="text-sm text-white/50 leading-relaxed">{competitor.notable}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
