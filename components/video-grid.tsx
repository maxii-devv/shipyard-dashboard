'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Clock, CheckCircle, Radio, Youtube, Plus, FileText, ImageIcon, AlignLeft, Hash, Type, Inbox, Sparkles, Film } from 'lucide-react'
import type { Asset } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Video {
  id: string
  title: string
  status: string
  platform: string
  created_at: string
  youtube_url: string | null
  assets: Asset[]
  video_thumbnails: { thumbnail: { url?: string | null; storage_path?: string | null } | null; is_chosen: boolean }[]
}

type StatusFilter = 'in_progress' | 'ready_to_create' | 'editing' | 'ready' | 'published' | 'backlog'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_progress:     { label: 'In Progress',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ready_to_create: { label: 'Ready to Create', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  editing:         { label: 'Editing',         color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  ready:           { label: 'Ready',           color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  published:       { label: 'Published',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  backlog:         { label: 'Backlog',         color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

const ASSET_ICONS = [
  { type: 'title',       icon: Type,      label: 'Title'       },
  { type: 'script',      icon: FileText,  label: 'Script'      },
  { type: 'thumbnail',   icon: ImageIcon, label: 'Thumbnail'   },
  { type: 'description', icon: AlignLeft, label: 'Description' },
  { type: 'tags',        icon: Hash,      label: 'Tags'        },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getThumbUrl(thumb: { url?: string | null; storage_path?: string | null } | null): string | null {
  if (!thumb) return null
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return null
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Asset dot row ────────────────────────────────────────────────────────────

function AssetDots({ assets }: { assets: Asset[] }) {
  return (
    <div className="flex items-center gap-1">
      {ASSET_ICONS.map(({ type, icon: Icon, label }) => {
        const asset = assets.find(a => a.type === type)
        const status = asset?.status
        const color = status === 'approved'
          ? '#22c55e'
          : status === 'pending_review'
          ? '#f59e0b'
          : status === 'revision_requested'
          ? '#ef4444'
          : 'rgba(255,255,255,0.12)'
        return (
          <div
            key={type}
            title={`${label}: ${status ?? 'not started'}`}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Icon className="w-2.5 h-2.5" style={{ color }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: Video }) {
  const cfg = STATUS_CONFIG[video.status]
  const chosenVt = (video.video_thumbnails ?? []).find(vt => vt.is_chosen)
  const thumbSrc = getThumbUrl(chosenVt?.thumbnail ?? null)
  const pendingCount = video.assets.filter(a => a.status === 'pending_review').length

  return (
    <Link href={`/dashboard/videos/${video.id}`} className="group block">
      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none' }}
      >
        {/* Thumbnail */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: '#1c1b1a' }}>
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2d2c2a 0%, #1c1b1a 100%)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <Play className="w-4 h-4 ml-0.5" style={{ color: 'rgba(220,38,38,0.3)' }} />
              </div>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.12)' }}>No thumbnail yet</span>
            </div>
          )}

          {/* Pending badge */}
          {pendingCount > 0 && (
            <div className="absolute top-2 left-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.9)', color: '#000' }}>
                {pendingCount} review
              </span>
            </div>
          )}

          {/* Duration / date overlay */}
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)' }}>
              {timeAgo(video.created_at)}
            </span>
          </div>
        </div>

        {/* Card footer */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="text-[13px] font-medium leading-snug line-clamp-2 transition-colors"
            style={{ color: 'rgba(255,255,255,0.85)' }}>
            {video.title}
          </h3>

          {/* Status + asset dots */}
          <div className="flex items-center justify-between">
            {cfg ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            ) : (
              <span />
            )}
            <AssetDots assets={video.assets} />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Main grid component ──────────────────────────────────────────────────────

interface VideoGridProps {
  videos: Video[]
}

export function VideoGrid({ videos }: VideoGridProps) {
  const [filter, setFilter] = useState<StatusFilter>('in_progress')

  const counts = {
    in_progress:     videos.filter(v => v.status === 'in_progress').length,
    ready_to_create: videos.filter(v => v.status === 'ready_to_create').length,
    editing:         videos.filter(v => v.status === 'editing').length,
    ready:           videos.filter(v => v.status === 'ready').length,
    published:       videos.filter(v => v.status === 'published').length,
    backlog:         videos.filter(v => v.status === 'backlog').length,
  }

  const filtered = videos.filter(v => v.status === filter)

  const tabs: { id: StatusFilter; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'in_progress',     label: 'In Progress',     icon: Clock,       color: '#f59e0b' },
    { id: 'ready_to_create', label: 'Ready to Create', icon: Sparkles,    color: '#f472b6' },
    { id: 'editing',         label: 'Editing',         icon: Film,        color: '#c084fc' },
    { id: 'ready',           label: 'Ready',           icon: CheckCircle, color: '#38bdf8' },
    { id: 'published',       label: 'Published',       icon: Radio,       color: '#22c55e' },
    { id: 'backlog',         label: 'Backlog',         icon: Inbox,       color: '#a78bfa' },
  ]

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = filter === tab.id
          const count = counts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all"
              style={{
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: active ? tab.color : 'rgba(255,255,255,0.3)',
                border: active ? `1px solid rgba(255,255,255,0.08)` : '1px solid transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono ml-0.5"
                  style={{
                    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: active ? tab.color : 'rgba(255,255,255,0.2)',
                  }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <Youtube className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No {filter.replace('_', ' ')} videos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
