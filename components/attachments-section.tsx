'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Presentation, Shapes, ImageIcon, Link2, Plus, GripVertical,
  Trash2, ExternalLink, Loader2, Upload, Pencil, Check, X,
  SquareArrowOutUpRight, Download,
} from 'lucide-react'
import type { VideoAttachment, VideoAttachmentType } from '@/lib/types'

interface AttachmentsSectionProps {
  videoId: string
  initialAttachments: VideoAttachment[]
}

const TYPE_CONFIG: Record<VideoAttachmentType, { label: string; icon: typeof Presentation; color: string; bg: string; border: string }> = {
  presentation: { label: 'Presentation', icon: Presentation, color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  diagram: { label: 'Diagram', icon: Shapes, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  image: { label: 'Image', icon: ImageIcon, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  link: { label: 'Link', icon: Link2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
}

export function AttachmentsSection({ videoId, initialAttachments }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<VideoAttachment[]>(initialAttachments)
  const [loading, setLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excalidrawInputRef = useRef<HTMLInputElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const addAttachment = async (type: VideoAttachmentType, title?: string, url?: string) => {
    setLoading('add')
    setShowAddMenu(false)
    try {
      const res = await fetch(`/api/videos/${videoId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title ?? '', url: url ?? null }),
      })
      const data = await res.json()
      if (data.id) setAttachments(prev => [...prev, data])
    } finally {
      setLoading(null)
    }
  }

  const updateAttachment = async (attachmentId: string, updates: Record<string, unknown>) => {
    setLoading(attachmentId)
    try {
      const res = await fetch(`/api/videos/${videoId}/attachments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId, ...updates }),
      })
      const data = await res.json()
      if (data.id) setAttachments(prev => prev.map(a => a.id === data.id ? data : a))
    } finally {
      setLoading(null)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    setLoading(attachmentId)
    try {
      await fetch(`/api/videos/${videoId}/attachments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      })
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } finally {
      setLoading(null)
    }
  }

  const reorder = async (newOrder: VideoAttachment[]) => {
    setAttachments(newOrder)
    await fetch(`/api/videos/${videoId}/attachments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: true, order: newOrder.map(a => a.id) }),
    })
  }

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading('upload')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/videos/${videoId}/attachments/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.id) setAttachments(prev => [...prev, data])
    } finally {
      setLoading(null)
    }
  }, [videoId])

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const items = [...attachments]
    const [moved] = items.splice(dragIdx, 1)
    items.splice(idx, 0, moved)
    setDragIdx(null)
    setDragOverIdx(null)
    reorder(items)
  }
  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const startEdit = (a: VideoAttachment) => {
    setEditingId(a.id)
    setEditTitle(a.title)
    setEditUrl(a.url ?? '')
  }

  const saveEdit = async (id: string) => {
    setEditingId(null)
    await updateAttachment(id, { title: editTitle, url: editUrl || null })
  }

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return
    await addAttachment('link', linkTitle || linkUrl, linkUrl)
    setAddingLink(false)
    setLinkTitle('')
    setLinkUrl('')
  }

  // Empty state
  if (attachments.length === 0 && !addingLink) {
    return (
      <div className="pt-4 space-y-4">
        <div className="flex items-center justify-center gap-6 py-12">
          <button
            onClick={() => addAttachment('presentation', 'Untitled Presentation')}
            disabled={!!loading}
            className="group flex flex-col items-center gap-3 p-8 rounded-xl transition-all hover:scale-[1.02]"
            style={{
              background: '#2d2c2a',
              border: '1px dashed rgba(249,115,22,0.2)',
              width: 200,
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              {loading === 'add' ? (
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#f97316' }} />
              ) : (
                <Presentation className="w-6 h-6" style={{ color: '#f97316' }} />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Presentation</p>
              <p className="text-[10px] text-white/25 mt-0.5">Slides, decks, keynotes</p>
            </div>
          </button>

          <button
            onClick={() => excalidrawInputRef.current?.click()}
            disabled={!!loading}
            className="group flex flex-col items-center gap-3 p-8 rounded-xl transition-all hover:scale-[1.02]"
            style={{
              background: '#2d2c2a',
              border: '1px dashed rgba(168,85,247,0.2)',
              width: 200,
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              {loading === 'upload' ? (
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#a855f7' }} />
              ) : (
                <Shapes className="w-6 h-6" style={{ color: '#a855f7' }} />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Diagram</p>
              <p className="text-[10px] text-white/25 mt-0.5">Upload .excalidraw file</p>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            <ImageIcon className="w-3 h-3" /> Upload image
          </button>
          <span className="text-white/10">|</span>
          <button
            onClick={() => setAddingLink(true)}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            <Link2 className="w-3 h-3" /> Add link
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />
        <input
          ref={excalidrawInputRef}
          type="file"
          accept=".excalidraw"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  // List state
  return (
    <div className="pt-4 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
          e.target.value = ''
        }}
      />
      <input
        ref={excalidrawInputRef}
        type="file"
        accept=".excalidraw"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
          e.target.value = ''
        }}
      />

      {/* Attachment list */}
      {attachments.map((a, idx) => {
        const cfg = TYPE_CONFIG[a.type]
        const Icon = cfg.icon
        const isEditing = editingId === a.id
        const isLoading = loading === a.id
        const isDragOver = dragOverIdx === idx && dragIdx !== idx

        return (
          <div
            key={a.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className="group flex items-center gap-3 rounded-xl p-3 transition-all"
            style={{
              background: '#2d2c2a',
              border: isDragOver ? `1px solid ${cfg.border}` : '1px solid rgba(255,255,255,0.05)',
              opacity: dragIdx === idx ? 0.5 : 1,
            }}
          >
            {/* Drag handle */}
            <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3.5 h-3.5 text-white/20" />
            </div>

            {/* Type icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title..."
                    autoFocus
                    className="w-full px-2 py-1 text-xs text-white rounded-md outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(a.id) }}
                  />
                  {(a.type === 'link' || a.type === 'presentation' || a.type === 'diagram') && (
                    <input
                      type="text"
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      placeholder="URL (optional)..."
                      className="w-full px-2 py-1 text-xs text-white rounded-md outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(a.id) }}
                    />
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(a.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
                      <X className="w-3 h-3 text-white/30" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-white/75 truncate">{a.title || 'Untitled'}</p>
                  {a.url && (
                    <p className="text-[10px] text-white/25 truncate">{a.url}</p>
                  )}
                  {(a.type === 'image' || a.type === 'diagram') && a.file_name && (
                    <p className="text-[10px] text-white/25 truncate">{a.file_name}</p>
                  )}
                </>
              )}
            </div>

            {/* Image preview */}
            {a.type === 'image' && a.url && !isEditing && (
              <div className="w-16 h-10 rounded-md overflow-hidden flex-shrink-0" style={{ background: '#1c1b1a' }}>
                <img src={a.url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.type === 'diagram' && a.url && a.file_name && (
                  <a
                    href={a.url}
                    download={a.file_name}
                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="w-3 h-3 text-white/25 hover:text-white/50" />
                  </a>
                )}
                {a.url && a.type !== 'diagram' && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 text-white/25 hover:text-white/50" />
                  </a>
                )}
                <button onClick={() => startEdit(a)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
                  <Pencil className="w-3 h-3 text-white/25 hover:text-white/50" />
                </button>
                <button
                  onClick={() => deleteAttachment(a.id)}
                  disabled={isLoading}
                  className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white/25" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-white/25 hover:text-red-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add link inline form */}
      {addingLink && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: '#2d2c2a', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <input
            type="text"
            value={linkTitle}
            onChange={e => setLinkTitle(e.target.value)}
            placeholder="Link title..."
            autoFocus
            className="w-full px-2.5 py-1.5 text-xs text-white placeholder-white/25 rounded-md outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <input
            type="text"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-2.5 py-1.5 text-xs text-white placeholder-white/25 rounded-md outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Plus className="w-2.5 h-2.5" /> Add
            </button>
            <button
              onClick={() => { setAddingLink(false); setLinkTitle(''); setLinkUrl('') }}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add more buttons */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Plus className="w-3 h-3" /> Add attachment
          </button>
          {(() => {
            const urls = attachments.map(a => a.url).filter(Boolean) as string[]
            if (urls.length === 0) return null
            return (
              <button
                onClick={() => {
                  // Open first URL in a new window, rest as tabs in that window
                  const win = window.open(urls[0], '_blank', 'noopener')
                  // Small delay between opens so the browser groups them
                  urls.slice(1).forEach((url, i) => {
                    setTimeout(() => window.open(url, '_blank', 'noopener'), (i + 1) * 150)
                  })
                }}
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors px-2.5 py-1.5 rounded-lg ml-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <SquareArrowOutUpRight className="w-3 h-3" /> Open all tabs ({urls.length})
              </button>
            )
          })()}
          {showAddMenu && (
            <div
              className="absolute bottom-full left-0 mb-1 rounded-lg overflow-hidden shadow-xl z-10"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', minWidth: 180 }}
            >
              <button
                onClick={() => { addAttachment('presentation', 'Untitled Presentation'); setShowAddMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Presentation className="w-3.5 h-3.5" style={{ color: '#f97316' }} /> Presentation
              </button>
              <button
                onClick={() => { excalidrawInputRef.current?.click(); setShowAddMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Shapes className="w-3.5 h-3.5" style={{ color: '#a855f7' }} /> Upload .excalidraw
              </button>
              <button
                onClick={() => { fileInputRef.current?.click(); setShowAddMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} /> Upload image
              </button>
              <button
                onClick={() => { setAddingLink(true); setShowAddMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" style={{ color: '#22c55e' }} /> Add link
              </button>
            </div>
          )}
        </div>

        {loading === 'upload' && (
          <span className="flex items-center gap-1.5 text-[11px] text-white/30">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
          </span>
        )}
      </div>
    </div>
  )
}
