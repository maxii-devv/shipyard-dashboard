'use client'

// Second-factor gate. Reached after the password when REQUIRE_IG_IDENTITY=1
// and the visitor has no (or an expired) ig_identity cookie. The visitor must
// sign in with an allowlisted Instagram account; on success the callback sets
// the identity cookie and we continue to ?next= (or /dashboard).
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Same allowlist as the login page: only same-origin relative paths.
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/')) return '/dashboard'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  if (raw.startsWith('/login') || raw.startsWith('/verify')) return '/dashboard'
  if (/[\x00-\x1f]/.test(raw)) return '/dashboard'
  return raw
}

function VerifyInner() {
  const router = useRouter()
  const search = useSearchParams()
  const next = safeNext(search.get('next'))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  // Result coming back from the popup window.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; mode?: string; ok?: boolean; user?: string; reason?: string } | null
      if (!d || d.type !== 'ig-oauth' || d.mode !== 'login') return
      setPending(false)
      if (d.ok) {
        router.push(next)
        router.refresh()
      } else if (d.reason === 'not_allowed') {
        setError(`@${d.user || 'that account'} isn’t allowed to access this dashboard.`)
      } else {
        setError(`Couldn’t verify Instagram: ${d.reason || 'unknown error'}`)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [router, next])

  // Fallback path: popup was blocked → full-page redirect bounced us back to
  // /verify?ig=error&reason=… — surface it and strip the params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ig') === 'error') {
      const reason = params.get('reason')
      setError(reason === 'not_allowed' ? 'That account isn’t allowed to access this dashboard.' : `Couldn’t verify Instagram: ${reason || 'unknown error'}`)
      params.delete('ig')
      params.delete('reason')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
  }, [])

  const verify = useCallback(() => {
    setError('')
    setPending(true)
    const w = 600
    const h = 760
    const dualLeft = window.screenLeft ?? window.screenX ?? 0
    const dualTop = window.screenTop ?? window.screenY ?? 0
    const vw = window.innerWidth || document.documentElement.clientWidth || screen.width
    const vh = window.innerHeight || document.documentElement.clientHeight || screen.height
    const left = Math.max(0, dualLeft + (vw - w) / 2)
    const top = Math.max(0, dualTop + (vh - h) / 2)
    const popup = window.open(
      '/api/instagram/connect?mode=login',
      'ig_identity_login',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    )
    if (!popup) {
      // Popup blocked — fall back to a full-page redirect through the same flow.
      window.location.href = '/api/instagram/connect?mode=login'
      return
    }
    popup.focus()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden mx-auto"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#1c1b1a' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/izan-logo.avif" alt="" width={56} height={56} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="card bg-gray-900 border border-white/5 rounded-xl">
          <div className="card-body p-6 space-y-4">
            <div className="space-y-1 text-center">
              <h1 className="text-white text-sm font-semibold">Confirm your Instagram</h1>
              <p className="text-gray-500 text-xs leading-relaxed">
                Sign in with your Instagram account to continue. Only authorized accounts can access this dashboard.
              </p>
            </div>
            {error && <div className="alert alert-error alert-soft p-3 rounded-lg text-sm">{error}</div>}
            <button
              type="button"
              onClick={verify}
              disabled={pending}
              className="btn btn-sm w-full border-0 text-white h-10"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}
            >
              {pending ? <span className="loading loading-spinner loading-xs" /> : 'Continue with Instagram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  )
}
