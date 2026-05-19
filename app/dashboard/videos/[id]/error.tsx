'use client'

import { useEffect } from 'react'

export default function VideoPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Video page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#262624' }}>
      <div className="max-w-lg w-full mx-4 rounded-xl p-6 space-y-4" style={{ background: '#2d2c2a', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <h2 className="text-sm font-semibold text-white/80">Video page failed to load</h2>
        </div>
        <p className="text-xs font-mono text-red-400/80 break-all">
          {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="text-[10px] text-white/20 font-mono">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
