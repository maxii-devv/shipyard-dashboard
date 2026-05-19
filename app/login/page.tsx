'use client'

// Simple password gate. Posts to /api/login; on success the session cookie is
// set and the user is bounced to ?next= (or /dashboard).
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Login failed')
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="22" x2="12" y2="8" />
              <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Shipyard</h1>
          <p className="text-gray-500 text-sm mt-1">Content OS</p>
        </div>
        <div className="card bg-gray-900 border border-white/5 rounded-xl">
          <div className="card-body p-6 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control gap-1.5">
                <label className="label py-0">
                  <span className="label-text text-gray-500 text-xs uppercase tracking-widest font-medium">Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input input-sm bg-gray-800 border-white/10 text-white placeholder-gray-600 focus:border-red-500/50 focus:outline-none w-full rounded-lg h-10"
                  placeholder="••••••••"
                  autoFocus
                  required
                />
              </div>
              {error && (
                <div className="alert alert-error alert-soft p-3 rounded-lg text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-sm w-full bg-red-600 hover:bg-red-700 border-0 text-white h-10"
              >
                {loading ? <span className="loading loading-spinner loading-xs" /> : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
