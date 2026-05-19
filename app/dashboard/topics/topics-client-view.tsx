'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, Plus, ExternalLink, Archive,
  RotateCcw, Trash2, Loader2, X, Clock, Target
} from 'lucide-react'
import type { Topic, TopicStatus } from '@/lib/types'

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

const STATUS_CONFIG: Record<TopicStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  graduated: { label: 'Graduated', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  archived:  { label: 'Archived',  color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' },
}

export function TopicsClientView() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceName, setNewSourceName] = useState('')
  const [newTargetPosts, setNewTargetPosts] = useState(1)

  useEffect(() => {
    fetchTopics()
  }, [])

  async function fetchTopics() {
    try {
      const res = await fetch('/api/topics')
      if (res.ok) setTopics(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function createTopic() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          source_url: newSourceUrl.trim() || null,
          source_name: newSourceName.trim() || null,
          target_posts: newTargetPosts,
        }),
      })
      if (res.ok) {
        const topic = await res.json()
        setTopics(prev => [topic, ...prev])
        setNewName('')
        setNewDescription('')
        setNewSourceUrl('')
        setNewSourceName('')
        setNewTargetPosts(1)
        setShowCreate(false)
      }
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(id: string, status: TopicStatus) {
    const res = await fetch(`/api/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTopics(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  async function deleteTopic(id: string) {
    const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTopics(prev => prev.filter(t => t.id !== id))
    }
  }

  const filtered = useMemo(() => {
    let result = topics
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.source_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [topics, statusFilter, search])

  const counts = useMemo(() => ({
    all: topics.length,
    active: topics.filter(t => t.status === 'active').length,
    graduated: topics.filter(t => t.status === 'graduated').length,
    archived: topics.filter(t => t.status === 'archived').length,
  }), [topics])

  const chipBase = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border'

  return (
    <div className="space-y-5">
      {/* Stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>{counts.all} topics</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>{counts.active} active</span>
          <span>{counts.graduated} graduated</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <Plus className="w-3 h-3" /> New Topic
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">New Topic</h3>
            <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Topic name (e.g. Claude Code Remote, Perplexity Computer)"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && createTopic()}
          />
          <textarea
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="What's interesting about this? (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
            style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newSourceUrl}
              onChange={e => setNewSourceUrl(e.target.value)}
              placeholder="Source URL (optional)"
              className="px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <input
              type="text"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
              placeholder="Source name (optional)"
              className="px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] mb-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
              How many posts do you want from this topic?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 10, 20].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNewTargetPosts(n)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={newTargetPosts === n ? {
                    background: 'rgba(245,158,11,0.15)',
                    borderColor: 'rgba(245,158,11,0.3)',
                    color: '#f59e0b',
                  } : {
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                value={newTargetPosts}
                onChange={e => setNewTargetPosts(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 rounded-lg text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={createTopic}
              disabled={!newName.trim() || creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              {creating ? 'Creating...' : 'Create Topic'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'graduated', 'archived'] as const).map(s => {
          const active = statusFilter === s
          const label = s === 'all' ? `All (${counts.all})` :
            `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s]})`
          const cfg = s !== 'all' ? STATUS_CONFIG[s] : null
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`${chipBase} ${active ? 'text-white' : 'text-white/40 hover:text-white/60 border-transparent'}`}
              style={active ? {
                background: cfg?.bg || 'rgba(255,255,255,0.1)',
                borderColor: cfg ? `${cfg.color}30` : 'rgba(255,255,255,0.15)',
                color: cfg?.color || 'white',
              } : {}}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Topics table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading topics...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {topics.length === 0 ? 'No topics yet. Find something interesting!' : 'No topics match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(topic => {
            const cfg = STATUS_CONFIG[topic.status]
            return (
              <div
                key={topic.id}
                className="rounded-xl p-4 transition-all hover:border-white/10 group"
                style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white/90 truncate">{topic.name}</h3>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                      {topic.target_posts > 0 && (
                        <span
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                          style={{
                            color: (topic.idea_count || 0) >= topic.target_posts ? '#22c55e' : 'rgba(255,255,255,0.4)',
                            background: (topic.idea_count || 0) >= topic.target_posts ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <Target className="w-2.5 h-2.5" />
                          {topic.idea_count || 0}/{topic.target_posts}
                        </span>
                      )}
                    </div>
                    {topic.description && (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      {topic.source_name && (
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {topic.source_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(topic.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {topic.source_url && (
                      <a
                        href={topic.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                        title="Open source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </a>
                    )}

                    {(topic.status === 'active' || topic.status === 'graduated') && (
                      <button
                        onClick={() => updateStatus(topic.id, 'archived')}
                        className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    )}

                    {topic.status === 'archived' && (
                      <button
                        onClick={() => updateStatus(topic.id, 'active')}
                        className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                        title="Reactivate"
                      >
                        <RotateCcw className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Delete this topic?')) deleteTopic(topic.id)
                      }}
                      className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
