'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Upload, X, Plus, User, Mountain, Star } from 'lucide-react'
import type { Thumbnail } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getThumbSrc(thumb: Thumbnail): string {
  if (thumb.url) return thumb.url
  if (thumb.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${thumb.storage_path}`
  return ''
}

// Keywords to detect human presence in ai_analysis
const HUMAN_KEYWORDS = ['person', 'face', 'man', 'woman', 'people', 'human', 'portrait', 'headshot', 'someone', 'speaker', 'presenter', 'guy', 'girl', 'boy', 'smile', 'expression', 'eye contact']
const NO_HUMAN_KEYWORDS = ['no person', 'no people', 'no human', 'without people', 'text-only', 'abstract', 'graphic', 'illustration only']

const COLOR_FILTERS = [
  { label: 'Red', value: 'red', dot: '#ef4444' },
  { label: 'Blue', value: 'blue', dot: '#3b82f6' },
  { label: 'Green', value: 'green', dot: '#22c55e' },
  { label: 'Yellow', value: 'yellow', dot: '#eab308' },
  { label: 'Purple', value: 'purple', dot: '#a855f7' },
  { label: 'Orange', value: 'orange', dot: '#f97316' },
  { label: 'Black', value: 'black', dot: '#333' },
  { label: 'White', value: 'white', dot: '#e5e5e5' },
]

const STYLE_FILTERS = [
  { label: 'Photo', keywords: ['photo', 'photograph', 'realistic', 'camera'] },
  { label: 'AI Generated', keywords: ['ai-generated', 'dalle', 'generated', 'midjourney'] },
  { label: 'Text Heavy', keywords: ['text', 'typography', 'lettering', 'bold text', 'title'] },
  { label: 'Minimal', keywords: ['minimal', 'clean', 'simple', 'minimalist'] },
]

type SubjectFilter = 'all' | 'human' | 'no-human'

function hasHuman(thumb: Thumbnail): boolean | null {
  const analysis = thumb.ai_analysis?.toLowerCase() ?? ''
  if (!analysis) return null
  if (NO_HUMAN_KEYWORDS.some(k => analysis.includes(k))) return false
  if (HUMAN_KEYWORDS.some(k => analysis.includes(k))) return true
  return null
}

function matchesColor(thumb: Thumbnail, color: string): boolean {
  const analysis = thumb.ai_analysis?.toLowerCase() ?? ''
  const tagStr = thumb.tags?.join(' ').toLowerCase() ?? ''
  return analysis.includes(color) || tagStr.includes(color)
}

function matchesStyle(thumb: Thumbnail, style: typeof STYLE_FILTERS[number]): boolean {
  const analysis = thumb.ai_analysis?.toLowerCase() ?? ''
  const tagStr = thumb.tags?.join(' ').toLowerCase() ?? ''
  return style.keywords.some(k => analysis.includes(k) || tagStr.includes(k))
}

function getRating(thumb: Thumbnail): number | null {
  const ratingTag = thumb.tags?.find(t => t.startsWith('_rating:'))
  if (!ratingTag) return null
  return parseInt(ratingTag.split(':')[1], 10)
}

interface ThumbnailPickerProps {
  onSelect: (thumbnail: Thumbnail) => void
  onClose: () => void
  excludeIds?: string[]
}

export function ThumbnailPicker({ onSelect, onClose, excludeIds = [] }: ThumbnailPickerProps) {
  const supabase = createClient()
  const [thumbs, setThumbs] = useState<Thumbnail[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [subject, setSubject] = useState<SubjectFilter>('all')
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [minRating, setMinRating] = useState<number>(0)

  useEffect(() => {
    supabase
      .from('thumbnails')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setThumbs(data ?? [])
        setLoading(false)
      })
  }, [])

  // Extract unique tags (excluding internal _rating: tags)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    thumbs.forEach(t => {
      t.tags?.forEach(tag => {
        if (!tag.startsWith('_')) tagSet.add(tag)
      })
    })
    return Array.from(tagSet).sort()
  }, [thumbs])

  const hasAnyFilter = subject !== 'all' || selectedColors.size > 0 || selectedStyles.size > 0 || selectedTags.size > 0 || minRating > 0

  const excludeSet = new Set(excludeIds)
  const filtered = thumbs.filter(t => {
    if (excludeSet.has(t.id)) return false

    // Text search
    if (search) {
      const q = search.toLowerCase()
      const matchSearch = t.tags?.some(tag => tag.toLowerCase().includes(q)) || t.ai_analysis?.toLowerCase().includes(q)
      if (!matchSearch) return false
    }

    // Subject filter
    if (subject === 'human') {
      const h = hasHuman(t)
      if (h !== true) return false
    } else if (subject === 'no-human') {
      const h = hasHuman(t)
      if (h === true) return false
    }

    // Color filter (OR — matches any selected color)
    if (selectedColors.size > 0) {
      const matchesAny = Array.from(selectedColors).some(c => matchesColor(t, c))
      if (!matchesAny) return false
    }

    // Style filter (OR — matches any selected style)
    if (selectedStyles.size > 0) {
      const matchesAny = STYLE_FILTERS.filter(s => selectedStyles.has(s.label)).some(s => matchesStyle(t, s))
      if (!matchesAny) return false
    }

    // Tag filter (AND — must have all selected tags)
    if (selectedTags.size > 0) {
      const hasTags = Array.from(selectedTags).every(st => t.tags?.includes(st))
      if (!hasTags) return false
    }

    // Rating filter
    if (minRating > 0) {
      const r = getRating(t)
      if (r === null || r < minRating) return false
    }

    return true
  })

  const toggleSet = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  const clearFilters = () => {
    setSubject('all')
    setSelectedColors(new Set())
    setSelectedStyles(new Set())
    setSelectedTags(new Set())
    setMinRating(0)
    setSearch('')
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
      onSelect(thumb)
    } catch (err) {
      console.error('Thumbnail upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const chipCls = (active: boolean) =>
    `text-[10px] px-2 py-1 rounded-md cursor-pointer transition-all ${
      active
        ? 'text-white font-medium'
        : 'text-white/40 hover:text-white/60'
    }`

  const chipStyle = (active: boolean) => ({
    background: active ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.06)'}`,
  })

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a1a' }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search thumbnails..."
            className="w-full pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/25 outline-none rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* Body: sidebar + grid */}
      <div className="flex" style={{ minHeight: 380 }}>
        {/* Filter sidebar */}
        <div
          className="w-44 flex-shrink-0 p-3 space-y-4 overflow-y-auto border-r"
          style={{ borderColor: 'rgba(255,255,255,0.06)', maxHeight: 460 }}
        >
          {/* Clear all */}
          {hasAnyFilter && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all filters
            </button>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Subject</p>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setSubject('all')} className={chipCls(subject === 'all')} style={chipStyle(subject === 'all')}>All</button>
              <button onClick={() => setSubject('human')} className={chipCls(subject === 'human')} style={chipStyle(subject === 'human')}>
                <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" /> Human</span>
              </button>
              <button onClick={() => setSubject('no-human')} className={chipCls(subject === 'no-human')} style={chipStyle(subject === 'no-human')}>
                <span className="flex items-center gap-1"><Mountain className="w-2.5 h-2.5" /> No Human</span>
              </button>
            </div>
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Style</p>
            <div className="flex flex-wrap gap-1">
              {STYLE_FILTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => toggleSet(selectedStyles, s.label, setSelectedStyles)}
                  className={chipCls(selectedStyles.has(s.label))}
                  style={chipStyle(selectedStyles.has(s.label))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Color</p>
            <div className="flex flex-wrap gap-1">
              {COLOR_FILTERS.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleSet(selectedColors, c.value, setSelectedColors)}
                  className={`flex items-center gap-1 ${chipCls(selectedColors.has(c.value))}`}
                  style={chipStyle(selectedColors.has(c.value))}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot, border: c.value === 'black' ? '1px solid rgba(255,255,255,0.2)' : undefined }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Min Rating</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setMinRating(minRating === n ? 0 : n)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className="w-3.5 h-3.5"
                    style={{
                      color: n <= minRating ? '#eab308' : 'rgba(255,255,255,0.1)',
                      fill: n <= minRating ? '#eab308' : 'transparent',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Tags</p>
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleSet(selectedTags, tag, setSelectedTags)}
                    className={chipCls(selectedTags.has(tag))}
                    style={chipStyle(selectedTags.has(tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail grid */}
        <div className="flex-1 p-3 overflow-y-auto" style={{ maxHeight: 460 }}>
          {loading ? (
            <p className="text-center text-xs text-white/25 py-6">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-xs text-white/25">
                {search || hasAnyFilter ? 'No thumbnails match your filters' : 'No thumbnails available'}
              </p>
              {hasAnyFilter && (
                <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-[10px] text-white/20 mb-2">{filtered.length} thumbnail{filtered.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map(thumb => {
                  const src = getThumbSrc(thumb)
                  return (
                    <button
                      key={thumb.id}
                      onClick={() => onSelect(thumb)}
                      className="group relative rounded-lg overflow-hidden aspect-video text-left"
                      style={{ background: '#2d2c2a' }}
                    >
                      {src ? (
                        <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">No image</div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-white" style={{ background: '#dc2626' }}>
                          <Plus className="w-2.5 h-2.5" /> Select
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
