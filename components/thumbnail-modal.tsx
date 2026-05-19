'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Thumbnail, Video, VideoThumbnail } from '@/lib/types'
import { X, Tag, Sparkles, Link, Trash2, CheckCircle, Clock, Wand2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { ThumbnailRating, getRatingFromTags, RATING_EMOJIS, stripRatingTags } from '@/components/thumbnail-rating'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getThumbnailSrc(thumb: Thumbnail): string {
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return ''
}

interface ThumbnailModalProps {
  thumbnail: Thumbnail
  videos: Pick<Video, 'id' | 'title'>[]
  assignments: VideoThumbnail[]
  videosWithChosenThumbnail?: Set<string>
  onClose: () => void
  onRatingChange?: (rating: number | null) => void
}

export function ThumbnailModal({ thumbnail, videos, assignments, videosWithChosenThumbnail, onClose, onRatingChange }: ThumbnailModalProps) {
  const [pendingVideo, setPendingVideo] = useState<string | null>(null)
  const [videoSearch, setVideoSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(thumbnail.ai_analysis)
  // Generate state
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedThumb, setGeneratedThumb] = useState<(Thumbnail & { _publicUrl?: string }) | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const src = getThumbnailSrc(thumbnail)
  // Videos that don't already have a chosen thumbnail (from any thumbnail)
  const assignableVideos = videos.filter(v => !videosWithChosenThumbnail?.has(v.id))

  // Tag-based suggestions: score videos by keyword overlap with thumbnail tags
  const thumbTags = (thumbnail.tags ?? [])
    .filter((t: string) => !t.startsWith('_'))
    .map((t: string) => t.toLowerCase().replace(/-/g, ' '))

  const suggestedVideos = thumbTags.length > 0
    ? assignableVideos
        .filter(v => !assignments.some(a => a.video_id === v.id))
        .map(v => {
          const title = v.title.toLowerCase()
          const score = thumbTags.reduce((s: number, tag: string) => {
            tag.split(' ').forEach((word: string) => { if (word.length >= 4 && title.includes(word)) s++ })
            return s
          }, 0)
          return { ...v, score }
        })
        .filter(v => v.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : []

  const filteredVideos = assignableVideos.filter(v =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase())
  )

  const handleAssign = async (videoId: string, chosen: boolean) => {
    setLoading(true)
    try {
      if (chosen) {
        await supabase
          .from('video_thumbnails')
          .update({ is_chosen: false })
          .eq('video_id', videoId)
          .eq('is_chosen', true)
      }
      const existing = assignments.find(a => a.thumbnail_id === thumbnail.id && a.video_id === videoId)
      if (existing) {
        await supabase.from('video_thumbnails').update({ is_chosen: chosen }).eq('id', existing.id)
      } else {
        await supabase.from('video_thumbnails').insert({ video_id: videoId, thumbnail_id: thumbnail.id, is_chosen: chosen })
      }
      setPendingVideo(null)
      setVideoSearch('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async (videoId: string) => {
    setLoading(true)
    try {
      await supabase.from('video_thumbnails').delete().eq('thumbnail_id', thumbnail.id).eq('video_id', videoId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await supabase.from('video_thumbnails').delete().eq('thumbnail_id', thumbnail.id)
      if (thumbnail.storage_path) {
        await supabase.storage.from('thumbnails').remove([thumbnail.storage_path])
      }
      await supabase.from('thumbnails').delete().eq('id', thumbnail.id)
      onClose()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAnalysis = async () => {
    setAnalyzingAI(true)
    try {
      const res = await fetch('/api/thumbnails/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnailId: thumbnail.id, src }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiResult(data.analysis)
      }
    } finally {
      setAnalyzingAI(false)
    }
  }

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return
    setGenerating(true)
    setGenerateError(null)
    setGeneratedThumb(null)
    try {
      const res = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt,
          tags: thumbnail.tags?.length ? thumbnail.tags : ['ai-generated'],
          sourceThumbId: thumbnail.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenerateError(data.error ?? 'Generation failed')
      } else {
        setGeneratedThumb(data.thumbnail)
        router.refresh()
      }
    } catch (err: any) {
      setGenerateError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col lg:flex-row shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Left — Image */}
        <div className="lg:w-[55%] bg-black flex items-center justify-center flex-shrink-0 min-h-[240px]">
          {src ? (
            <img src={src} alt="Thumbnail" className="w-full h-full object-contain max-h-[60vh]" />
          ) : (
            <div className="text-gray-700 text-sm">No image</div>
          )}
        </div>

        {/* Right — Info panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
            <p className="text-xs text-gray-500 font-mono">
              {new Date(thumbnail.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Vibe Check — Rating */}
            <div
              className="rounded-xl p-3"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ThumbnailRating
                thumbnailId={thumbnail.id}
                currentRating={getRatingFromTags(thumbnail.tags)}
                onRatingChange={onRatingChange}
                size="lg"
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Tags</span>
              </div>
              {stripRatingTags(thumbnail.tags).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {stripRatingTags(thumbnail.tags).map(tag => (
                    <span key={tag} className="badge badge-sm badge-ghost text-gray-400 border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-700 italic">No tags</p>
              )}
            </div>

            {/* AI Analysis */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">AI Analysis</span>
                </div>
                {!aiResult && !analyzingAI && (
                  <button
                    onClick={handleRequestAnalysis}
                    className="btn btn-xs btn-ghost text-gray-500 hover:text-white border border-white/10 gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Analyze
                  </button>
                )}
              </div>
              {analyzingAI ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <span className="loading loading-spinner loading-xs" /> Analyzing thumbnail...
                </div>
              ) : aiResult ? (
                <div className="bg-gray-800/60 rounded-lg p-3 border border-white/5">
                  <p className="text-sm text-gray-300 leading-relaxed">{aiResult}</p>
                  {thumbnail.ai_analysis_at && (
                    <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Analyzed {new Date(thumbnail.ai_analysis_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-700 italic">No analysis yet — click Analyze to generate one.</p>
              )}
            </div>

            {/* Generate Variant */}
            <div>
              <button
                onClick={() => {
                  setGenerateOpen(g => !g)
                  if (!generatePrompt && aiResult) {
                    setGeneratePrompt(aiResult.slice(0, 200))
                  }
                }}
                className="flex items-center justify-between w-full group"
              >
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-violet-400 transition-colors" />
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold group-hover:text-violet-400 transition-colors">
                    Generate Variant
                  </span>
                </div>
                {generateOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                }
              </button>

              {generateOpen && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={generatePrompt}
                    onChange={e => setGeneratePrompt(e.target.value)}
                    placeholder="Describe the thumbnail you want to generate... e.g. 'man looking shocked at a laptop screen, bold text overlay saying AI TOOK MY JOB, dark moody lighting'"
                    rows={3}
                    className="w-full bg-gray-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-gray-600 outline-none focus:border-violet-500/40 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={generating || !generatePrompt.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40"
                      style={{ background: generating ? '#6d28d9' : '#7c3aed' }}
                    >
                      {generating ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Generating... (~15s)
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          Generate with DALL-E 3
                        </>
                      )}
                    </button>
                    {aiResult && !generatePrompt && (
                      <button
                        onClick={() => setGeneratePrompt(aiResult.slice(0, 300))}
                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                      >
                        Use AI analysis as prompt
                      </button>
                    )}
                  </div>

                  {generateError && (
                    <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{generateError}</p>
                  )}

                  {generatedThumb && (
                    <div className="rounded-lg overflow-hidden border border-violet-500/20 space-y-1.5">
                      <img
                        src={generatedThumb._publicUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${generatedThumb.storage_path}`}
                        alt="Generated thumbnail"
                        className="w-full object-cover"
                      />
                      <div className="px-2 pb-2 flex items-center justify-between">
                        <p className="text-xs text-violet-400">✨ Generated — saved to library</p>
                        <a
                          href="/dashboard/youtube"
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> View in gallery
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assigned Videos */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Link className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Assigned to</span>
              </div>
              {assignments.length > 0 ? (
                <div className="space-y-1.5">
                  {assignments.map(va => {
                    const vid = videos.find(v => v.id === va.video_id)
                    return (
                      <div key={va.id} className="flex items-center justify-between gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {va.is_chosen && <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                          <span className="text-sm text-gray-300 truncate">{vid?.title ?? 'Unknown video'}</span>
                          {va.is_chosen && <span className="badge badge-xs badge-success badge-soft flex-shrink-0">chosen</span>}
                        </div>
                        <button
                          onClick={() => handleUnassign(va.video_id)}
                          disabled={loading}
                          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-700 italic">Not assigned to any video</p>
              )}
            </div>

            {/* Assign to video */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Assign to video</span>
              </div>
              <input
                type="text"
                placeholder="Search videos..."
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
                className="input input-sm w-full bg-gray-800 border-white/10 text-white placeholder-gray-600 text-sm rounded-lg mb-2 focus:border-red-500/40 focus:outline-none"
              />
              <div className="overflow-y-auto rounded-lg border border-white/5 p-1" style={{ maxHeight: '192px', background: 'rgba(255,255,255,0.03)' }}>
                {/* Suggested videos (no search active) */}
                {!videoSearch && suggestedVideos.length > 0 && (
                  <>
                    <p className="text-[9px] font-semibold uppercase tracking-widest px-2 py-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      ✦ Suggested
                    </p>
                    {suggestedVideos.map(vid => {
                      const isAssigned = assignments.some(a => a.video_id === vid.id)
                      return (
                        <button
                          key={`sug-${vid.id}`}
                          onClick={() => setPendingVideo(pendingVideo === vid.id ? null : vid.id)}
                          className="w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2"
                          style={{
                            background: pendingVideo === vid.id ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.06)',
                            color: pendingVideo === vid.id ? '#f87171' : 'rgba(255,255,255,0.7)',
                            borderLeft: '2px solid rgba(220,38,38,0.35)',
                            marginBottom: '1px',
                          }}
                        >
                          <span className="truncate">{vid.title}</span>
                          {isAssigned && <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>assigned</span>}
                        </button>
                      )
                    })}
                    <div className="my-1 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  </>
                )}

                {/* All assignable videos */}
                {filteredVideos.length === 0 && suggestedVideos.length === 0 ? (
                  <p className="text-xs px-2 py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {videoSearch ? 'No videos match' : 'All videos already have thumbnails'}
                  </p>
                ) : filteredVideos.map(vid => {
                  const isAssigned = assignments.some(a => a.video_id === vid.id)
                  const isSuggested = suggestedVideos.some(s => s.id === vid.id)
                  if (!videoSearch && isSuggested) return null // already shown above
                  return (
                    <button
                      key={vid.id}
                      onClick={() => setPendingVideo(pendingVideo === vid.id ? null : vid.id)}
                      className="w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2"
                      style={{
                        background: pendingVideo === vid.id ? 'rgba(220,38,38,0.15)' : 'transparent',
                        color: pendingVideo === vid.id ? '#f87171' : isAssigned ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
                      }}
                      onMouseEnter={e => { if (pendingVideo !== vid.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (pendingVideo !== vid.id) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="truncate">{vid.title}</span>
                      {isAssigned && <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>assigned</span>}
                    </button>
                  )
                })}
              </div>
              {pendingVideo && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAssign(pendingVideo, true)}
                    disabled={loading}
                    className="btn btn-sm flex-1 bg-green-600 hover:bg-green-700 border-0 text-white gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Set as chosen
                  </button>
                  <button
                    onClick={() => handleAssign(pendingVideo, false)}
                    disabled={loading}
                    className="btn btn-sm flex-1 btn-ghost border border-white/10 text-gray-300 gap-1.5"
                  >
                    Assign only
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer — Delete */}
          <div className="px-5 py-3 border-t border-white/5 flex-shrink-0">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-xs btn-ghost text-gray-600 hover:text-red-400 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete thumbnail
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn btn-xs bg-red-600 hover:bg-red-700 border-0 text-white"
                >
                  {loading ? <span className="loading loading-spinner loading-xs" /> : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="btn btn-xs btn-ghost text-gray-500">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
