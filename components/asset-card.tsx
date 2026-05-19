'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Asset, AssetType, AssetStatus } from '@/lib/types'
import { CheckCircle, RotateCcw, Clock, FileText, Image, Tag, AlignLeft, Type, Scissors, PenLine, X, Send, ListTree } from 'lucide-react'
import dynamic from 'next/dynamic'

const ContentScorer = dynamic(() => import('@/components/content-scorer').then(m => m.ContentScorer), { ssr: false })
const ScriptEditor = dynamic(() => import('@/components/script-editor').then(m => m.ScriptEditor), { ssr: false, loading: () => <div className="h-32 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /> })
const NotionEditor = dynamic(() => import('@/components/notion-editor').then(m => m.NotionEditor), { ssr: false, loading: () => <div className="h-48 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /> })

const assetConfig: Record<AssetType, { label: string; icon: React.ElementType; placeholder: string; optional?: boolean }> = {
  title:       { label: 'Title',       icon: Type,      placeholder: 'Video title will appear here...' },
  intro:       { label: 'Intro',       icon: FileText,  placeholder: 'Hook / intro script will appear here...' },
  thumbnail:   { label: 'Thumbnail',   icon: Image,     placeholder: 'Thumbnail image' },
  structure:   { label: 'Structure',   icon: ListTree,  placeholder: 'Video structure / outline will appear here...' },
  outro:       { label: 'Outro',       icon: FileText,  placeholder: 'Outro / closing script will appear here...' },
  script:      { label: 'Script',      icon: FileText,  placeholder: 'Full video script will appear here...', optional: true },
  description: { label: 'Description', icon: AlignLeft, placeholder: 'YouTube description will appear here...' },
  tags:        { label: 'Tags',        icon: Tag,       placeholder: 'Tags will appear here...' },
}

const statusConfig: Record<AssetStatus, { label: string; color: string; bg: string }> = {
  draft:              { label: 'Draft',            color: 'rgba(255,255,255,0.3)',  bg: 'rgba(255,255,255,0.06)' },
  pending_review:     { label: 'Pending Review',   color: '#f59e0b',               bg: 'rgba(245,158,11,0.1)' },
  approved:           { label: 'Approved',         color: '#10b981',               bg: 'rgba(16,185,129,0.1)' },
  revision_requested: { label: 'Needs Revision',   color: '#f87171',               bg: 'rgba(248,113,113,0.1)' },
}

interface AssignedThumbnail {
  id: string
  is_chosen: boolean
  thumbnail: {
    id: string
    storage_path: string | null
    url: string | null
  } | null
}

interface AssetCardProps {
  type: AssetType
  asset: Asset | null
  videoId: string
  introAsset?: Asset | null
  assignedThumbnails?: AssignedThumbnail[]
}

export function AssetCard({ type, asset, videoId, introAsset, assignedThumbnails }: AssetCardProps) {
  const config = assetConfig[type]
  const Icon = config.icon
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [scriptPlainText, setScriptPlainText] = useState<string>(asset?.content ?? '')
  const isInlineEdit = type === 'intro' || type === 'structure' || type === 'outro'
  const [showEditor, setShowEditor] = useState(!isInlineEdit && !asset && type !== 'thumbnail')
  const [editorContent, setEditorContent] = useState(isInlineEdit ? (asset?.content ?? '') : '')
  const [editorSaving, setEditorSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const supabase = createClient()
  const router = useRouter()

  const saveManualContent = async () => {
    if (!editorContent.trim()) return
    setEditorSaving(true)
    try {
      if (asset) {
        // Update existing asset
        await supabase
          .from('assets')
          .update({
            content: editorContent,
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id)
      } else {
        // Create new asset
        await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            type,
            content: editorContent,
            status: 'approved',
          }),
        })
      }
      setShowEditor(false)
      setEditorContent('')
      router.refresh()
    } finally {
      setEditorSaving(false)
    }
  }

  const autoSave = async (content: string) => {
    if (!content.trim() && !asset) return
    if (content === (asset?.content ?? '')) return
    setSaveStatus('saving')
    try {
      if (asset) {
        await supabase
          .from('assets')
          .update({ content, status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', asset.id)
      } else {
        await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: videoId, type, content, status: 'approved' }),
        })
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      router.refresh()
    } catch {
      setSaveStatus('idle')
    }
  }

  const extractIntro = async () => {
    const textToExtract = type === 'script' ? scriptPlainText : asset?.content
    if (!textToExtract) return
    setExtracting(true)
    setExtractError(null)
    try {
      const res = await fetch('/api/extract-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          script_content: textToExtract,
          existing_intro_id: introAsset?.id ?? null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setExtractError(data.error ?? 'Failed to extract intro')
      } else {
        router.refresh()
      }
    } catch {
      setExtractError('Network error')
    } finally {
      setExtracting(false)
    }
  }

  const updateAssetStatus = async (status: AssetStatus, notes?: string) => {
    if (!asset) return
    setLoading(true)
    await supabase
      .from('assets')
      .update({ status, revision_notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq('id', asset.id)

    setLoading(false)
    setShowRevisionForm(false)
    setRevisionNotes('')
    router.refresh()
  }

  const isEmpty = !asset
  const sc = asset ? statusConfig[asset.status] : null

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: '#2d2c2a',
        border: `1px solid ${isEmpty && !isInlineEdit ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'}`,
        opacity: isEmpty && !isInlineEdit ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="font-medium text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{config.label}</span>
          {config.optional && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              optional
            </span>
          )}
          {asset?.version && asset.version > 1 && (
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>v{asset.version}</span>
          )}
        </div>
        {sc ? (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: sc.bg, color: sc.color }}
          >
            {sc.label}
          </span>
        ) : (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' }}
          >
            Not created
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {/* Notion-style inline editor for writing types */}
        {isInlineEdit && (
          <NotionEditor
            initialContent={asset?.content ?? ''}
            placeholder={config.placeholder}
            onSave={(md) => autoSave(md)}
            saveStatus={saveStatus}
          />
        )}

        {/* Modal editor for other types */}
        {!isInlineEdit && showEditor && (
          <div className="space-y-3 mb-3">
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <PenLine className="w-3 h-3" /> Writing your own {config.label.toLowerCase()}
            </p>
            {type === 'title' ? (
              <input
                type="text"
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                placeholder="Write your title..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            ) : type === 'tags' ? (
              <div className="space-y-1.5">
                <textarea
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  placeholder="tutorial, review, behind the scenes, productivity..."
                  rows={2}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Comma-separated tags</p>
              </div>
            ) : (
              <textarea
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                placeholder={config.placeholder}
                rows={type === 'script' || type === 'description' ? 12 : 4}
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm resize-y outline-none leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontFamily: 'inherit', minHeight: 100 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={saveManualContent}
                disabled={editorSaving || !editorContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: '#dc2626', color: 'white', opacity: editorSaving || !editorContent.trim() ? 0.5 : 1 }}
              >
                <Send className="w-3 h-3" />
                {editorSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowEditor(false); setEditorContent('') }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        )}

        {isInlineEdit ? null : isEmpty && !showEditor && type !== 'thumbnail' ? (
          <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.2)' }}>{config.placeholder}</p>
        ) : !showEditor && type === 'thumbnail' ? (
          // Show assigned thumbnails as images; fallback to storage_path asset or placeholder
          assignedThumbnails && assignedThumbnails.length > 0 ? (
            <div className="space-y-2">
              {/* Chosen thumbnail large */}
              {assignedThumbnails.filter(t => t.is_chosen && t.thumbnail).map(t => {
                const src = t.thumbnail!.url ?? (t.thumbnail!.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${t.thumbnail!.storage_path}` : null)
                if (!src) return null
                return (
                  <div key={t.id}>
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Selected</p>
                    <img src={src} alt="Chosen thumbnail" className="rounded-lg w-full object-cover" style={{ maxHeight: 200 }} />
                  </div>
                )
              })}
              {/* Other thumbnails small grid */}
              {(() => {
                const others = assignedThumbnails.filter(t => !t.is_chosen && t.thumbnail)
                if (!others.length) return null
                return (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Alternatives</p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(others.length, 3)}, 1fr)` }}>
                      {others.map(t => {
                        const src = t.thumbnail!.url ?? (t.thumbnail!.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${t.thumbnail!.storage_path}` : null)
                        if (!src) return null
                        return <img key={t.id} src={src} alt="Thumbnail" className="rounded-lg w-full object-cover" style={{ maxHeight: 90 }} />
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : asset?.storage_path ? (
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${asset.storage_path}`}
              alt="Thumbnail"
              className="rounded-lg max-h-48 object-cover"
            />
          ) : (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
              No thumbnails assigned yet — use the gallery above to assign one.
            </p>
          )
        ) : !showEditor && type === 'script' && asset ? (
          <ScriptEditor
            initialContent={asset.content}
            assetId={asset.id}
            readOnly={asset.status === 'approved'}
            onContentChange={setScriptPlainText}
          />
        ) : !showEditor && !isEmpty ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {asset?.content || <span style={{ color: 'rgba(255,255,255,0.2)' }}><em>No content yet</em></span>}
          </p>
        ) : null}

        {/* AI Scorer */}
        {type === 'script' && scriptPlainText.trim() && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <ContentScorer content={scriptPlainText} type="script" label="Score this script" />
          </div>
        )}
        {type === 'description' && asset?.content && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <ContentScorer content={asset.content} type="description" label="Score this description" />
          </div>
        )}

        {/* Revision notes */}
        {asset?.revision_notes && (
          <div
            className="mt-3 p-3 rounded-lg"
            style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
              Revision Notes
            </p>
            <p className="text-sm" style={{ color: 'rgba(248,113,113,0.85)' }}>{asset.revision_notes}</p>
          </div>
        )}
      </div>


      {/* Write myself — approved state edit */}
      {!isInlineEdit && !isEmpty && asset?.status === 'approved' && type !== 'thumbnail' && type !== 'script' && !showEditor && (
        <div className="px-5 pb-2">
          <button
            onClick={() => { setShowEditor(true); setEditorContent(asset.content ?? '') }}
            className="flex items-center gap-1 text-xs transition-all hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <PenLine className="w-3 h-3" /> Edit content
          </button>
        </div>
      )}

      {/* Actions */}
      {!isInlineEdit && asset && asset.status !== 'approved' && (
        <div className="px-5 pb-4 space-y-3">
          {!showRevisionForm ? (
            <div className="flex gap-2 flex-wrap">
              {asset.status === 'pending_review' && (
                <>
                  <button
                    onClick={() => updateAssetStatus('approved')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-85 disabled:opacity-50"
                    style={{ background: '#10b981', color: 'white' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {loading ? 'Saving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setShowRevisionForm(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-85"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Request Revision
                  </button>
                </>
              )}
              {asset.status === 'revision_requested' && (
                <button
                  onClick={() => setShowRevisionForm(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-85"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Update Notes
                </button>
              )}
              {asset.status === 'draft' && (
                <div className="flex items-center gap-3">
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    <Clock className="w-3 h-3" /> AI is working on this
                  </p>
                  {type !== 'thumbnail' && (
                    <button
                      onClick={() => { setShowEditor(true); setEditorContent(asset.content ?? '') }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <PenLine className="w-3 h-3" /> Write myself
                    </button>
                  )}
                </div>
              )}
              {(asset.status === 'pending_review' || asset.status === 'revision_requested') && type !== 'thumbnail' && type !== 'script' && !showEditor && (
                <button
                  onClick={() => { setShowEditor(true); setEditorContent(asset.content ?? '') }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <PenLine className="w-3 h-3" /> Edit myself
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                placeholder="What needs to be changed?"
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white',
                  minHeight: '80px',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateAssetStatus('revision_requested', revisionNotes)}
                  disabled={loading || !revisionNotes.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-85 disabled:opacity-40"
                  style={{ background: '#dc2626', color: 'white' }}
                >
                  {loading ? 'Saving...' : 'Send Revision'}
                </button>
                <button
                  onClick={() => { setShowRevisionForm(false); setRevisionNotes('') }}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Undo approval */}
      {!isInlineEdit && asset?.status === 'approved' && (
        <div className="px-5 pb-4">
          <button
            onClick={() => updateAssetStatus('pending_review')}
            disabled={loading}
            className="flex items-center gap-1 text-xs transition-all hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <RotateCcw className="w-3 h-3" /> Undo approval
          </button>
        </div>
      )}

      {/* Extract intro */}
      {type === 'script' && scriptPlainText.trim() && (
        <div className="px-5 pb-4 pt-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={extractIntro}
              disabled={extracting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-85"
              style={{
                background: 'rgba(124,58,237,0.1)',
                color: '#a78bfa',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              {extracting
                ? <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                : <Scissors className="w-3 h-3" />}
              {extracting ? 'Extracting...' : introAsset ? 'Re-extract Intro' : 'Pull Intro from Script'}
            </button>
            {extractError && <span className="text-xs" style={{ color: '#f87171' }}>{extractError}</span>}
            {!extractError && introAsset && !extracting && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Intro exists — click to overwrite</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
