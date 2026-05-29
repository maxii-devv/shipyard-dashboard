'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Top-of-dashboard strip that surfaces the Instagram connection state.
//
// - Disconnected / invalid token  → red strip + "Connect Instagram" button
//   that opens the OAuth flow in a popup window (like "Sign in with …").
// - Popup finishes                → it postMessages the result back here, the
//   banner shows a toast and re-checks status — the dashboard never reloads.
// - Popup blocked                 → falls back to a full-page redirect, and the
//   ?ig= query param the callback adds is read on return (handled below).
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
  const popupRef = useRef<Window | null>(null)

  const refreshStatus = useCallback(() => {
    fetch('/api/instagram/status')
      .then((r) => r.json())
      .then((d) => {
        setStatus({ loading: false, connected: !!d.connected, present: d.present, username: d.username, error: d.error })
      })
      .catch(() => setStatus((s) => ({ ...s, loading: false }))) // fail open — don't nag on a transient fetch error
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Result coming back from the popup window.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; ok?: boolean; user?: string; reason?: string } | null
      if (!d || d.type !== 'ig-oauth') return
      if (d.ok) {
        setFlash({ kind: 'ok', msg: `Instagram connected${d.user ? ` as @${d.user}` : ''}. Syncing will resume.` })
      } else {
        setFlash({ kind: 'err', msg: `Couldn't connect Instagram: ${d.reason || 'unknown error'}` })
      }
      refreshStatus()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refreshStatus])

  // Fallback path: if the popup was blocked we did a full-page redirect, and the
  // callback bounced us back to /dashboard?ig=… — read it, then strip it so a
  // refresh doesn't replay the toast.
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

  // Open the OAuth flow in a centered popup. If the browser blocks it, fall
  // back to a normal full-page navigation so the flow still works.
  const connect = useCallback(() => {
    const w = 600
    const h = 760
    const dualLeft = window.screenLeft ?? window.screenX ?? 0
    const dualTop = window.screenTop ?? window.screenY ?? 0
    const vw = window.innerWidth || document.documentElement.clientWidth || screen.width
    const vh = window.innerHeight || document.documentElement.clientHeight || screen.height
    const left = Math.max(0, dualLeft + (vw - w) / 2)
    const top = Math.max(0, dualTop + (vh - h) / 2)

    const popup = window.open(
      '/api/instagram/connect',
      'ig_oauth_connect',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`
    )
    if (!popup) {
      window.location.href = '/api/instagram/connect'
      return
    }
    popupRef.current = popup
    popup.focus()
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
          <button
            onClick={connect}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              color: '#0b0b0b',
              background: 'linear-gradient(135deg,#f59e0b,#f97316)',
              boxShadow: '0 0 14px rgba(245,158,11,0.30)',
            }}
          >
            Connect Instagram
          </button>
        </div>
      )}
    </div>
  )
}
