'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckCircle, Upload, Search, ImageIcon, Download } from 'lucide-react'
import { ThumbnailPicker } from '@/components/thumbnail-picker'
import type { VideoABVariant, ABVariantLabel, Thumbnail } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const VARIANT_COLORS: Record<ABVariantLabel, { bg: string; text: string; border: string }> = {
  A: { bg: 'rgba(220,38,38,0.15)', text: '#f87171', border: 'rgba(220,38,38,0.3)' },
  B: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  C: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
}

function getThumbSrc(thumb: Thumbnail | undefined | null): string {
  if (!thumb) return ''
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return ''
}

interface ABVariantSectionProps {
  videoId: string
  initialVariants: VideoABVariant[]
  videoTitle?: string
  chosenThumbnailId?: string | null
}

export function ABVariantSection({ videoId, initialVariants, videoTitle, chosenThumbnailId }: ABVariantSectionProps) {
  const router = useRouter()
  const [variants, setVariants] = useState<VideoABVariant[]>(initialVariants)
  const [loading, setLoading] = useState<string | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [seeded, setSeeded] = useState(initialVariants.length > 0)

  const usedVariants = new Set(variants.map(v => v.variant))
  const nextVariant = (['A', 'B', 'C'] as ABVariantLabel[]).find(v => !usedVariants.has(v))

  // Auto-seed Variant A from existing video title + chosen thumbnail
  useEffect(() => {
    if (seeded || variants.length > 0) return
    if (!videoTitle && !chosenThumbnailId) return
    createVariant(videoTitle || '', chosenThumbnailId)
  }, [])

  const createVariant = async (seedTitle?: string, seedThumbnailId?: string | null) => {
    if (!nextVariant) return
    setLoading('create')
    try {
      const title = seedTitle ?? ''
      const res = await fetch(`/api/videos/${videoId}/ab-variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: nextVariant, title, thumbnail_id: seedThumbnailId ?? null }),
      })
      const data = await res.json()
      if (data.id) {
        setVariants(prev => [...prev, data])
        if (!seedTitle) {
          setEditingTitle(data.id)
          setTitleDraft('')
        }
      }
    } finally {
      setLoading(null)
      setSeeded(true)
    }
  }

  const updateVariant = async (variantId: string, updates: Record<string, unknown>) => {
    setLoading(variantId)
    try {
      const res = await fetch(`/api/videos/${videoId}/ab-variants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, ...updates }),
      })
      const data = await res.json()
      if (data.id) {
        setVariants(prev => prev.map(v => v.id === data.id ? data : (updates.is_active ? { ...v, is_active: false } : v)))
      }
    } finally {
      setLoading(null)
    }
  }

  const deleteVariant = async (variantId: string) => {
    setLoading(variantId)
    try {
      await fetch(`/api/videos/${videoId}/ab-variants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      })
      setVariants(prev => prev.filter(v => v.id !== variantId))
    } finally {
      setLoading(null)
    }
  }

  const handleThumbnailSelect = async (variantId: string, thumb: Thumbnail) => {
    setPickerFor(null)
    await updateVariant(variantId, { thumbnail_id: thumb.id })
  }

  const handleTitleSave = async (variantId: string) => {
    setEditingTitle(null)
    await updateVariant(variantId, { title: titleDraft })
  }

  const handleDirectUpload = async (variantId: string, file: File) => {
    setLoading(variantId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tags', 'uploaded')
      const res = await fetch('/api/thumbnails/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const thumb = await res.json()
      await updateVariant(variantId, { thumbnail_id: thumb.id })
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">A/B Test Variants</h2>
        <p className="text-[10px] text-white/20 font-mono">{variants.length}/3</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Variant cards */}
        {variants.map(v => {
          const colors = VARIANT_COLORS[v.variant]
          const thumbSrc = getThumbSrc(v.thumbnail)
          const isEditing = editingTitle === v.id
          const isLoading = loading === v.id

          return (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden transition-all relative"
              style={{
                background: '#2d2c2a',
                border: v.is_active
                  ? '1px solid rgba(16,185,129,0.3)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Hidden file input for direct upload */}
              <input
                ref={el => { fileInputRefs.current[v.id] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleDirectUpload(v.id, file)
                  e.target.value = ''
                }}
              />

              {/* Thumbnail area */}
              <div className="relative group" style={{ aspectRatio: '16/9' }}>
                {thumbSrc ? (
                  <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2"
                    style={{ background: '#1c1b1a' }}
                  >
                    <ImageIcon className="w-6 h-6 text-white/10" />
                    <span className="text-[10px] text-white/15">No thumbnail</span>
                  </div>
                )}

                {/* Variant label */}
                <div className="absolute top-2 left-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                  >
                    {v.variant}
                  </span>
                </div>

                {/* Active badge */}
                {v.is_active && (
                  <div className="absolute top-2 right-2">
                    <span
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
                    >
                      <CheckCircle className="w-2.5 h-2.5" /> Active
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRefs.current[v.id]?.click()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:bg-white/20"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  <button
                    onClick={() => setPickerFor(pickerFor === v.id ? null : v.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:bg-white/20"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <Search className="w-3 h-3" /> Browse
                  </button>
                  {thumbSrc && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          const res = await fetch(thumbSrc)
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `thumbnail-${v.variant}.${blob.type.split('/')[1] || 'png'}`
                          a.click()
                          URL.revokeObjectURL(url)
                        } catch {
                          window.open(thumbSrc, '_blank')
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  )}
                </div>

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Thumbnail picker modal is rendered at the bottom of the component */}

              {/* Title + actions */}
              <div className="p-3 space-y-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={() => handleTitleSave(v.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(v.id) }}
                    autoFocus
                    placeholder="Enter title variant..."
                    className="w-full px-2 py-1 text-sm text-white rounded-md outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                ) : (
                  <button
                    onClick={() => { setEditingTitle(v.id); setTitleDraft(v.title) }}
                    className="w-full text-left text-sm leading-snug transition-colors hover:text-white/90 min-h-[2.5rem]"
                    style={{ color: v.title ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {v.title || 'Click to add title...'}
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {!v.is_active && (
                    <button
                      onClick={() => updateVariant(v.id, { is_active: true })}
                      disabled={!!loading}
                      className="text-[10px] px-2 py-0.5 rounded-md transition-all hover:opacity-80"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      Set active
                    </button>
                  )}
                  <button
                    onClick={() => deleteVariant(v.id)}
                    disabled={!!loading}
                    className="ml-auto p-1 rounded-md transition-all hover:bg-red-500/20"
                  >
                    <X className="w-3 h-3 text-white/20 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add variant card */}
        {nextVariant && (
          <button
            onClick={() => createVariant()}
            disabled={loading === 'create'}
            className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-white/15"
            style={{
              border: '1px dashed rgba(255,255,255,0.08)',
              background: '#1c1b1a',
              minHeight: variants.length === 0 ? 200 : undefined,
              aspectRatio: variants.length === 0 ? undefined : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Plus className="w-5 h-5 text-white/20" />
            </div>
            <span className="text-xs text-white/25 font-medium">
              {loading === 'create' ? 'Creating...' : `Add Variant ${nextVariant}`}
            </span>
          </button>
        )}
      </div>

      {/* Thumbnail picker modal */}
      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPickerFor(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-4xl mx-4 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <ThumbnailPicker
              onSelect={(thumb) => handleThumbnailSelect(pickerFor, thumb)}
              onClose={() => setPickerFor(null)}
              excludeIds={variants.filter(vv => vv.thumbnail_id).map(vv => vv.thumbnail_id!)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
