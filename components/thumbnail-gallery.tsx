'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Thumbnail, Video, VideoThumbnail } from '@/lib/types'
import { Tag, CheckCircle } from 'lucide-react'
import { ThumbnailModal } from '@/components/thumbnail-modal'
import { getRatingFromTags, RatingBadge, stripRatingTags } from '@/components/thumbnail-rating'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getThumbnailSrc(thumb: Thumbnail): string {
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return ''
}

interface ThumbnailGalleryProps {
  thumbnails: Thumbnail[]
  videos: Pick<Video, 'id' | 'title'>[]
  assignments: VideoThumbnail[]
  allTags: string[]
}

export function ThumbnailGallery({ thumbnails, videos, assignments, allTags }: ThumbnailGalleryProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [openThumb, setOpenThumb] = useState<Thumbnail | null>(null)
  const [localRatings, setLocalRatings] = useState<Record<string, number | null>>({})
  const router = useRouter()

  const handleRatingChange = (thumbId: string, rating: number | null) => {
    setLocalRatings(prev => ({ ...prev, [thumbId]: rating }))
  }

  const filtered = selectedTag
    ? thumbnails.filter(t => t.tags?.includes(selectedTag))
    : thumbnails

  // Build assignment map: thumbnail_id → assignments
  const assignmentMap = assignments.reduce<Record<string, VideoThumbnail[]>>((acc, a) => {
    if (!acc[a.thumbnail_id]) acc[a.thumbnail_id] = []
    acc[a.thumbnail_id].push(a)
    return acc
  }, {})

  // Videos that already have a chosen thumbnail (from any thumbnail)
  const videosWithChosenThumbnail = new Set(
    assignments.filter(a => a.is_chosen).map(a => a.video_id)
  )

  const openThumbAssignments = openThumb
    ? (assignmentMap[openThumb.id] ?? [])
    : []

  return (
    <div className="space-y-6">
      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="w-3.5 h-3.5 text-gray-600" />
          <button
            onClick={() => setSelectedTag(null)}
            className="text-xs px-3 py-1 rounded-full transition-all"
            style={!selectedTag
              ? { background: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            All ({thumbnails.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className="text-xs px-3 py-1 rounded-full transition-all"
              style={selectedTag === tag
                ? { background: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.06)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>No thumbnails yet</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>Upload thumbnails here to manage and assign them to videos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(thumb => {
            const src = getThumbnailSrc(thumb)
            const videoAssignments = assignmentMap[thumb.id] ?? []
            const chosenAssignment = videoAssignments.find(a => a.is_chosen)
            const rating = thumb.id in localRatings
              ? localRatings[thumb.id]
              : getRatingFromTags(thumb.tags)
            const displayTags = stripRatingTags(thumb.tags)

            return (
              <button
                key={thumb.id}
                onClick={() => setOpenThumb(thumb)}
                className="group text-left rounded-xl overflow-hidden transition-all cursor-pointer"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
              >
                {/* Image */}
                <div className="aspect-video bg-gray-800 relative overflow-hidden">
                  {src ? (
                    <img
                      src={src}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">
                      No image
                    </div>
                  )}
                  {/* Chosen badge */}
                  {chosenAssignment && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-green-400 text-xs px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Chosen
                    </div>
                  )}
                  {/* AI analysis indicator */}
                  {thumb.ai_analysis && (
                    <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                      ✦ AI
                    </div>
                  )}
                  {/* Usage count badge — only if no rating (to avoid overlap) */}
                  {videoAssignments.length > 0 && !rating && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                      ×{videoAssignments.length}
                    </div>
                  )}
                  {/* Rating badge */}
                  <RatingBadge rating={rating} />
                </div>

                {/* Footer */}
                <div className="px-3 py-2.5 space-y-1.5">
                  {/* Tags */}
                  {displayTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {displayTags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                        >
                          {tag}
                        </span>
                      ))}
                      {displayTags.length > 3 && (
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>+{displayTags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Usage history */}
                  {videoAssignments.length > 0 ? (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">Used in</p>
                      {videoAssignments.slice(0, 2).map(va => {
                        const vid = videos.find(v => v.id === va.video_id)
                        return (
                          <p key={va.id} className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                            {va.is_chosen && <CheckCircle className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />}
                            {vid?.title ?? 'Unknown'}
                          </p>
                        )
                      })}
                      {videoAssignments.length > 2 && (
                        <p className="text-[10px] text-gray-600">+{videoAssignments.length - 2} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-700">Never used</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {openThumb && (
        <ThumbnailModal
          thumbnail={openThumb}
          videos={videos}
          assignments={openThumbAssignments}
          videosWithChosenThumbnail={videosWithChosenThumbnail}
          onClose={() => setOpenThumb(null)}
          onRatingChange={(rating) => handleRatingChange(openThumb.id, rating)}
        />
      )}
    </div>
  )
}
