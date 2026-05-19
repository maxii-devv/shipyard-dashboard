'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Youtube, Instagram, Linkedin, Loader2,
} from 'lucide-react'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', icon: Youtube, color: '#dc2626', placeholder: '@channelname' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#e1306c', placeholder: '@username' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0077b5', placeholder: 'company-slug or @name' },
]

export default function NewCompetitorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [isFriend, setIsFriend] = useState(false)
  const [handles, setHandles] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slugify(name.trim()),
          niche: niche.trim() || null,
          is_friend: isFriend,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create competitor')
      }

      const competitor = await res.json()

      // Add social handles if provided
      const socialPromises = Object.entries(handles)
        .filter(([, handle]) => handle.trim())
        .map(([platform, handle]) =>
          fetch(`/api/competitors/${competitor.id}/socials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform,
              handle: handle.trim().replace(/^@/, ''),
            }),
          })
        )

      await Promise.allSettled(socialPromises)

      router.push('/dashboard/competitors')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ background: '#262624' }}>
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard/competitors"
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Competitors
        </Link>

        <h1 className="text-xl font-bold text-white mb-1">Add Competitor</h1>
        <p className="text-xs text-white/35 mb-8">
          Track another creator in your niche
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Creator or brand name"
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Niche */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Tech reviews, Personal finance"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20"
              style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Social handles */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Social Handles</label>
            <div className="space-y-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${p.color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: p.color }} />
                    </div>
                    <input
                      type="text"
                      value={handles[p.key] || ''}
                      onChange={e => setHandles(prev => ({ ...prev, [p.key]: e.target.value }))}
                      placeholder={p.placeholder}
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20"
                      style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-white/20 mt-1.5">
              Add at least one handle so we can start tracking
            </p>
          </div>

          {/* Friend toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isFriend}
              onChange={e => setIsFriend(e.target.checked)}
              className="w-4 h-4 rounded accent-green-500"
            />
            <span className="text-sm text-white/60">Mark as friend (non-competitive)</span>
          </label>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-4 py-2.5 text-xs"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Adding...' : 'Add Competitor'}
          </button>
        </form>
      </div>
    </div>
  )
}
