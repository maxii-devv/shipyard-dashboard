'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Zap, Settings,
  CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertTriangle,
  BarChart2, Key, Camera, Trash2, Loader2, Sparkles, User, Link2, HelpCircle,
  Save, Youtube, Instagram, Linkedin, Tv, Twitter, LayoutGrid
} from 'lucide-react'
import { useProfilePicture } from '@/components/profile-picture-context'
import { useTour } from '@/components/tour/tour-provider'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConnectionStatus {
  metricool: {
    connected: boolean
    userId: string | null
  }
  openai: {
    connected: boolean
  }
}

type SettingsSection = 'general' | 'profile' | 'integrations' | 'help'

type Platform = 'youtube' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter'

interface ContentTypeOption {
  id: string
  label: string
  description: string
  platform: Platform
}

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" />, color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: '#e1306c', bg: 'rgba(225,48,108,0.15)' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: '#0a66c2', bg: 'rgba(10,102,194,0.15)' },
  { id: 'tiktok', label: 'TikTok', icon: <Tv className="w-4 h-4" />, color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
  { id: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4" />, color: '#1da1f2', bg: 'rgba(29,155,240,0.15)' },
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

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: LayoutGrid },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'help', label: 'Help', icon: HelpCircle },
]

// ─── Connection card ───────────────────────────────────────────────────────────

interface ConnectionCardProps {
  icon: React.ReactNode
  iconBg: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'partial' | 'loading'
  statusLabel?: string
  action?: React.ReactNode
  meta?: React.ReactNode
}

