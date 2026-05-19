'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import YouTubeFeedPreview from '@/components/youtube-feed-preview'
import type { Asset } from '@/lib/types'

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

export function YouTubeFeedPreviewButton({ videos }: { videos: Video[] }) {
  const [show, setShow] = useState(false)

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
      >
        <Eye className="w-3.5 h-3.5" />
        Preview Feed
      </button>
      {show && <YouTubeFeedPreview videos={videos} onClose={() => setShow(false)} />}
    </>
  )
}
