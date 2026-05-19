'use client'

import { useState } from 'react'
import {
  Plus, Trash2, ExternalLink, Instagram, Linkedin, Youtube,
  Twitter, Zap, X, Check, Shuffle
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Format {
  id: string
  name: string
  description: string | null
  platform: string
  content_type: string
  reference_url: string | null
  notes: string | null
  thumbnail_url: string | null
  created_at: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram, youtube: Youtube, linkedin: Linkedin, twitter: Twitter,
}
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c', youtube: '#dc2626', linkedin: '#0ea5e9',
  twitter: '#1d9bf0', tiktok: '#69c9d0',
}
const CONTENT_TYPE_LABELS: Record<string, string> = {
  reel: 'Reel', carousel: 'Carousel', post: 'Post', thread_carousel: 'Thread Carousel',
  youtube_video: 'YouTube Video', youtube_short: 'YouTube Short', blog_post: 'Blog Post',
  linkedin_post: 'LinkedIn Post', tweet: 'Tweet', story: 'Story',
}
const PLATFORMS = ['instagram', 'youtube', 'linkedin', 'twitter', 'tiktok']
const CONTENT_TYPES = Object.entries(CONTENT_TYPE_LABELS)

// ─── Add Format Modal ─────────────────────────────────────────────────────────

