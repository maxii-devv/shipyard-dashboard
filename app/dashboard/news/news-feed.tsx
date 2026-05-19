'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Hash, Check, ExternalLink, ArrowUp, MessageSquare, Loader2, Settings2, X, Plus, Rss, Globe } from 'lucide-react'
import type { NewsItem } from '@/app/api/news/route'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface SavedSource {
  id: string
  name: string
  source_type: 'rss' | 'reddit'
  url: string
  color: string
}

const RANDOM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b']

function SourceEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [sources, setSources] = useState<SavedSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addType, setAddType] = useState<'rss' | 'reddit'>('rss')
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetch('/api/news/preferences')
      .then(r => r.json())
      .then(data => setSources(data.sources ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id))
  }

  const addSource = () => {
    if (!addName.trim() || !addUrl.trim()) return
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]
    // For reddit sources, strip "r/" prefix if user included it
    const url = addType === 'reddit' ? addUrl.trim().replace(/^\/?r\//, '') : addUrl.trim()
    setSources(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name: addName.trim(),
      source_type: addType,
      url,
      color,
    }])
    setAddName('')
    setAddUrl('')
    setShowAddForm(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/news/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="rounded-2xl p-8" style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Loader2 className="w-5 h-5 text-white/30 animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-xl max-h-[80vh] rounded-2xl flex flex-col"
        style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Manage News Sources</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Source list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {sources.map(source => (
            <div
              key={source.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg group"
              style={{ background: `${source.color}08`, border: `1px solid ${source.color}20` }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: source.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-white/80 block truncate">{source.name}</span>
                <span className="text-[10px] block truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {source.source_type === 'reddit' ? `r/${source.url}` : source.url}
                </span>
              </div>
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded" style={{
                color: source.source_type === 'reddit' ? '#f97316' : '#3b82f6',
                background: source.source_type === 'reddit' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)',
              }}>
                {source.source_type}
              </span>
              <button
                onClick={() => removeSource(source.id)}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5"
              >
                <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            </div>
          ))}

          {sources.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No sources yet. Add RSS feeds or subreddits below.
              </p>
            </div>
          )}

          {/* Add form */}
          {showAddForm ? (
            <div
              className="rounded-xl p-4 space-y-3 mt-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddType('rss')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: addType === 'rss' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                    border: addType === 'rss' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    color: addType === 'rss' ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Rss className="w-3 h-3" /> RSS Feed
                </button>
                <button
                  onClick={() => setAddType('reddit')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: addType === 'reddit' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                    border: addType === 'reddit' ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    color: addType === 'reddit' ? '#f97316' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Globe className="w-3 h-3" /> Subreddit
                </button>
              </div>
              <input
                type="text"
                placeholder={addType === 'rss' ? 'Source name (e.g. TechCrunch)' : 'Display name (e.g. r/webdev)'}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/30"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <input
                type="text"
                placeholder={addType === 'rss' ? 'RSS feed URL (e.g. https://example.com/feed)' : 'Subreddit name (e.g. webdev)'}
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/30"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowAddForm(false); setAddName(''); setAddUrl('') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addSource}
                  disabled={!addName.trim() || !addUrl.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-30"
                  style={{ background: '#dc2626' }}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium transition-all hover:border-white/10 mt-2"
              style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add a source
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#dc2626' }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Sources
          </button>
        </div>
      </div>
    </div>
  )
}

export function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'rss' | 'reddit'>('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null)
  const [savedTopicIds, setSavedTopicIds] = useState<Set<string>>(new Set())
  const [showEditor, setShowEditor] = useState(false)

  const fetchNews = (force = false) => {
    setLoading(true)
    fetch(`/api/news${force ? '?force=1' : ''}`)
      .then(r => r.json())
      .then(data => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNews() }, [])

  // Get unique sources that have items
  const sources = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; type: string; count: number }>()
    for (const item of items) {
      const existing = map.get(item.source_id)
      if (existing) {
        existing.count++
      } else {
        map.set(item.source_id, {
          id: item.source_id,
          name: item.source_name,
          color: item.source_color,
          type: item.source_type,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [items])

  // Filter items
  const filtered = useMemo(() => {
    let result = items
    if (typeFilter !== 'all') result = result.filter(i => i.source_type === typeFilter)
    if (sourceFilter !== 'all') result = result.filter(i => i.source_id === sourceFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, typeFilter, sourceFilter, search])

  const rssCount = items.filter(i => i.source_type === 'rss').length
  const redditCount = items.filter(i => i.source_type === 'reddit').length

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/news?force=1')
      if (res.ok) setItems(await res.json())
    } finally {
      setRefreshing(false)
    }
  }

  const saveAsTopic = async (item: NewsItem) => {
    setSavingTopicId(item.id)
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.title,
          description: item.description || null,
          source_url: item.url,
          source_name: item.source_name,
        }),
      })
      if (res.ok) {
        setSavedTopicIds(prev => new Set([...prev, item.id]))
      }
    } finally {
      setSavingTopicId(null)
    }
  }

  const chipBase = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border'
  const chipActive = 'text-white'
  const chipInactive = 'text-white/40 hover:text-white/60 border-transparent'

  return (
    <div className="space-y-5">
      {/* Source editor modal */}
      {showEditor && (
        <SourceEditor
          onClose={() => setShowEditor(false)}
          onSaved={() => fetchNews(true)}
        />
      )}

      {/* Stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>{items.length} stories</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>{rssCount} RSS</span>
          <span>{redditCount} Reddit</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Settings2 className="w-3 h-3" />
            Sources
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search stories..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type filters */}
        <button
          onClick={() => { setTypeFilter('all'); setSourceFilter('all') }}
          className={`${chipBase} ${typeFilter === 'all' && sourceFilter === 'all' ? chipActive : chipInactive}`}
          style={typeFilter === 'all' && sourceFilter === 'all' ? { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' } : {}}
        >
          All
        </button>
        <button
          onClick={() => { setTypeFilter('rss'); setSourceFilter('all') }}
          className={`${chipBase} ${typeFilter === 'rss' && sourceFilter === 'all' ? chipActive : chipInactive}`}
          style={typeFilter === 'rss' && sourceFilter === 'all' ? { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' } : {}}
        >
          RSS ({rssCount})
        </button>
        <button
          onClick={() => { setTypeFilter('reddit'); setSourceFilter('all') }}
          className={`${chipBase} ${typeFilter === 'reddit' && sourceFilter === 'all' ? chipActive : chipInactive}`}
          style={typeFilter === 'reddit' && sourceFilter === 'all' ? { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' } : {}}
        >
          Reddit ({redditCount})
        </button>

        <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Per-source filters */}
        {sources.map(src => (
          <button
            key={src.id}
            onClick={() => { setSourceFilter(src.id); setTypeFilter('all') }}
            className={`${chipBase} flex items-center gap-1.5 ${sourceFilter === src.id ? chipActive : chipInactive}`}
            style={sourceFilter === src.id ? { background: `${src.color}15`, borderColor: `${src.color}30`, color: src.color } : {}}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: src.color }} />
            {src.name}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(search || typeFilter !== 'all' || sourceFilter !== 'all') && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}
          {filtered.length !== items.length && ` (filtered from ${items.length})`}
        </p>
      )}

      {/* News items */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading news...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {items.length === 0 ? 'No news sources configured — click Sources above to add some' : 'No stories match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            return (
              <div
                key={item.id}
                className="rounded-xl p-4 transition-all hover:border-white/10 group"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Top row: source + time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.source_color }} />
                    <span className="text-[11px] font-medium" style={{ color: item.source_color }}>
                      {item.source_name}
                    </span>
                    {item.source_type === 'reddit' && item.reddit_score != null && (
                      <div className="flex items-center gap-2 ml-1">
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          <ArrowUp className="w-2.5 h-2.5" /> {item.reddit_score}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          <MessageSquare className="w-2.5 h-2.5" /> {item.reddit_comments}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {timeAgo(item.published_at)}
                  </span>
                </div>

                {/* Title */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-medium text-white/90 hover:text-white transition-colors leading-snug mb-1.5"
                >
                  {item.title}
                </a>

                {/* Description */}
                {item.description && (
                  <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {item.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                  <button
                    onClick={() => saveAsTopic(item)}
                    disabled={savedTopicIds.has(item.id) || savingTopicId === item.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all disabled:cursor-default"
                    style={
                      savedTopicIds.has(item.id)
                        ? { color: '#22c55e', background: 'rgba(34,197,94,0.08)' }
                        : { color: '#f59e0b', background: 'rgba(245,158,11,0.08)', cursor: 'pointer' }
                    }
                  >
                    {savedTopicIds.has(item.id) ? (
                      <><Check className="w-3 h-3" /> Saved</>
                    ) : savingTopicId === item.id ? (
                      <>Saving...</>
                    ) : (
                      <><Hash className="w-3 h-3" /> Save as Topic</>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
