'use client'

import { useState } from 'react'

export const RATING_EMOJIS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '💀', label: 'Yikes' },
  2: { emoji: '😬', label: 'Mid' },
  3: { emoji: '👀', label: "It's something" },
  4: { emoji: '🔥', label: "We're cooking" },
  5: { emoji: '🤌', label: "Chef's kiss" },
}

const RATING_TAG_PREFIX = '_rating:'

/** Extract numeric rating (1-5) from a tags array, or null if unrated. */
export function getRatingFromTags(tags: string[] | null | undefined): number | null {
  const ratingTag = (tags ?? []).find(t => t.startsWith(RATING_TAG_PREFIX))
  if (!ratingTag) return null
  const n = parseInt(ratingTag.replace(RATING_TAG_PREFIX, ''), 10)
  return isNaN(n) ? null : n
}

/** Filter out rating tags from a tags array for display purposes. */
export function stripRatingTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter(t => !t.startsWith(RATING_TAG_PREFIX))
}

interface ThumbnailRatingProps {
  thumbnailId: string
  currentRating: number | null
  /** Called after successful rating update with the new rating (or null) */
  onRatingChange?: (rating: number | null) => void
  size?: 'sm' | 'lg'
}

export function ThumbnailRating({
  thumbnailId,
  currentRating,
  onRatingChange,
  size = 'lg',
}: ThumbnailRatingProps) {
  const [rating, setRating] = useState<number | null>(currentRating)
  const [hover, setHover] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleRate = async (value: number) => {
    if (saving) return
    // Toggle off if clicking the current rating
    const newRating = rating === value ? null : value
    setSaving(true)
    try {
      const res = await fetch(`/api/thumbnails/${thumbnailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      })
      if (res.ok) {
        setRating(newRating)
        onRatingChange?.(newRating)
      }
    } finally {
      setSaving(false)
    }
  }

  const activeRating = hover ?? rating
  const emojiSize = size === 'sm' ? 'text-lg' : 'text-2xl'
  const labelClass = size === 'sm' ? 'text-[9px]' : 'text-[11px]'

  return (
    <div className="flex flex-col gap-1.5">
      {size === 'lg' && (
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Vibe Check
        </p>
      )}
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as const).map(value => {
          const { emoji, label } = RATING_EMOJIS[value]
          const isActive = activeRating !== null && value <= activeRating
          const isSelected = rating === value

          return (
            <button
              key={value}
              onClick={() => handleRate(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(null)}
              disabled={saving}
              title={label}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all disabled:cursor-wait"
              style={{
                background: isSelected
                  ? 'rgba(255,255,255,0.08)'
                  : hover === value
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
                opacity: saving ? 0.5 : isActive ? 1 : 0.35,
                transform: hover === value ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              <span className={`${emojiSize} leading-none`}>
                {emoji}
              </span>
              {size === 'lg' && hover === value && (
                <span className={`${labelClass} text-white/50 whitespace-nowrap`}>
                  {label}
                </span>
              )}
            </button>
          )
        })}

        {/* Clear rating */}
        {rating !== null && size === 'lg' && (
          <button
            onClick={() => handleRate(rating)}
            className="ml-1 text-[10px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
            title="Clear rating"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

/** Compact badge shown on gallery cards */
export function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return null
  const { emoji } = RATING_EMOJIS[rating] ?? {}
  if (!emoji) return null

  return (
    <div
      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-base leading-none backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      title={`Rated ${rating}/5`}
    >
      {emoji}
    </div>
  )
}
