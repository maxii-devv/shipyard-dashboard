'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Play, Bookmark, Share2, X } from 'lucide-react'
import type { OutlierPost } from '@/lib/services/viralPatternsService'

const INITIAL_LIMIT = 4
const EXPAND_ACCENT = '#fbbf24'

function fmt(n: number | null | undefined): string {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(Math.round(v))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface OutlierGridProps {
  outliers: OutlierPost[]
  activeFilter?: { kind: string; value: string } | null
  onClearFilter?: () => void
}

export function OutlierGrid({ outliers, activeFilter, onClearFilter }: OutlierGridProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? outliers : outliers.slice(0, INITIAL_LIMIT)
  const hiddenCount = outliers.length - INITIAL_LIMIT
  const canExpand = outliers.length > INITIAL_LIMIT

  return (
    <div className="space-y-3">
      {activeFilter && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.18)',
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Filtered by</span>
          <span
            className="font-medium uppercase tracking-wide text-[10px]"
            style={{ color: '#a5b4fc' }}
          >
            {activeFilter.kind}
          </span>
          <span className="font-semibold">{activeFilter.value}</span>
          <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {outliers.length} match{outliers.length === 1 ? '' : 'es'}
          </span>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              aria-label="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {outliers.length === 0 ? (
        <div
          className="rounded-xl px-4 py-6 text-[12px] text-center"
          style={{
            background: '#2d2c2a',
            border: '1px dashed rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          No outliers match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map(post => (
            <OutlierCard key={post.instagram_media_id} post={post} />
          ))}
        </div>
      )}

      {canExpand && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background: `${EXPAND_ACCENT}12`,
              border: `1px solid ${EXPAND_ACCENT}40`,
              color: EXPAND_ACCENT,
              boxShadow: `0 0 18px ${EXPAND_ACCENT}20, inset 0 0 8px ${EXPAND_ACCENT}10`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${EXPAND_ACCENT}22`
              e.currentTarget.style.boxShadow = `0 0 26px ${EXPAND_ACCENT}50, inset 0 0 10px ${EXPAND_ACCENT}20`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${EXPAND_ACCENT}12`
              e.currentTarget.style.boxShadow = `0 0 18px ${EXPAND_ACCENT}20, inset 0 0 8px ${EXPAND_ACCENT}10`
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Top {INITIAL_LIMIT} only
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show {hiddenCount} more
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function OutlierCard({ post }: { post: OutlierPost }) {
  const score = Number(post.outlier_score)
  const caption = post.caption
    ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '…' : '')
    : '(no caption)'

  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const isVideo = post.media_type === 'VIDEO' && !!post.media_url

  const tags = [
    post.hook_type && { label: post.hook_type, color: '#f87171' },
    post.content_type && { label: post.content_type, color: '#6366f1' },
    post.layout && { label: post.layout, color: '#f59e0b' },
  ].filter(Boolean) as { label: string; color: string }[]

  const handleEnter = () => {
    setIsHovering(true)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  const handleLeave = () => {
    setIsHovering(false)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      onMouseEnter={isVideo ? handleEnter : undefined}
      onMouseLeave={isVideo ? handleLeave : undefined}
    >
      <div
        className="relative aspect-[9/16] rounded-xl overflow-hidden"
        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {post.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ opacity: isHovering && isVideo ? 0 : 1 }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(225,48,108,0.15), rgba(131,58,180,0.15))',
            }}
          />
        )}

        {isVideo && (
          <video
            ref={videoRef}
            src={post.media_url ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
            style={{ opacity: isHovering ? 1 : 0, pointerEvents: 'none' }}
          />
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm"
          style={{
            background: 'rgba(251,191,36,0.95)',
            color: '#1f1500',
          }}
        >
          <span className="text-[12px] font-bold tracking-tight">{score.toFixed(1)}x</span>
        </div>

        <div
          className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.85)' }}
        >
          {fmtDate(post.post_timestamp)}
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-white">
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Play className="w-3 h-3 fill-current" />
            {fmt(post.views)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Bookmark className="w-3 h-3 fill-current" />
            {fmt(post.saves)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Share2 className="w-3 h-3" />
            {fmt(post.shares)}
          </span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 px-1 flex flex-wrap gap-1">
          {tags.map(t => (
            <span
              key={t.label}
              className="text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: `${t.color}18`,
                color: t.color,
                border: `1px solid ${t.color}28`,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      <p
        className="mt-1.5 px-1 text-[11px] leading-snug line-clamp-2"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {caption}
      </p>
    </a>
  )
}
