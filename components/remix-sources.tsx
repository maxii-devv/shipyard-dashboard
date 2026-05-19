'use client'

import { useState, useEffect } from 'react'
import { Link2, Plus, X, ExternalLink, Loader2, Youtube, Instagram } from 'lucide-react'

interface Source {
  id: string
  url: string
  title: string | null
  platform: string
  notes: string | null
  created_at: string
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  instagram: { label: 'Instagram', color: '#e1306c', icon: <Instagram size={11} /> },
  youtube:   { label: 'YouTube',   color: '#dc2626', icon: <Youtube size={11} /> },
  tiktok:    { label: 'TikTok',    color: '#ffffff', icon: <span style={{ fontSize: 11 }}>♪</span> },
  twitter:   { label: 'X',         color: '#1d9bf0', icon: <span style={{ fontSize: 11 }}>𝕏</span> },
  linkedin:  { label: 'LinkedIn',  color: '#0077b5', icon: <span style={{ fontSize: 10, fontWeight: 700 }}>in</span> },
  threads:   { label: 'Threads',   color: '#ffffff', icon: <span style={{ fontSize: 11 }}>@</span> },
  web:       { label: 'Web',       color: '#6b7280', icon: <Link2 size={11} /> },
}

function platformLabel(url: string): string {
  try {
    const h = new URL(url).hostname
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube'
    if (h.includes('tiktok')) return 'tiktok'
    if (h.includes('twitter') || h.includes('x.com')) return 'twitter'
    if (h.includes('linkedin')) return 'linkedin'
    if (h.includes('threads')) return 'threads'
  } catch {}
  return 'web'
}

function shortUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const host = hostname.replace(/^www\./, '')
    const path = pathname.length > 30 ? pathname.slice(0, 28) + '…' : pathname
    return host + path
  } catch {
    return url.slice(0, 40)
  }
}

interface RemixSourcesProps {
  contentType: string   // 'video' | 'linkedin_post' | 'instagram_post' | etc.
  contentId: string
  compact?: boolean     // condensed mode for tighter layouts
}

export function RemixSources({ contentType, contentId, compact = false }: RemixSourcesProps) {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    fetch(`/api/content-sources?contentType=${contentType}&contentId=${contentId}`)
      .then(r => r.json())
      .then(data => { setSources(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [contentType, contentId])

  const handleAdd = async () => {
    setUrlError('')
    if (!url.trim()) { setUrlError('URL is required'); return }
    try { new URL(url.trim()) } catch { setUrlError('Enter a valid URL'); return }

    setAdding(true)
    const res = await fetch('/api/content-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId, url: url.trim(), title: title.trim() || null, notes: notes.trim() || null }),
    })
    if (res.ok) {
      const newSource = await res.json()
      setSources(s => [...s, newSource])
      setUrl(''); setTitle(''); setNotes('')
      setShowForm(false)
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    setSources(s => s.filter(x => x.id !== id))
    await fetch(`/api/content-sources/${id}`, { method: 'DELETE' })
  }

  const preview = (src: Source) => {
    const detected = src.platform ?? platformLabel(src.url)
    const cfg = PLATFORM_CONFIG[detected] ?? PLATFORM_CONFIG.web
    return { cfg, detected }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sources.length > 0 || showForm ? 10 : 0 }}>
        <label style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Link2 size={11} /> Remixing
          {sources.length > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>({sources.length})</span>}
        </label>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
          }}
        >
          <Plus size={12} /> Add source
        </button>
      </div>

      {/* Existing sources */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sources.map(src => {
            const { cfg, detected } = preview(src)
            return (
              <div key={src.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '9px 12px',
                position: 'relative',
              }}>
                {/* Platform dot */}
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: `${cfg.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cfg.color, marginTop: 1,
                }}>
                  {cfg.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {src.title ? (
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 2 }}>
                      {src.title}
                    </div>
                  ) : null}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11, color: cfg.color, textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                      opacity: 0.8,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                  >
                    {shortUrl(src.url)}
                    <ExternalLink size={10} />
                  </a>
                  {src.notes && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.4 }}>
                      {src.notes}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(src.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.15)', padding: 2, flexShrink: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.15)')}
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          marginTop: 8,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 9, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div>
            <input
              autoFocus
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="https://instagram.com/p/... or youtube.com/watch?v=..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${urlError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.09)'}`,
                borderRadius: 7, padding: '8px 10px',
                fontSize: 12.5, color: 'white', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {urlError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{urlError}</div>}
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional — auto-detected from URL)"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 7, padding: '7px 10px',
              fontSize: 12, color: 'white', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What's the angle / what are you borrowing from this? (optional)"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 7, padding: '7px 10px',
              fontSize: 12, color: 'white', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowForm(false); setUrl(''); setTitle(''); setNotes('') }}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                background: 'none', border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !url.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: '#dc2626', color: 'white', border: 'none',
                cursor: 'pointer', opacity: adding || !url.trim() ? 0.5 : 1,
              }}
            >
              {adding ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={11} />}
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
