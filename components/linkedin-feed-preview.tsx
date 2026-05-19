'use client'

import { X, ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react'
import type { SocialPost, LinkedInPostType } from '@/lib/types'
import ProfileAvatar from './profile-avatar'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getMediaUrl(file: { url?: string | null; storage_path?: string | null }): string | null {
  if (file.url) return file.url
  if (file.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/social-media/${file.storage_path}`
  return null
}

const STATUS_ORDER: Record<string, number> = {
  published: 0,
  scheduled: 1,
  ready: 2,
  in_progress: 3,
  draft: 4,
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: 'Scheduled', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
  ready: { label: 'Ready', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  draft: { label: 'Draft', bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' },
}

interface Props {
  posts: SocialPost[]
  onClose: () => void
}

export default function LinkedInFeedPreview({ posts, onClose }: Props) {
  const sorted = [...posts].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    const da = a.scheduled_at || a.published_at || a.created_at
    const db = b.scheduled_at || b.published_at || b.created_at
    return new Date(db).getTime() - new Date(da).getTime()
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: '#0077b5' }}>
            <span className="text-white font-bold text-sm">in</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">LinkedIn Feed Preview</p>
            <p className="text-[10px] text-white/40">{sorted.length} posts</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto py-4 px-4 flex flex-col gap-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/40 text-sm">No LinkedIn posts yet</p>
            </div>
          ) : (
            sorted.map(post => (
              <LinkedInPostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function LinkedInPostCard({ post }: { post: SocialPost }) {
  const badge = STATUS_BADGE[post.status]
  const isPublished = post.status === 'published'
  const media = post.media_files?.filter(f => f.file_type === 'image' || f.file_type === 'video' || f.file_type === 'pdf') || []
  const firstMedia = media[0] ?? null
  const firstMediaUrl = firstMedia ? getMediaUrl(firstMedia) : null
  const isCarousel = post.type === 'carousel' && media.length > 1
  const content = post.body || post.caption || ''
  const dateStr = post.published_at || post.scheduled_at || post.created_at
  const date = new Date(dateStr)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: '#1b1f23',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: isPublished ? 1 : 0.85,
      }}
    >
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2.5">
          <ProfileAvatar
            size={40}
            fallback="U"
            fallbackTextClass="text-sm"
            fallbackTextColor="text-white"
            style={{ background: '#0077b5' }}
          />
          <div>
            <p className="text-[13px] font-semibold text-white/90">Your Name</p>
            <p className="text-[11px] text-white/35 leading-tight">Your headline</p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[10px] text-white/25">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <span className="text-white/15">·</span>
              <Globe className="w-2.5 h-2.5 text-white/25" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPublished && badge && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
              {post.scheduled_at && post.status === 'scheduled' && (
                <> · {new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
              )}
            </span>
          )}
          <MoreHorizontal className="w-4 h-4 text-white/20" />
        </div>
      </div>

      {content && (
        <div className="px-3 pb-2">
          <p className="text-[13px] text-white/75 leading-relaxed whitespace-pre-line line-clamp-6">
            {content}
          </p>
          {content.length > 300 && (
            <span className="text-[12px] text-white/40">...see more</span>
          )}
        </div>
      )}

      {post.hashtags?.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[12px] text-[#0077b5]/80">
            {post.hashtags.slice(0, 5).join(' ')}
          </p>
        </div>
      )}

      {firstMediaUrl && firstMedia && (
        <div className="relative">
          {firstMedia.file_type === 'video' ? (
            <video src={firstMediaUrl} controls className="w-full" style={{ maxHeight: 400 }} />
          ) : firstMedia.file_type === 'pdf' ? (
            <iframe src={firstMediaUrl} className="w-full border-0" style={{ height: 400 }} title={firstMedia.filename || 'PDF'} />
          ) : (
            <img src={firstMediaUrl} alt="" className="w-full object-cover" style={{ maxHeight: 400 }} />
          )}
          {isCarousel && media.length > 1 && (
            <div className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)' }}>
              1/{media.length}
            </div>
          )}
        </div>
      )}

      {!firstMediaUrl && post.type === 'article' && (
        <div className="mx-3 mb-2 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[12px] font-semibold text-white/60">{post.title}</p>
          <p className="text-[10px] text-white/25 mt-0.5">Article</p>
        </div>
      )}

      <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-0.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#0077b5' }}>
              <ThumbsUp className="w-2 h-2 text-white" />
            </div>
          </div>
          <span className="text-[11px] text-white/30 ml-1">—</span>
        </div>
        <span className="text-[11px] text-white/25">— comments</span>
      </div>

      <div className="flex items-center justify-between px-2 py-1">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageSquare, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/30 hover:bg-white/5 transition-colors">
            <Icon className="w-4 h-4" />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
