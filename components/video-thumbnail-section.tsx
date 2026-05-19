'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { VideoThumbnail } from '@/lib/types'
import { CheckCircle, Image as ImageIcon, X, History } from 'lucide-react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getThumbSrc(vt: VideoThumbnail): string {
  const t = vt.thumbnail
  if (!t) return ''
  if (t.url) return t.url
  if (t.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${t.storage_path}`
  return ''
}

interface VideoThumbnailSectionProps {
  chosenThumb: VideoThumbnail | null
  otherThumbs: VideoThumbnail[]
  videoId: string
  allAssignments?: { id: string; video_id: string; thumbnail_id: string; is_chosen: boolean }[]
  allVideos?: { id: string; title: string }[]
}

export function VideoThumbnailSection({
  chosenThumb,
  otherThumbs,
  videoId,
  allAssignments = [],
  allVideos = [],
}: VideoThumbnailSectionProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleRemove = async (vtId: string) => {
    setLoading(true)
    try {
      await supabase.from('video_thumbnails').delete().eq('id', vtId)
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const handleSetChosen = async (vtId: string) => {
    setLoading(true)
    try {
      await supabase
        .from('video_thumbnails')
        .update({ is_chosen: false })
        .eq('video_id', videoId)
        .eq('is_chosen', true)
      await supabase
        .from('video_thumbnails')
        .update({ is_chosen: true })
        .eq('id', vtId)
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  // For a given thumbnail_id, get other videos it's used in (excluding current video)
  function getOtherUsages(thumbnailId: string): string[] {
    return allAssignments
      .filter(a => a.thumbnail_id === thumbnailId && a.video_id !== videoId)
      .map(a => allVideos.find(v => v.id === a.video_id)?.title ?? 'Another video')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" /> Thumbnails
        </h2>
        <Link href="/dashboard/youtube" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
          Browse library →
        </Link>
      </div>

      {/* Chosen thumbnail — large */}
      {chosenThumb && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Chosen
            </div>
            <button
              onClick={() => handleRemove(chosenThumb.id)}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-green-500/20 max-w-lg">
            {getThumbSrc(chosenThumb) ? (
              <img src={getThumbSrc(chosenThumb)} alt="Chosen thumbnail" className="w-full object-cover" />
            ) : (
              <div className="aspect-video bg-gray-800 flex items-center justify-center text-gray-600 text-sm">No image</div>
            )}
          </div>

          {/* Tags */}
          {(chosenThumb.thumbnail?.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {chosenThumb.thumbnail?.tags?.map((tag: string) => (
                <span key={tag} className="badge badge-xs badge-ghost text-gray-500">{tag}</span>
              ))}
            </div>
          )}

          {/* Usage history for chosen thumb */}
          {(() => {
            const others = getOtherUsages(chosenThumb.thumbnail_id)
            if (others.length === 0) return null
            return (
              <div className="flex items-start gap-1.5 text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                <History className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Also used in:{' '}
                  {others.slice(0, 2).join(', ')}
                  {others.length > 2 ? ` +${others.length - 2} more` : ''}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* Other thumbnails */}
      {otherThumbs.length > 0 && (
        <div className="space-y-2">
          {chosenThumb && <p className="text-xs text-gray-600 uppercase tracking-wide">Other options</p>}
          <div className="flex gap-3 flex-wrap">
            {otherThumbs.map(vt => {
              const src = getThumbSrc(vt)
              const otherUsages = getOtherUsages(vt.thumbnail_id)
              return (
                <div key={vt.id} className="group relative flex flex-col gap-1">
                  <div className="w-36 rounded-lg overflow-hidden border border-white/8 aspect-video bg-gray-800">
                    {src ? (
                      <img src={src} alt="Alt thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                    )}
                    {/* Set chosen overlay */}
                    <button
                      onClick={() => handleSetChosen(vt.id)}
                      disabled={loading}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-medium text-center px-2"
                    >
                      Set as chosen
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(vt.id)}
                      disabled={loading}
                      className="absolute top-1 right-1 bg-black/70 text-gray-400 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Usage note */}
                  {otherUsages.length > 0 && (
                    <p className="text-[10px] text-amber-500/70 flex items-center gap-1 w-36">
                      <History className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">Used in {otherUsages.length} other{otherUsages.length !== 1 ? 's' : ''}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