function ConnectionCard({
  icon,
  iconBg,
  name,
  description,
  status,
  statusLabel,
  action,
  meta,
}: ConnectionCardProps) {
  const statusConfig = {
    connected: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: statusLabel ?? 'Connected', Icon: CheckCircle2 },
    disconnected: { color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', label: statusLabel ?? 'Not connected', Icon: XCircle },
    partial: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: statusLabel ?? 'Needs setup', Icon: AlertTriangle },
    loading: { color: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', label: '...', Icon: RefreshCw },
  }

  const cfg = statusConfig[status]

  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-white">{name}</p>
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            <cfg.Icon className={`w-2.5 h-2.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
            {cfg.label}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {description}
        </p>
        {meta && (
          <div className="mt-2">
            {meta}
          </div>
        )}
      </div>

      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

// ─── Action button helpers ─────────────────────────────────────────────────────

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const { startTour } = useTour()

  // General settings
  const [channelName, setChannelName] = useState('')
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedContentTypes, setSelectedContentTypes] = useState<Set<string>>(new Set())
  const [generalLoading, setGeneralLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile picture
  const { url: profileUrl, loading: profileLoading, refresh: refreshProfile } = useProfilePicture()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await fetch('/api/settings/profile-picture', { method: 'POST', body: form })
      refreshProfile()
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await fetch('/api/settings/profile-picture', { method: 'DELETE' })
      refreshProfile()
    } catch (err) {
      console.error('Remove failed:', err)
    } finally {
      setRemoving(false)
    }
  }

  // Fetch general settings
  useEffect(() => {
    setGeneralLoading(true)
    fetch('/api/settings/general')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChannelName(data.channel_name || '')
          setNiche(data.niche || '')
          setSelectedPlatforms(data.platforms || [])
          const ctSet = new Set<string>()
          for (const ct of data.content_types || []) {
            ctSet.add(`${ct.platform}:${ct.content_type}`)
          }
          setSelectedContentTypes(ctSet)
        }
      })
      .catch(() => {})
      .finally(() => setGeneralLoading(false))
  }, [refreshKey])

  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const toggleContentType = (platform: Platform, contentType: string) => {
    const key = `${platform}:${contentType}`
    setSelectedContentTypes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSaveGeneral = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const content_types = Array.from(selectedContentTypes).map(key => {
        const [platform, content_type] = key.split(':')
        return { platform, content_type, preference: 'active' }
      })
      await fetch('/api/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_name: channelName,
          niche,
          platforms: selectedPlatforms,
          content_types,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const metricoolToken = !!process.env.NEXT_PUBLIC_METRICOOL_API_TOKEN
    const openaiKey = !!process.env.NEXT_PUBLIC_OPENAI_CONFIGURED

    setStatus({
      metricool: { connected: metricoolToken, userId: null },
      openai: { connected: false },
    })

    fetch('/api/settings/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStatus(data) })
      .catch(() => {})
  }, [refreshKey])

  const loading = !status

  return (
    <div className="p-8 min-h-screen" style={{ background: '#262624' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Settings className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Manage your integrations and profile
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8">

          {/* Sidebar nav */}
          <nav className="w-56 flex-shrink-0">
            <div
              className="rounded-2xl p-2 sticky top-8"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeSection === id
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">

            {/* ─── General ──────────────────────────────────────────── */}
            {activeSection === 'general' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">General</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Your channel info, niche, platforms, and content types
                </p>

                {generalLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Channel Name & Niche */}
                    <div
                      className="rounded-2xl p-5 space-y-5"
                      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Channel / Brand Name
                        </label>
                        <input
                          type="text"
                          value={channelName}
                          onChange={(e) => setChannelName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/15 focus:outline-none transition-all"
                          style={{ background: '#34332f', border: '1px solid rgba(255,255,255,0.06)' }}
                          onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
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
                          style={{ background: '#34332f', border: '1px solid rgba(255,255,255,0.06)' }}
                          onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
                          placeholder="e.g. Tech reviews, Fitness, Business"
                        />
                      </div>
                    </div>

                    {/* Platforms */}
                    <div
                      className="rounded-2xl p-5"
                      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <label className="text-[10px] uppercase tracking-widest font-semibold block mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Platforms
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {PLATFORMS.map(({ id, label, icon, color, bg }) => {
                          const selected = selectedPlatforms.includes(id)
                          return (
                            <button
                              key={id}
                              onClick={() => togglePlatform(id)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                              style={{
                                background: selected ? bg : '#34332f',
                                border: `1px solid ${selected ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                                color: selected ? color : 'rgba(255,255,255,0.4)',
                              }}
                            >
                              {icon}
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Content Types (only for selected platforms) */}
                    {selectedPlatforms.length > 0 && (
                      <div
                        className="rounded-2xl p-5"
                        style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <label className="text-[10px] uppercase tracking-widest font-semibold block mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Content Types
                        </label>
                        <div className="space-y-4">
                          {selectedPlatforms.map(platformId => {
                            const platform = PLATFORMS.find(p => p.id === platformId)
                            const types = CONTENT_TYPES[platformId] || []
                            if (!platform || types.length === 0) return null
                            return (
                              <div key={platformId}>
                                <p className="text-xs font-semibold mb-2" style={{ color: platform.color }}>
                                  {platform.label}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {types.map(ct => {
                                    const key = `${platformId}:${ct.id}`
                                    const selected = selectedContentTypes.has(key)
                                    return (
                                      <button
                                        key={ct.id}
                                        onClick={() => toggleContentType(platformId, ct.id)}
                                        className="flex flex-col px-3 py-2.5 rounded-xl text-left transition-all"
                                        style={{
                                          background: selected ? platform.bg : '#34332f',
                                          border: `1px solid ${selected ? platform.color + '40' : 'rgba(255,255,255,0.06)'}`,
                                        }}
                                      >
                                        <span className="text-xs font-medium" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                                          {ct.label}
                                        </span>
                                        <span className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                          {ct.description}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Save button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveGeneral}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: saved ? '#10b981' : '#dc2626' }}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Profile ──────────────────────────────────────────── */}
            {activeSection === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Profile</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Manage your profile picture and personal info
                </p>

                <div
                  className="rounded-2xl p-5 flex items-center gap-5"
                  style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="relative group">
                    <div
                      className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: '#1a1a1a', border: '2px solid rgba(255,255,255,0.08)' }}
                    >
                      {uploading || profileLoading ? (
                        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                      ) : profileUrl ? (
                        <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-white/20" />
                      )}
                    </div>
                    {!uploading && !profileLoading && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ background: 'rgba(0,0,0,0.6)' }}
                      >
                        <Camera className="w-5 h-5 text-white/70" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Profile Picture</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Used in feed previews and dashboard
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        {profileUrl ? 'Change' : 'Upload'}
                      </button>
                      {profileUrl && (
                        <button
                          onClick={handleRemove}
                          disabled={removing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.2)' }}
                        >
                          {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </div>
              </div>
            )}

            {/* ─── Integrations ─────────────────────────────────────── */}
            {activeSection === 'integrations' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Integrations</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Connect external services and API keys
                </p>

                <div className="space-y-3">
                  {/* Metricool */}
                  <ConnectionCard
                    icon={<BarChart2 className="w-5 h-5 text-white" />}
                    iconBg="rgba(139,92,246,0.2)"
                    name="Metricool"
                    description="Powers social media scheduling and analytics. All social platform data flows through your Metricool account."
                    status={loading ? 'loading' : status.metricool.connected ? 'connected' : 'disconnected'}
                    statusLabel={
                      loading ? undefined :
                      status.metricool.connected ? `User ID: ${status.metricool.userId}` : 'No API token'
                    }
                    meta={
                      !loading && !status?.metricool.connected ? (
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Add <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>METRICOOL_API_TOKEN</code> and <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>METRICOOL_USER_ID</code> to .env.local
                        </p>
                      ) : null
                    }
                    action={
                      !loading && !status?.metricool.connected ? (
                        <a
                          href="https://metricool.com/app/settings/api"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                          style={{ background: '#7c3aed' }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Get token
                        </a>
                      ) : undefined
                    }
                  />

                  {/* OpenAI */}
                  <ConnectionCard
                    icon={<Zap className="w-5 h-5 text-white" />}
                    iconBg="rgba(16,185,129,0.2)"
                    name="OpenAI"
                    description="Used for AI-generated thumbnails (DALL-E 3), content ideas, and AI features."
                    status={loading ? 'loading' : status.openai.connected ? 'connected' : 'disconnected'}
                    meta={
                      !loading && !status?.openai.connected ? (
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Add <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>OPENAI_API_KEY</code> to .env.local
                        </p>
                      ) : null
                    }
                    action={
                      !loading && !status?.openai.connected ? (
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                          style={{ background: '#10b981' }}
                        >
                          <Key className="w-3 h-3" />
                          Get key
                        </a>
                      ) : undefined
                    }
                  />
                </div>

              </div>
            )}

            {/* ─── Help ─────────────────────────────────────────────── */}
            {activeSection === 'help' && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Help</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Get started and learn about dashboard features
                </p>

                <div
                  className="rounded-2xl p-5 flex items-center gap-4"
                  style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)' }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: '#F59E0B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Guided Tour</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Let Claude walk you through the dashboard features
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('shipyard_start_tour', 'true')
                      window.location.href = '/dashboard'
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-80"
                    style={{ background: '#F59E0B' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Take Tour
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
