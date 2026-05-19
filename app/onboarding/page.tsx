'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, ArrowLeft, Check, Youtube, Instagram, Linkedin,
  Twitter, Tv, Camera, Loader2, Sparkles, Upload,
  Ship, Anchor, Plus, X, Rss, Globe
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

type Platform = 'youtube' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter'

interface ContentTypeOption {
  id: string
  label: string
  description: string
  platform: Platform
}

interface NewsSource {
  id: string
  name: string
  source_type: 'rss' | 'reddit'
  url: string
  color: string
}

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-5 h-5" />, color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-5 h-5" />, color: '#e1306c', bg: 'rgba(225,48,108,0.15)' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-5 h-5" />, color: '#0a66c2', bg: 'rgba(10,102,194,0.15)' },
  { id: 'tiktok', label: 'TikTok', icon: <Tv className="w-5 h-5" />, color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
  { id: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-5 h-5" />, color: '#1da1f2', bg: 'rgba(29,155,240,0.15)' },
]

const CONTENT_TYPES: Record<Platform, ContentTypeOption[]> = {
  youtube: [
    { id: 'long_form', label: 'Long-form Videos', description: 'Tutorials, vlogs, deep dives', platform: 'youtube' },
    { id: 'shorts', label: 'Shorts', description: 'Under 60 second clips', platform: 'youtube' },
    { id: 'livestreams', label: 'Livestreams', description: 'Live content and Q&As', platform: 'youtube' },
  ],
  instagram: [
    { id: 'reels', label: 'Reels', description: 'Short-form vertical video', platform: 'instagram' },
    { id: 'carousels', label: 'Carousels', description: 'Multi-slide educational content', platform: 'instagram' },
    { id: 'stories', label: 'Stories', description: '24hr ephemeral content', platform: 'instagram' },
    { id: 'posts', label: 'Posts', description: 'Static image or video posts', platform: 'instagram' },
  ],
  linkedin: [
    { id: 'posts', label: 'Posts', description: 'Text + media updates', platform: 'linkedin' },
    { id: 'articles', label: 'Articles', description: 'Long-form professional content', platform: 'linkedin' },
    { id: 'carousels', label: 'Carousels', description: 'Document-style slide decks', platform: 'linkedin' },
  ],
  tiktok: [
    { id: 'videos', label: 'Videos', description: 'Short-form content', platform: 'tiktok' },
    { id: 'stories', label: 'Stories', description: 'Ephemeral updates', platform: 'tiktok' },
  ],
  twitter: [
    { id: 'tweets', label: 'Tweets', description: 'Short text updates', platform: 'twitter' },
    { id: 'threads', label: 'Threads', description: 'Multi-tweet deep dives', platform: 'twitter' },
  ],
}

// ─── Shared animation variants ──────────────────────────────────────────────────

const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const itemFade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

// ─── Step Components ────────────────────────────────────────────────────────────

function StepWelcome({
  channelName,
  setChannelName,
  niche,
  setNiche,
  profilePicture,
  onUploadPicture,
  uploading,
}: {
  channelName: string
  setChannelName: (v: string) => void
  niche: string
  setNiche: (v: string) => void
  profilePicture: string | null
  onUploadPicture: (file: File) => void
  uploading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <motion.div className="space-y-8" variants={stagger} initial="initial" animate="animate">
      <motion.div className="text-center" variants={itemFade}>
        <motion.div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        >
          <Anchor className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Shipyard</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Your content OS. Let&apos;s set up your workspace.
        </p>
      </motion.div>

      <motion.div className="flex justify-center" variants={itemFade}>
        <div className="relative group">
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
            style={{ background: '#34332f', border: '2px solid rgba(255,255,255,0.08)' }}
            onClick={() => fileRef.current?.click()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            ) : profilePicture ? (
              <motion.img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <Upload className="w-6 h-6 text-white/20" />
            )}
          </motion.div>
          <motion.button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#dc2626', border: '2px solid #262624' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadPicture(file)
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
        </div>
      </motion.div>

      <motion.div className="space-y-5" variants={itemFade}>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Channel / Brand Name
          </label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/15 focus:outline-none transition-all"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(220,38,38,0.4)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
            placeholder="e.g. My Channel"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Content Niche
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/15 focus:outline-none transition-all"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(220,38,38,0.4)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
            placeholder="e.g. Tech reviews, Fitness, Business"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function StepPlatforms({
  selected,
  onToggle,
}: {
  selected: Platform[]
  onToggle: (p: Platform) => void
}) {
  return (
    <motion.div className="space-y-8" variants={stagger} initial="initial" animate="animate">
      <motion.div className="text-center" variants={itemFade}>
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Platforms</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Where do you publish content? You can change this later.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-2.5">
        {PLATFORMS.map((p, i) => {
          const isSelected = selected.includes(p.id)
          return (
            <motion.button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-colors"
              style={{
                background: isSelected ? 'rgba(220,38,38,0.06)' : '#2d2c2a',
                border: isSelected ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(255,255,255,0.05)',
              }}
              variants={itemFade}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: p.bg }}
              >
                <span style={{ color: p.color }}>{p.icon}</span>
              </div>
              <span className="text-sm font-semibold text-white flex-1">{p.label}</span>
              <motion.div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isSelected ? '#dc2626' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
                animate={{ scale: isSelected ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

function StepContentTypes({
  platforms,
  selectedTypes,
  onToggle,
}: {
  platforms: Platform[]
  selectedTypes: Set<string>
  onToggle: (key: string) => void
}) {
  return (
    <motion.div className="space-y-8" variants={stagger} initial="initial" animate="animate">
      <motion.div className="text-center" variants={itemFade}>
        <h2 className="text-2xl font-bold text-white mb-2">Content Types</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          What formats do you create?
        </p>
      </motion.div>

      <div className="space-y-6">
        {platforms.map((platformId) => {
          const platform = PLATFORMS.find((p) => p.id === platformId)!
          const types = CONTENT_TYPES[platformId]
          return (
            <motion.div key={platformId} variants={itemFade}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: platform.color }}>{platform.icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {platform.label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {types.map((ct) => {
                  const key = `${ct.platform}:${ct.id}`
                  const isSelected = selectedTypes.has(key)
                  return (
                    <motion.button
                      key={key}
                      onClick={() => onToggle(key)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                      style={{
                        background: isSelected ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(255,255,255,0.04)',
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{ct.label}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{ct.description}</p>
                      </div>
                      <motion.div
                        className="w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isSelected ? '#dc2626' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          width: 18, height: 18,
                        }}
                        animate={{ scale: isSelected ? [1, 1.15, 1] : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </motion.div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function DiscoverTerminal({ log, discovering }: {
  log: { type: string; text?: string; query?: string; title?: string; url?: string }[]
  discovering: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log])

  return (
    <div
      className="rounded-xl overflow-hidden font-mono text-[11px] leading-relaxed"
      style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <span className="text-[10px] ml-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          discovering sources
        </span>
        {discovering && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Terminal content */}
      <div ref={scrollRef} className="px-3 py-2.5 max-h-[280px] overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {log.map((entry, i) => {
          if (entry.type === 'status') {
            return (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span style={{ color: '#22c55e' }}>{'>'}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{entry.text}</span>
              </motion.div>
            )
          }
          if (entry.type === 'tool_start') {
            return (
              <motion.div
                key={i}
                className="flex items-start gap-2 mt-1"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span style={{ color: '#dc2626' }}>$</span>
                <div>
                  <span style={{ color: '#f59e0b' }}>web_search</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>{' '}&quot;</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.query}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>&quot;</span>
                </div>
              </motion.div>
            )
          }
          if (entry.type === 'search_result') {
            return (
              <motion.div
                key={i}
                className="flex items-start gap-2 pl-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                <span style={{ color: 'rgba(255,255,255,0.12)' }}>{'  '}|</span>
                <span className="truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{entry.title}</span>
              </motion.div>
            )
          }
          if (entry.type === 'text') {
            return (
              <motion.div
                key={i}
                className="mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{entry.text}</span>
              </motion.div>
            )
          }
          return null
        })}
        {discovering && (
          <motion.span
            className="inline-block w-1.5 h-3 ml-0.5"
            style={{ background: 'rgba(255,255,255,0.5)' }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}

function StepNewsSources({
  sources,
  onRemoveSource,
  onAddSource,
  discovering,
  discoverError,
  discoverLog,
  onRetryDiscover,
}: {
  sources: NewsSource[]
  onRemoveSource: (id: string) => void
  onAddSource: (source: NewsSource) => void
  discovering: boolean
  discoverError: string | null
  discoverLog: { type: string; text?: string; query?: string; title?: string; url?: string }[]
  onRetryDiscover: () => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState<'rss' | 'reddit'>('rss')
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')

  const RANDOM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b']

  const handleAdd = () => {
    if (!addName.trim() || !addUrl.trim()) return
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]
    onAddSource({
      id: `custom-${Date.now()}`,
      name: addName.trim(),
      source_type: addType,
      url: addUrl.trim(),
      color,
    })
    setAddName('')
    setAddUrl('')
    setShowAddForm(false)
  }

  if (discovering || (discoverLog.length > 0 && sources.length === 0 && !discoverError)) {
    return (
      <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Discovering Sources</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            AI is searching the web for feeds and subreddits in your niche
          </p>
        </div>
        <DiscoverTerminal log={discoverLog} discovering={discovering} />
      </motion.div>
    )
  }

  return (
    <motion.div className="space-y-5" variants={stagger} initial="initial" animate="animate">
      <motion.div className="text-center" variants={itemFade}>
        <h2 className="text-xl font-bold text-white mb-1">Your News Sources</h2>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {sources.length > 0
            ? 'Remove any you don\'t want, or add your own.'
            : 'Add RSS feeds and subreddits to build your news feed.'}
        </p>
      </motion.div>

      {discoverError && (
        <motion.div
          className="rounded-xl p-3 text-center space-y-1.5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          variants={itemFade}
        >
          <p className="text-[11px] text-red-400">{discoverError}</p>
          <button onClick={onRetryDiscover} className="text-[11px] font-medium text-red-400 underline hover:no-underline">
            Try again
          </button>
        </motion.div>
      )}

      {/* Source list */}
      {sources.length > 0 && (
        <motion.div className="space-y-1.5 max-h-[240px] overflow-y-auto" variants={itemFade}>
          {sources.map((source) => (
            <motion.div
              key={source.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg group"
              style={{ background: `${source.color}08`, border: `1px solid ${source.color}20` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: source.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-white/80 block truncate">{source.name}</span>
                <span className="text-[10px] block truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
                onClick={() => onRemoveSource(source.id)}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5"
              >
                <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add source */}
      {showAddForm ? (
        <motion.div
          className="rounded-xl p-3.5 space-y-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
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
              <Rss className="w-3 h-3" /> RSS
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
            placeholder={addType === 'rss' ? 'Source name' : 'Display name (e.g. r/webdev)'}
            value={addName}
            onChange={e => setAddName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <input
            type="text"
            placeholder={addType === 'rss' ? 'Feed URL' : 'Subreddit name (e.g. webdev)'}
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
              onClick={handleAdd}
              disabled={!addName.trim() || !addUrl.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-30"
              style={{ background: '#dc2626' }}
            >
              Add
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all hover:border-white/10"
          style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
          variants={itemFade}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-3.5 h-3.5" /> Add source manually
        </motion.button>
      )}

      {sources.length > 0 && (
        <motion.p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {sources.length} source{sources.length !== 1 ? 's' : ''} — change anytime from the News page
        </motion.p>
      )}
    </motion.div>
  )
}

function StepComplete({ channelName }: { channelName: string }) {
  const items = [
    'Manage your content pipeline end-to-end',
    'Create and schedule across platforms',
    'Track competitors and discover trends',
    'AI-assisted scripts, titles, and thumbnails',
  ]

  return (
    <motion.div
      className="text-center space-y-8 py-6"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      <motion.div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.15)' }}
        variants={itemFade}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <Ship className="w-9 h-9 text-emerald-400" />
      </motion.div>
      <motion.div variants={itemFade}>
        <h2 className="text-2xl font-bold text-white mb-2">Ready to Ship</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {channelName
            ? `${channelName}'s shipyard is ready.`
            : 'Your shipyard is ready.'}
        </p>
      </motion.div>
      <div className="space-y-2.5 text-left max-w-sm mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item}
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            variants={itemFade}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{item}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

const STEPS = ['Welcome', 'Platforms', 'Content', 'News', 'Done']

const STORAGE_KEY = 'shipyard_onboarding'

export default function OnboardingPage() {
  const router = useRouter()
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)

  // Restore state from sessionStorage (survives OAuth redirects)
  const getInitial = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (key in parsed) return parsed[key]
      }
    } catch {}
    return fallback
  }

  const [step, setStep] = useState(() => {
    // Check URL param first (from OAuth redirect), then sessionStorage
    const urlStep = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('step') : null
    if (urlStep) return parseInt(urlStep, 10)
    return getInitial('step', 0)
  })

  // Step 1
  const [channelName, setChannelName] = useState(() => getInitial('channelName', ''))
  const [niche, setNiche] = useState(() => getInitial('niche', ''))
  const [profilePicture, setProfilePicture] = useState<string | null>(() => getInitial('profilePicture', null))
  const [uploading, setUploading] = useState(false)

  // Step 2
  const [platforms, setPlatforms] = useState<Platform[]>(() => getInitial('platforms', []))

  // Step 3
  const [contentTypes, setContentTypes] = useState<Set<string>>(() => new Set(getInitial<string[]>('contentTypes', [])))

  // Step 4
  const [newsSources, setNewsSources] = useState<NewsSource[]>([])
  const [discoveringNews, setDiscoveringNews] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [discoverLog, setDiscoverLog] = useState<{ type: string; text?: string; query?: string; title?: string; url?: string }[]>([])
  const newsSourcesLoaded = useRef(false)

  // Persist onboarding state to sessionStorage
  const saveState = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step,
        channelName,
        niche,
        profilePicture,
        platforms,
        contentTypes: Array.from(contentTypes),
      }))
    } catch {}
  }, [step, channelName, niche, profilePicture, platforms, contentTypes])

  useEffect(() => { saveState() }, [saveState])

  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((d) => { if (d.completed) router.replace('/dashboard') })
      .catch(() => {})
  }, [router])

  const discoverNewsSources = useCallback(async () => {
    if (!niche.trim()) return
    setDiscoveringNews(true)
    setDiscoverError(null)
    setDiscoverLog([])
    try {
      const res = await fetch('/api/news/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: niche.trim() }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.type === 'done') {
              if (event.sources?.length > 0) {
                setNewsSources(event.sources)
              } else {
                setDiscoverError('No sources found. Try adding some manually.')
              }
              setDiscoveringNews(false)
              return
            } else if (event.type === 'error') {
              setDiscoverError(event.text)
              setDiscoveringNews(false)
              return
            } else {
              setDiscoverLog((prev) => [...prev, event])
            }
          } catch {}
        }
      }
      setDiscoveringNews(false)
    } catch {
      setDiscoverError('Failed to discover sources. Try adding some manually.')
      setDiscoveringNews(false)
    }
  }, [niche])

  useEffect(() => {
    if (step === 3 && !newsSourcesLoaded.current) {
      newsSourcesLoaded.current = true
      fetch('/api/news/preferences')
        .then((r) => r.json())
        .then((data) => {
          if (data.sources?.length > 0) {
            setNewsSources(data.sources)
          } else if (niche.trim()) {
            discoverNewsSources()
          }
        })
        .catch(() => {
          if (niche.trim()) discoverNewsSources()
        })
    }
  }, [step, niche, discoverNewsSources])

  const handleUploadPicture = async (file: File) => {
    setUploading(true)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const size = Math.min(bitmap.width, bitmap.height, 400)
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const sx = (bitmap.width - size) / 2
      const sy = (bitmap.height - size) / 2
      ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size)
      setProfilePicture(canvas.toDataURL('image/jpeg', 0.85))
      bitmap.close()
    } catch {
      setProfilePicture(URL.createObjectURL(file))
    }
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/settings/profile-picture', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) setProfilePicture(data.url)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  const toggleContentType = (key: string) => {
    setContentTypes((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const removeNewsSource = (id: string) => {
    setNewsSources((prev) => prev.filter((s) => s.id !== id))
  }

  const addNewsSource = (source: NewsSource) => {
    setNewsSources((prev) => [...prev, source])
  }

  const goNext = () => { setDirection(1); setStep((s) => s + 1) }
  const goBack = () => { setDirection(-1); setStep((s) => s - 1) }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const ct = Array.from(contentTypes).map((key) => {
        const [platform, content_type] = key.split(':')
        return { platform, content_type, preference: 'Enabled during onboarding' }
      })
      await Promise.all([
        fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel_name: channelName, niche, platforms, content_types: ct }),
        }),
        newsSources.length > 0
          ? fetch('/api/news/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sources: newsSources }),
            })
          : Promise.resolve(),
      ])
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.setItem('shipyard_start_tour', 'true')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Failed to save onboarding:', err)
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return platforms.length > 0
    if (step === 3) return newsSources.length > 0
    return true
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1c1b1a' }}>
      <div className="w-full max-w-lg mx-auto px-6 py-12">

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s}
              className="h-1 rounded-full flex-1"
              initial={false}
              animate={{
                background: i <= step ? '#dc2626' : 'rgba(255,255,255,0.05)',
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Step label */}
        <div className="flex items-center justify-between mb-6">
          <motion.span
            key={step}
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            initial={{ opacity: 0, x: direction > 0 ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {STEPS[step]}
          </motion.span>
          <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.15)' }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Step content with AnimatePresence */}
        <div className="min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {step === 0 && (
                <StepWelcome
                  channelName={channelName} setChannelName={setChannelName}
                  niche={niche} setNiche={setNiche}
                  profilePicture={profilePicture}
                  onUploadPicture={handleUploadPicture}
                  uploading={uploading}
                />
              )}
              {step === 1 && <StepPlatforms selected={platforms} onToggle={togglePlatform} />}
              {step === 2 && <StepContentTypes platforms={platforms} selectedTypes={contentTypes} onToggle={toggleContentType} />}
              {step === 3 && (
                <StepNewsSources
                  sources={newsSources}
                  onRemoveSource={removeNewsSource}
                  onAddSource={addNewsSource}
                  discovering={discoveringNews}
                  discoverError={discoverError}
                  discoverLog={discoverLog}
                  onRetryDiscover={() => { newsSourcesLoaded.current = false; discoverNewsSources() }}
                />
              )}
              {step === 4 && <StepComplete channelName={channelName} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <motion.div
          className="flex items-center justify-between mt-8 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          layout
        >
          {step > 0 ? (
            <motion.button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </motion.button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <motion.button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ship className="w-4 h-4" />}
              Launch Shipyard
            </motion.button>
          ) : (
            <div className="flex items-center gap-2">
              {step === 3 && (
                <motion.button
                  onClick={goNext}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  whileHover={{ opacity: 0.7 }}
                >
                  Skip
                </motion.button>
              )}
              <motion.button
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-20"
                style={{ background: canProceed() ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#dc2626' }}
                whileHover={canProceed() ? { scale: 1.02 } : {}}
                whileTap={canProceed() ? { scale: 0.98 } : {}}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
