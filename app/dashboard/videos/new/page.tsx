'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const platforms = [
  { value: 'youtube', label: '▶️ YouTube' },
  { value: 'tiktok', label: '🎵 TikTok' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'twitter', label: '🐦 Twitter/X' },
]

function NewVideoForm() {
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('youtube')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('videos')
      .insert({ title, platform, status: 'in_progress' })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/dashboard/videos/${data.id}`)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
      <Link href="/dashboard/youtube" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to videos
      </Link>

      <div className="card bg-gray-900 border border-white/5 rounded-xl">
        <div className="card-body p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">New Video</h2>
            <p className="text-gray-500 text-sm mt-0.5">Add a video to your content pipeline</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control gap-1.5">
              <label className="label py-0">
                <span className="label-text text-gray-400 text-xs font-medium uppercase tracking-widest">Working Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-sm bg-gray-800 border-white/10 text-white placeholder-gray-600 focus:border-red-500/50 focus:outline-none w-full rounded-lg h-10"
                placeholder="e.g. How I automate my entire YouTube workflow"
                required
                autoFocus
              />
            </div>

            <div className="form-control gap-1.5">
              <label className="label py-0">
                <span className="label-text text-gray-400 text-xs font-medium uppercase tracking-widest">Platform</span>
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="select select-sm bg-gray-800 border-white/10 text-white focus:border-red-500/50 focus:outline-none w-full rounded-lg h-10"
              >
                {platforms.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="alert alert-error alert-soft p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-sm bg-red-600 hover:bg-red-700 border-0 text-white min-w-[120px]"
              >
                {loading ? <span className="loading loading-spinner loading-xs" /> : 'Create Video'}
              </button>
              <Link href="/dashboard/youtube">
                <button type="button" className="btn btn-sm btn-ghost text-gray-500">
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewVideoPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-6 py-8"><div className="h-48 rounded-xl animate-pulse" style={{ background: '#2d2c2a' }} /></div>}>
      <NewVideoForm />
    </Suspense>
  )
}
