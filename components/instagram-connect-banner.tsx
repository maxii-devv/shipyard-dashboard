'use client'

import { useEffect, useState } from 'react'

// Top-of-dashboard strip that surfaces the Instagram connection state.
//
// - Disconnected / invalid token  → red strip + "Connect Instagram" button
//   that sends izan through the OAuth flow (/api/instagram/connect).
// - Just came back ?ig=connected  → green confirmation strip.
// - ?ig=error                      → red strip with the reason.
// - Connected and healthy          → renders nothing.

type Status = {
  loading: boolean
  connected: boolean
  present?: boolean
  username?: string | null
  error?: string | null
}

export function InstagramConnectBanner() {
  const [status, setStatus] = useState<Status>({ loading: true, connected: true })
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Read the ?ig= result the callback redirected us back with, then strip it
  // from the URL so a refresh doesn't replay the toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ig = params.get('ig')
    if (ig === 'connected') {
      const user = params.get('user')
      setFlash({ kind: 'ok', msg: `Instagram connected${user ? ` as @${user}` : ''}. Syncing will resume.` })
    } else if (ig === 'error') {
      setFlash({ kind: 'err', msg: `Couldn't connect Instagram: ${params.get('reason') || 'unknown error'}` })
    }
    if (ig) {
      params.delete('ig')
      params.delete('user')
      params.delete('reason')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/instagram/status')
      .then((r) => r.json())
      .then((d) => {
        if (alive) setStatus({ loading: false, connected: !!d.connected, present: d.present, username: d.username, error: d.error })
      })
      .catch(() => {
        if (alive) setStatus({ loading: false, connected: true }) // fail open — don't nag on a transient fetch error
      })
    return () => {
      alive = false
    }
  }, [])

  const disconnected = !status.loading && !status.connected

  if (!flash && !disconnected) return null

  return (
    <div style={{ padding: '12px 24px 0' }}>
      {flash && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 14px',
            marginBottom: disconnected ? 8 : 0,
            borderRadius: 10,
            fontSize: 13,
            background: flash.kind === 'ok' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${flash.kind === 'ok' ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`,
            color: flash.kind === 'ok' ? '#34d399' : '#f87171',
          }}
        >
          <span>{flash.msg}</span>
          <button
            onClick={() => setFlash(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {disconnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.30)',
          }}
        >
          <div style={{ fontSize: 13, color: '#fca5a5', minWidth: 0 }}>
            <strong style={{ color: '#f87171' }}>Instagram disconnected</strong>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>
              {' '}— performance data isn’t syncing.
              {status.error ? ` (${status.error})` : ''} Reconnect to resume.
            </span>
          </div>
          <a
            href="/api/instagram/connect"
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              color: '#0b0b0b',
              background: 'linear-gradient(135deg,#f59e0b,#f97316)',
              boxShadow: '0 0 14px rgba(245,158,11,0.30)',
            }}
          >
            Connect Instagram
          </a>
        </div>
      )}
    </div>
  )
}
