'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupportingMedia, SupportingMediaType } from '@/lib/types'
import { Upload, Image as ImageIcon, FileText, Film, File, Trash2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = 'supporting-media'

function getFileType(mime: string): SupportingMediaType {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf') return 'pdf'
  return 'other'
}

function TypeIcon({ type }: { type: SupportingMediaType }) {
  if (type === 'image') return <ImageIcon className="w-3 h-3" />
  if (type === 'video') return <Film className="w-3 h-3" />
  if (type === 'pdf') return <FileText className="w-3 h-3" />
  return <File className="w-3 h-3" />
}

interface SupportingMediaSectionProps {
  videoId: string
  initialMedia: SupportingMedia[]
}

export function SupportingMediaSection({ videoId, initialMedia }: SupportingMediaSectionProps) {
  const [media, setMedia] = useState<SupportingMedia[]>(initialMedia)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const uploadFile = async (file: File) => {
    const path = `${videoId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const fileType = getFileType(file.type)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (upErr) return
    const { data, error } = await supabase
      .from('supporting_media')
      .insert({ video_id: videoId, storage_path: path, filename: file.name, file_type: fileType })
      .select()
      .single()
    if (!error && data) setMedia(prev => [data, ...prev])
  }

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true)
    setOpen(true)
    try { for (const f of Array.from(files)) await uploadFile(f) }
    finally { setUploading(false) }
  }

  const handleDelete = async (item: SupportingMedia) => {
    if (item.storage_path) await supabase.storage.from(BUCKET).remove([item.storage_path])
    await supabase.from('supporting_media').delete().eq('id', item.id)
    setMedia(prev => prev.filter(m => m.id !== item.id))
  }

  const getUrl = (item: SupportingMedia) => {
    if (item.url) return item.url
    if (item.storage_path) return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${item.storage_path}`
    return ''
  }

  return (
    <div>
      <input ref={fileRef} type="file" multiple className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />

      {/* Collapsed header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs transition-colors group"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {open
            ? <ChevronDown className="w-3 h-3 group-hover:text-white/50 transition-colors" />
            : <ChevronRight className="w-3 h-3 group-hover:text-white/50 transition-colors" />}
          <span className="uppercase tracking-widest font-semibold group-hover:text-white/50 transition-colors">
            Attachments
          </span>
          {media.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
              {media.length}
            </span>
          )}
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[10px] transition-colors disabled:opacity-40"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
        >
          {uploading
            ? <span className="loading loading-spinner" style={{ width: '10px', height: '10px' }} />
            : <Upload className="w-3 h-3" />}
          Upload
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="mt-2 space-y-1"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          {media.length === 0 ? (
            <div
              className="flex items-center justify-center gap-2 py-4 rounded-lg cursor-pointer transition-colors"
              style={{ border: '1px dashed rgba(255,255,255,0.07)' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Drop files or click to upload</span>
            </div>
          ) : (
            media.map(item => {
              const url = getUrl(item)
              return (
                <div key={item.id} className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <TypeIcon type={item.file_type} />
                  </span>
                  {item.file_type === 'image' && url ? (
                    <img src={url} alt={item.filename} className="w-8 h-6 object-cover rounded flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                  ) : null}
                  <span className="text-xs truncate flex-1 min-w-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {item.filename}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={() => handleDelete(item)}
                      className="transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
