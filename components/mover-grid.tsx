'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, Play, Bookmark, Share2 } from 'lucide-react'
import { Sparkline } from '@/components/sparkline'
import type { TopMover, HistoryPoint } from '@/lib/services/growthService'

const INITIAL_LIMIT = 4
const ACCENT = '#34d399'

type Mover = TopMover & { history: HistoryPoint[] }

function fmt(n: number | null | undefined): string {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(Math.round(v))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MoverGrid({ movers }: { movers: Mover[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? movers : movers.slice(0, INITIAL_LIMIT)
  const hiddenCount = movers.length - INITIAL_LIMIT
  const canExpand = movers.length > INITIAL_LIMIT

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map(m => (
          <MoverCard key={m.instagram_media_id} mover={m} />
        ))}
      </div>

      {canExpand && (
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background: `${ACCENT}12`,
              border: `1px solid ${ACCENT}40`,
              color: ACCENT,
              boxShadow: `0 0 18px ${ACCENT}20, inset 0 0 8px ${ACCENT}10`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${ACCENT}22`
              e.currentTarget.style.boxShadow = `0 0 26px ${ACCENT}50, inset 0 0 10px ${ACCENT}20`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${ACCENT}12`
              e.currentTarget.style.boxShadow = `0 0 18px ${ACCENT}20, inset 0 0 8px ${ACCENT}10`
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

function MoverCard({ mover }: { mover: Mover }) {
  const caption = mover.caption
    ? mover.caption.slice(0, 80) + (mover.caption.length > 80 ? '…' : '')
    : '(no caption)'

  const sparkData = mover.history.map(h => h.views)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const isVideo = mover.media_type === 'VIDEO' && !!mover.media_url

  const tags = [
    mover.hook_type && { label: mover.hook_type, color: '#f87171' },
    mover.content_type && { label: mover.content_type, color: '#6366f1' },
    mover.layout && { label: mover.layout, color: '#f59e0b' },
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
      href={mover.permalink}
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
        {mover.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mover.thumbnail_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ opacity: isHovering && isVideo ? 0 : 1 }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(99,102,241,0.15))',
            }}
          />
        )}

        {isVideo && (
          <video
            ref={videoRef}
            src={mover.media_url ?? undefined}
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
              'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%)',
          }}
        />

        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm"
          style={{
            background: 'rgba(52,211,153,0.95)',
            color: '#062b1d',
          }}
        >
          <TrendingUp className="w-3 h-3" />
          <span className="text-[12px] font-bold tracking-tight">+{fmt(mover.views_delta)}</span>
        </div>

        <div
          className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.85)' }}
        >
          {fmtDate(mover.post_timestamp)}
        </div>

        {sparkData.length >= 2 && (
          <div
            className="absolute bottom-9 left-2 right-2 pointer-events-none"
            style={{ opacity: 0.8 }}
          >
            <Sparkline
              data={sparkData}
              height={22}
              color={ACCENT}
              strokeWidth={1.5}
              showDot
              fill
            />
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-white">
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Play className="w-3 h-3 fill-current" />
            {fmt(mover.current_views)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Bookmark className="w-3 h-3 fill-current" />
            {fmt(mover.current_saves)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold drop-shadow-md">
            <Share2 className="w-3 h-3" />
            {fmt(mover.current_shares)}
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
