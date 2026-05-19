'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, CalendarDays } from 'lucide-react'
import { YouTubeFeedPreviewButton } from '@/components/youtube-feed-preview-button'
import PlatformCalendar from '@/components/platform-calendar'
import type { SocialPost, Asset } from '@/lib/types'

interface Video {
  id: string
  title: string
  status: string
  platform: string
  created_at: string
  scheduled_at?: string | null
  published_at?: string | null
  target_date?: string | null
  youtube_url: string | null
  assets: Asset[]
  video_thumbnails: { thumbnail: { url?: string | null; storage_path?: string | null } | null; is_chosen: boolean }[]
}

function videosToCalendarPosts(videos: Video[]): SocialPost[] {
  return videos.map(v => ({
    id: v.id,
    title: v.title,
    platform: 'instagram' as const,
    type: 'reel' as const,
    format: null,
    caption: null,
    hashtags: [],
    status: (v.status === 'in_progress' ? 'in_progress' : v.status === 'ready_to_create' ? 'ready_to_create' : v.status === 'ready' ? 'ready' : v.status === 'published' ? 'published' : 'draft') as SocialPost['status'],
    scheduled_at: v.scheduled_at ?? null,
    published_at: v.published_at ?? null,
    target_date: v.target_date ?? null,
    body: null,
    has_lead_magnet: false,
    lead_magnet_url: null,
    notes: null,
    script: null,
    sound_song: null,
    text_overlay: null,
    sort_order: 0,
    metricool_post_id: null,
    metricool_scheduled_at: null,
    created_at: v.created_at,
    updated_at: '',
  }))
}

export function YouTubeHeaderActions({ videos }: { videos: Video[] }) {
  const [showCalendar, setShowCalendar] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <svg className="w-5 h-5" style={{ color: '#dc2626' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">YouTube</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {videos.length} video{videos.length !== 1 ? 's' : ''}
              {(() => {
                const ip = videos.filter(v => v.status === 'in_progress').length
                const rtc = videos.filter(v => v.status === 'ready_to_create').length
                const ed = videos.filter(v => v.status === 'editing').length
                const r = videos.filter(v => v.status === 'ready').length
                const p = videos.filter(v => v.status === 'published').length
                return (
                  <>
                    {ip > 0 && <span> · <span style={{ color: '#f59e0b' }}>{ip} in progress</span></span>}
                    {rtc > 0 && <span> · <span style={{ color: '#f472b6' }}>{rtc} ready to create</span></span>}
                    {ed > 0 && <span> · <span style={{ color: '#c084fc' }}>{ed} editing</span></span>}
                    {r > 0 && <span> · <span style={{ color: '#38bdf8' }}>{r} ready</span></span>}
                    {p > 0 && <span> · <span style={{ color: '#22c55e' }}>{p} published</span></span>}
                  </>
                )
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendar(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: showCalendar ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.05)',
              color: showCalendar ? '#dc2626' : 'rgba(255,255,255,0.45)',
              border: showCalendar ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar
          </button>
          <YouTubeFeedPreviewButton videos={videos} />
          <Link
            href="/dashboard/videos/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ background: '#dc2626' }}
          >
            <Plus className="w-4 h-4" />
            New Video
          </Link>
        </div>
      </div>

      {showCalendar && (
        <div className="mb-4">
          <PlatformCalendar platform="youtube" posts={videosToCalendarPosts(videos)} linkPrefix="/dashboard/videos" />
        </div>
      )}
    </>
  )
}
