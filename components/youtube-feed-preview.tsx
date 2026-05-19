'use client'

import { X, Play, Clock, MoreVertical, Youtube } from 'lucide-react'
import type { Asset } from '@/lib/types'
import ProfileAvatar from './profile-avatar'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Video {
  id: string
  title: string
  status: string
  platform: string
  created_at: string
  scheduled_at?: string | null
  published_at?: string | null
  youtube_url: string | null
  assets: Asset[]
  video_thumbnails: { thumbnail: { url?: string | null; storage_path?: string | null } | null; is_chosen: boolean }[]
}

function getThumbUrl(thumb: { url?: string | null; storage_path?: string | null } | null): string | null {
  if (!thumb) return null
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return null
}

const STATUS_ORDER: Record<string, number> = {
  published: 0,
  ready: 1,
  editing: 2,
  ready_to_create: 3,
  in_progress: 4,
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ready: { label: 'Ready', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
  editing: { label: 'Editing', bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
  ready_to_create: { label: 'Ready to Create', bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
}

interface Props {
  videos: Video[]
  onClose: () => void
}

export default function YouTubeFeedPreview({ videos, onClose }: Props) {
  const sorted = [...videos].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    const da = a.published_at || a.created_at
    const db = b.published_at || b.created_at
    return new Date(db).getTime() - new Date(da).getTime()
  })

  const published = sorted.filter(v => v.status === 'published')
  const upcoming = sorted.filter(v => v.status !== 'published')

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#21201e' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)' }}>
            <Youtube className="w-4 h-4" style={{ color: '#dc2626' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Channel Preview</p>
            <p className="text-[10px] text-white/40">{videos.length} videos</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              size={64}
              fallback="YT"
              fallbackTextClass="text-xl"
              style={{ background: '#1a1a1a', border: '2px solid rgba(220,38,38,0.2)' }}
            />
            <div>
              <p className="text-lg font-bold text-white">Your Channel</p>
              <p className="text-xs text-white/35">@yourchannel</p>
              <p className="text-[11px] text-white/25 mt-0.5">{published.length} videos</p>
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs font-medium text-amber-400">
                {upcoming.length} Upcoming
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcoming.map(video => (
                <UpcomingCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-6">
            <button className="text-xs font-semibold text-white/80 pb-2 border-b-2 border-white -mb-[13px]">
              VIDEOS
            </button>
            <button className="text-xs font-semibold text-white/30 pb-2 -mb-[13px]">
              SHORTS
            </button>
            <button className="text-xs font-semibold text-white/30 pb-2 -mb-[13px]">
              PLAYLISTS
            </button>
          </div>
        </div>

        <div className="p-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/40 text-sm">No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UpcomingCard({ video }: { video: Video }) {
  const chosenVt = (video.video_thumbnails ?? []).find(vt => vt.is_chosen)
  const thumbSrc = getThumbUrl(chosenVt?.thumbnail ?? null)
  const badge = STATUS_BADGE[video.status]

  return (
    <div
      className="shrink-0 w-52 rounded-lg overflow-hidden"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="relative" style={{ aspectRatio: '16/9', background: '#2d2c2a' }}>
        {thumbSrc ? (
          <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white/10" />
          </div>
        )}
        {badge && (
          <div className="absolute bottom-1.5 left-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] text-white/70 font-medium line-clamp-2 leading-tight">{video.title}</p>
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: Video }) {
  const chosenVt = (video.video_thumbnails ?? []).find(vt => vt.is_chosen)
  const thumbSrc = getThumbUrl(chosenVt?.thumbnail ?? null)
  const isPublished = video.status === 'published'
  const badge = STATUS_BADGE[video.status]
  const date = video.published_at || video.created_at

  return (
    <div className="group">
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#2d2c2a' }}>
        {thumbSrc ? (
          <img src={thumbSrc} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2d2c2a, #1c1b1a)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.08)' }}>
              <Play className="w-4 h-4 ml-0.5" style={{ color: 'rgba(220,38,38,0.25)' }} />
            </div>
          </div>
        )}
        <div className="absolute bottom-1.5 right-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.8)', color: 'rgba(255,255,255,0.7)' }}>
            —:——
          </span>
        </div>
        {!isPublished && badge && (
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2.5 mt-2.5">
        <ProfileAvatar
          size={32}
          fallback="YT"
          className="mt-0.5"
          fallbackTextClass="text-[10px]"
          style={{ background: '#1a1a1a' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white/85 leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {video.title}
          </p>
          <p className="text-[11px] text-white/35 mt-0.5">Your Channel</p>
          <p className="text-[11px] text-white/25">
            — views · {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <MoreVertical className="w-4 h-4 text-white/15 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
