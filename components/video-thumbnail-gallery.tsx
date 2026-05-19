'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, CheckCircle, Plus, X, History, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import type { Thumbnail, VideoThumbnail } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getThumbSrc(thumb: Thumbnail): string {
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return ''
}

interface VideoThumbnailGalleryProps {
  videoId: string
  initialAssigned: (VideoThumbnail & { thumbnail: Thumbnail })[]
}

export function VideoThumbnailGallery({ videoId, initialAssigned }: VideoThumbnailGalleryProps) {
  const router = useRouter()
  const supabase = createClient()

  const [assigned, setAssigned] = useState<(VideoThumbnail & { thumbnail: Thumbnail })[]>(initialAssigned)
  const [allThumbs, setAllThumbs] = useState<Thumbnail[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch all thumbnails when gallery opens
  useEffect(() => {
    if (!galleryOpen || allThumbs.length > 0) return
    supabase
      .from('thumbnails')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setAllThumbs(data ?? []))
  }, [galleryOpen])

  const assignedIds = new Set(assigned.map(a => a.thumbnail_id))
  const chosen = assigned.find(a => a.is_chosen) ?? null
  const others = assigned.filter(a => !a.is_chosen)

  const filteredGallery = allThumbs.filter(t => {
    const q = search.toLowerCase()
    if (!q) return !assignedIds.has(t.id)
    return !assignedIds.has(t.id) && (
      t.tags?.some(tag => tag.toLowerCase().includes(q)) ||
      t.ai_analysis?.toLowerCase().includes(q)
    )
  })

  const handleSetChosen = async (vtId: string) => {
    setLoading(true)
    // Unset current chosen
    await supabase.from('video_thumbnails').update({ is_chosen: false }).eq('video_id', videoId).eq('is_chosen', true)
    // Set new chosen
    await supabase.from('video_thumbnails').update({ is_chosen: true }).eq('id', vtId)
    setLoading(false)
    router.refresh()
    // Update local state
    setAssigned(prev => prev.map(a => ({ ...a, is_chosen: a.id === vtId })))
  }

  const handleRemove = async (vtId: string) => {
    await supabase.from('video_thumbnails').delete().eq('id', vtId)
    setAssigned(prev => prev.filter(a => a.id !== vtId))
  }

  const handleAssign = async (thumbId: string) => {
    setAssigning(thumbId)
    const isFirst = assigned.length === 0
    const { data } = await supabase
      .from('video_thumbnails')
      .insert({ video_id: videoId, thumbnail_id: thumbId, is_chosen: isFirst })
      .select('*, thumbnail:thumbnails(*)')
      .single()
    if (data) {
      setAssigned(prev => [...prev, data as VideoThumbnail & { thumbnail: Thumbnail }])
    }
    setAssigning(null)
    if (isFirst) router.refresh()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tags', 'uploaded')
      const res = await fetch('/api/thumbnails/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const thumb = await res.json()
      // Add to gallery list so it shows up
      setAllThumbs(prev => [thumb, ...prev])
      // Auto-assign to this video
      await handleAssign(thumb.id)
    } catch (err) {
      console.error('Thumbnail upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Thumbnails</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={() => setGalleryOpen(g => !g)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {galleryOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Close gallery</> : <><Search className="w-3.5 h-3.5" /> Browse library</>}
          </button>
        </div>
      </div>

      {/* Chosen thumbnail — hero */}
      {chosen ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <img
              src={getThumbSrc(chosen.thumbnail)}
              alt="Chosen thumbnail"
              className="w-full object-cover"
              style={{ maxHeight: '360px', objectFit: 'cover' }}
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)', color: '#34d399' }}>
              <CheckCircle className="w-3 h-3" /> Chosen
            </div>
            <button
              onClick={() => handleRemove(chosen.id)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-red-500/80 transition-colors"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
          {/* Tags */}
          {chosen.thumbnail?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chosen.thumbnail.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md text-white/30" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="aspect-video rounded-xl flex flex-col items-center justify-center gap-3"
          style={{ border: '1px dashed rgba(255,255,255,0.08)', background: '#1c1b1a' }}
        >
          <Plus className="w-6 h-6 text-white/15" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload image'}
            </button>
            <span className="text-white/15 text-xs">or</span>
            <button
              onClick={() => setGalleryOpen(true)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> Browse library
            </button>
          </div>
        </div>
      )}

      {/* Other assigned thumbnails */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">Alternatives</p>
          <div className="flex gap-2 flex-wrap">
            {others.map(vt => (
              <div key={vt.id} className="group relative w-32 rounded-lg overflow-hidden aspect-video" style={{ background: '#1c1b1a' }}>
                <img src={getThumbSrc(vt.thumbnail)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => handleSetChosen(vt.id)}
                    disabled={loading}
                    className="text-[10px] px-2 py-1 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    Set chosen
                  </button>
                  <button onClick={() => handleRemove(vt.id)} className="w-6 h-6 rounded bg-red-500/60 flex items-center justify-center hover:bg-red-500 transition-colors">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Searchable gallery */}
      {galleryOpen && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#262624' }}>
          <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by tags, style..."
                className="w-full pl-9 pr-3 py-2 text-sm text-white placeholder-white/25 outline-none rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          <div className="p-3">
            {allThumbs.length === 0 ? (
              <p className="text-center text-xs text-white/25 py-6">Loading thumbnails...</p>
            ) : filteredGallery.length === 0 ? (
              <p className="text-center text-xs text-white/25 py-6">
                {search ? `No results for "${search}"` : 'All thumbnails already assigned'}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredGallery.map(thumb => {
                  const src = getThumbSrc(thumb)
                  const isAssigning = assigning === thumb.id
                  return (
                    <div key={thumb.id} className="group relative rounded-lg overflow-hidden aspect-video" style={{ background: '#2d2c2a' }}>
                      {src ? (
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">No image</div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleAssign(thumb.id)}
                          disabled={!!assigning}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                          style={{ background: '#dc2626' }}
                        >
                          {isAssigning ? 'Adding...' : <><Plus className="w-3 h-3" /> Assign</>}
                        </button>
                      </div>
                      {/* Tags overlay */}
                      {thumb.tags?.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5">
                          <div className="flex flex-wrap gap-0.5">
                            {thumb.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[9px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