function AddFormatModal({ onClose, onAdded }: { onClose: () => void; onAdded: (f: Format) => void }) {
  const [form, setForm] = useState({
    name: '', description: '', platform: 'instagram', content_type: 'reel',
    reference_url: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || null,
        platform: form.platform,
        content_type: form.content_type,
        reference_url: form.reference_url.trim() || null,
        notes: form.notes.trim() || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      onAdded(created)
      onClose()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Save a Format</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. POV hook opener, Talking head with B-roll..."
              style={{ width: '100%', marginTop: 6, background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Platform</label>
              <select
                value={form.platform}
                onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                style={{ width: '100%', marginTop: 6, background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none' }}
              >
                {PLATFORMS.map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Content Type</label>
              <select
                value={form.content_type}
                onChange={e => setForm(p => ({ ...p, content_type: e.target.value }))}
                style={{ width: '100%', marginTop: 6, background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none' }}
              >
                {CONTENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Reference URL</label>
            <input
              value={form.reference_url}
              onChange={e => setForm(p => ({ ...p, reference_url: e.target.value }))}
              placeholder="Instagram reel, YouTube video, TikTok you want to recreate..."
              style={{ width: '100%', marginTop: 6, background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>What makes it work? (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Hook style, pacing, structure, visual style, why it catches attention..."
              rows={3}
              style={{ width: '100%', marginTop: 6, background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#ef4444' }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save Format'}
            </button>
            <button
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Apply Format Modal ──────────────────────────────────────────────────────

function ApplyModal({ format, onClose }: { format: Format; onClose: () => void }) {
  const [topic, setTopic] = useState('')
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(false)

  const platformColor = PLATFORM_COLORS[format.platform] ?? '#888'

  const apply = async () => {
    if (!topic.trim()) return
    setApplying(true)

    const brief = [
      `Format: ${format.name}`,
      format.reference_url ? `Reference: ${format.reference_url}` : null,
      format.notes ? `\nWhat makes it work:\n${format.notes}` : null,
      `\nYour topic/angle: ${topic}`,
      `\nCreate a ${CONTENT_TYPE_LABELS[format.content_type] ?? format.content_type} in this exact style for the topic above. Recreate the structure, pacing, and hook style — but about "${topic}" instead of the original subject.`,
    ].filter(Boolean).join('\n')

    await navigator.clipboard.writeText(brief)

    setDone(true)
    setApplying(false)
    setTimeout(onClose, 1800)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check className="w-6 h-6" style={{ color: '#22c55e' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Brief copied to clipboard</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Paste it into your AI tool to generate the content.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Apply: {format.name}</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              Enter a topic to recreate in this {CONTENT_TYPE_LABELS[format.content_type] ?? format.content_type} format on {format.platform}.
            </p>

            <input
              autoFocus
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter your topic or angle..."
              onKeyDown={e => e.key === 'Enter' && apply()}
              style={{ width: '100%', background: '#262624', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={apply}
                disabled={!topic.trim() || applying}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: topic.trim() ? '#dc2626' : 'rgba(255,255,255,0.06)',
                  color: topic.trim() ? 'white' : 'rgba(255,255,255,0.25)',
                  fontSize: 13, fontWeight: 600, cursor: topic.trim() ? 'pointer' : 'default',
                }}
              >
                {applying ? 'Applying…' : 'Copy Brief →'}
              </button>
              <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Format Card ──────────────────────────────────────────────────────────────

function FormatCard({ format, onDelete }: { format: Format; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const PlatformIcon = PLATFORM_ICONS[format.platform] ?? Zap
  const platformColor = PLATFORM_COLORS[format.platform] ?? '#888'
  const typeLabel = CONTENT_TYPE_LABELS[format.content_type] ?? format.content_type

  const deleteFormat = async () => {
    if (!confirm('Delete this format?')) return
    setDeleting(true)
    await fetch(`/api/formats/${format.id}`, { method: 'DELETE' })
    onDelete(format.id)
  }

  return (
    <>
      <div
        style={{
          background: '#2d2c2a',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12,
          position: 'relative', transition: 'border-color 0.15s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Delete button */}
        <button
          onClick={deleteFormat}
          disabled={deleting}
          style={{
            position: 'absolute', top: 12, right: 12,
            opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'rgba(255,255,255,0.25)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Platform + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${platformColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PlatformIcon className="w-4 h-4" style={{ color: platformColor }} />
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: platformColor, textTransform: 'capitalize' }}>{format.platform}</span>
            <span style={{ fontSize: 9, marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{typeLabel}</span>
          </div>
        </div>

        {/* Name */}
        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, paddingRight: 20 }}>
          {format.name}
        </p>

        {/* Notes preview */}
        {format.notes && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {format.notes}
          </p>
        )}

        {/* Reference URL */}
        {format.reference_url && (
          <a
            href={format.reference_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <ExternalLink className="w-3 h-3" />
            View reference
          </a>
        )}

        {/* Apply button */}
        <button
          onClick={() => setApplyOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 0', borderRadius: 9, border: `1px solid ${platformColor}30`,
            background: `${platformColor}0d`, color: platformColor,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 'auto',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${platformColor}1a` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${platformColor}0d` }}
        >
          <Shuffle className="w-3.5 h-3.5" />
          Apply Format
        </button>
      </div>

      {applyOpen && (
        <ApplyModal format={format} onClose={() => setApplyOpen(false)} />
      )}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FormatsClient({ formats: initialFormats }: { formats: Format[] }) {
  const [formats, setFormats] = useState(initialFormats)
  const [addOpen, setAddOpen] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('all')

  const platforms = Array.from(new Set(formats.map(f => f.platform))).sort()

  const filtered = formats.filter(f =>
    platformFilter === 'all' || f.platform === platformFilter
  )

  const handleAdded = (f: Format) => setFormats(prev => [f, ...prev])
  const handleDelete = (id: string) => setFormats(prev => prev.filter(f => f.id !== id))

  return (
    <div className="p-8 space-y-6" style={{ background: '#262624', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shuffle className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>Formats</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {formats.length} saved format{formats.length !== 1 ? 's' : ''} · apply to any topic to create content
            </p>
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus className="w-4 h-4" /> Save Format
        </button>
      </div>

      {/* How it works — shown when empty */}
      {formats.length === 0 && (
        <div style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '28px 32px', maxWidth: 580 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 10 }}>How this works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['📱', 'Save a format', 'Find a reel, video, or post you want to recreate. Save it here with the reference URL and notes on what makes it work.'],
              ['💡', 'Pick a topic', 'Choose any topic you want to create content about.'],
              ['⚡', 'Apply format', 'Hit "Apply Format" — a brief is generated for that exact format style but about your topic.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: 3 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform filter */}
      {formats.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...platforms].map(p => {
            const PlatformIcon = p !== 'all' ? (PLATFORM_ICONS[p] ?? Zap) : null
            const color = PLATFORM_COLORS[p] ?? 'rgba(255,255,255,0.6)'
            const active = platformFilter === p
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                  color: active ? color : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${active ? color + '35' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {PlatformIcon && <PlatformIcon className="w-3 h-3" />}
                {p === 'all' ? 'All platforms' : p.charAt(0).toUpperCase() + p.slice(1)}
                {p !== 'all' && <span style={{ opacity: 0.6, fontSize: 10 }}>{formats.filter(f => f.platform === p).length}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(f => (
            <FormatCard key={f.id} format={f} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add modal */}
      {addOpen && <AddFormatModal onClose={() => setAddOpen(false)} onAdded={handleAdded} />}
    </div>
  )
}
