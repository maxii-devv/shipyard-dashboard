'use client'

import { X, Heart, MessageCircle, Send, Bookmark, Film, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SocialPost, InstagramPostType } from '@/lib/types'
import ProfileAvatar from './profile-avatar'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getMediaUrl(file: { url?: string | null; storage_path?: string | null }): string | null {
  if (file.url) return file.url
  if (file.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/social-media/${file.storage_path}`
  return null
}

const TYPE_ICONS: Partial<Record<InstagramPostType, React.ReactNode>> = {
  reel: <Film className="w-3 h-3" />,
  carousel: <LayoutGrid className="w-3 h-3" />,
}

const STATUS_ORDER: Record<string, number> = {
  published: 0,
  scheduled: 1,
  ready: 2,
  in_progress: 3,
  draft: 4,
}

interface Props {
  posts: SocialPost[]
  historicalPosts?: any[]
  onClose: () => void
}

export default function InstagramFeedPreview({ posts, historicalPosts = [], onClose }: Props) {
  // Sort: published first, then scheduled (by date), then ready, etc.
  const sorted = [...posts].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    // Within same status, sort by scheduled_at or created_at
    const da = a.scheduled_at || a.published_at || a.created_at
    const db = b.scheduled_at || b.published_at || b.created_at
    return new Date(db).getTime() - new Date(da).getTime()
  })

  const published = sorted.filter(p => p.status === 'published')
  const scheduled = sorted.filter(p => p.status === 'scheduled')
  const upcoming = sorted.filter(p => p.status === 'ready' || p.status === 'in_progress' || p.status === 'draft')

  // Compute total post count including historical
  const totalPosts = published.length + historicalPosts.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            size={32}
            fallback="T"
            fallbackTextClass="text-sm"
            fallbackTextColor="text-white"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          />
          <div>
            <p className="text-sm font-semibold text-white">yourhandle</p>
            <p className="text-[10px] text-white/40">Feed Preview</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: 470, margin: '0 auto' }}>
          {/* Profile header */}
          <div className="px-4 py-5 border-b border-white/5">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', padding: '3px' }}>
                <ProfileAvatar
                  size={74}
                  fallback="T"
                  fallbackTextClass="text-2xl"
                  fallbackTextColor="text-white/60"
                  style={{ background: '#000' }}
                />
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{totalPosts}</p>
                  <p className="text-[11px] text-white/40">posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">&mdash;</p>
                  <p className="text-[11px] text-white/40">followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">&mdash;</p>
                  <p className="text-[11px] text-white/40">following</p>
                </div>
              </div>
            </div>
            {/* Name + Bio */}
            <div className="mt-3">
              <p className="text-[13px] font-semibold text-white">Your Name</p>
              <p className="text-[12px] text-white/50 leading-relaxed mt-0.5">Content Creator</p>
            </div>
          </div>

          {/* Scheduled section */}
          {scheduled.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <p className="text-xs font-medium text-sky-400">
                  {scheduled.length} Scheduled
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {scheduled.map(post => (
                  <ScheduledCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-medium text-amber-400">
                  {upcoming.length} In Pipeline
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {upcoming.map(post => (
                  <ScheduledCard key={post.id} post={post} dim />
                ))}
              </div>
            </div>
          )}

          {/* Grid section */}
          <div className="border-t border-white/5 mt-2">
            <div className="flex items-center justify-center gap-8 py-3">
              <button className="text-xs font-semibold text-white/80 border-t-2 border-white pt-2 -mt-[13px]">
                POSTS
              </button>
              <button className="text-xs font-semibold text-white/30 pt-2 -mt-[13px]">
                REELS
              </button>
            </div>

            {/* 3-column Instagram grid */}
            <div className="grid grid-cols-3 gap-[2px]">
              {sorted.map(post => (
                <GridCell key={post.id} post={post} />
              ))}
              {/* Historical posts from Metricool */}
              {historicalPosts.map((mp: any, i: number) => (
                <HistoricalGridCell key={`hist-${i}`} post={mp} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduledCard({ post, dim }: { post: SocialPost; dim?: boolean }) {
  const firstMedia = post.media_files?.[0]
  const mediaUrl = firstMedia ? getMediaUrl(firstMedia) : null
  const date = post.scheduled_at ? new Date(post.scheduled_at) : null

  return (
    <div
      className="shrink-0 w-32 rounded-lg overflow-hidden"
      style={{
        background: '#2d2c2a',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: dim ? 0.5 : 1,
      }}
    >
      <div className="aspect-square relative" style={{ background: '#1c1b1a' }}>
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/10 text-2xl">
              {TYPE_ICONS[post.type as InstagramPostType] || '\ud83d\udcf1'}
            </span>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[8px] px-1 py-0.5 rounded bg-black/70 text-white/70 font-medium uppercase">
            {post.type}
          </span>
        </div>
      </div>
      <div className="p-2">
        <p className="text-[10px] text-white/70 font-medium line-clamp-2 leading-tight">{post.title}</p>
        {date && (
          <p className="text-[9px] text-white/30 mt-1">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' '}
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
        {!date && (
          <p className="text-[9px] text-white/20 mt-1 italic">
            {post.status === 'draft' ? 'Draft' : post.status === 'in_progress' ? 'In Progress' : 'Ready'}
          </p>
        )}
      </div>
    </div>
  )
}

function GridCell({ post }: { post: SocialPost }) {
  const firstMedia = post.media_files?.[0]
  const mediaUrl = firstMedia ? getMediaUrl(firstMedia) : null
  const isScheduled = post.status === 'scheduled'
  const isUpcoming = post.status === 'draft' || post.status === 'in_progress' || post.status === 'ready'
  const isReel = post.type === 'reel'
  const isCarousel = post.type === 'carousel' || post.type === 'thread_carousel'

  return (
    <div className="aspect-square relative group" style={{ background: '#2d2c2a' }}>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: '#262624' }}>
          <span className="text-white/8 text-xs font-medium text-center px-2 line-clamp-3">{post.title}</span>
        </div>
      )}

      {/* Reel / carousel icon */}
      {(isReel || isCarousel) && (
        <div className="absolute top-2 right-2">
          {isReel ? <Film className="w-3.5 h-3.5 text-white/70" /> : <LayoutGrid className="w-3.5 h-3.5 text-white/70" />}
        </div>
      )}

      {/* Status overlay for non-published */}
      {(isScheduled || isUpcoming) && (
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-1.5 pb-1.5">
            <span
              className="text-[8px] px-1.5 py-0.5 rounded font-medium block text-center"
              style={{
                background: isScheduled ? 'rgba(56,189,248,0.9)' : 'rgba(255,255,255,0.15)',
                color: isScheduled ? '#000' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {isScheduled ? `Scheduled ${post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}` : post.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
        <div className="flex items-center gap-1">
          <Heart className="w-4 h-4 text-white" fill="white" />
          <span className="text-xs font-bold text-white">&mdash;</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4 text-white" fill="white" />
          <span className="text-xs font-bold text-white">&mdash;</span>
        </div>
      </div>
    </div>
  )
}

function HistoricalGridCell({ post }: { post: any }) {
  const mediaUrl = post.mediaUrl || post.imageUrl || post.thumbnailUrl || null
  const text = post.text || post.caption || ''
  const isReel = post.type === 'REEL' || post.mediaType === 'VIDEO' || !!post.videoUrl
  const likes = post.metrics?.likes ?? post.likes ?? 0
  const comments = post.metrics?.comments ?? post.comments ?? 0

  return (
    <div className="aspect-square relative group" style={{ background: '#2d2c2a' }}>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: '#262624' }}>
          <span className="text-white/8 text-xs font-medium text-center px-2 line-clamp-3">{text.slice(0, 60)}</span>
        </div>
      )}

      {/* Reel icon */}
      {isReel && (
        <div className="absolute top-2 right-2">
          <Film className="w-3.5 h-3.5 text-white/70" />
        </div>
      )}

      {/* Hover overlay with metrics */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
        <div className="flex items-center gap-1">
          <Heart className="w-4 h-4 text-white" fill="white" />
          <span className="text-xs font-bold text-white">{likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4 text-white" fill="white" />
          <span className="text-xs font-bold text-white">{comments}</span>
        </div>
      </div>
    </div>
  )
}
