'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { Save, Check, Maximize2 } from 'lucide-react'

interface ExcalidrawEmbedProps {
  videoId: string
  initialData: Record<string, unknown> | null
  fullScreen?: boolean
}

export function ExcalidrawEmbed({ videoId, initialData, fullScreen = false }: ExcalidrawEmbedProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')

  const save = useCallback(async (elements: readonly any[], appState: any) => {
    const payload = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } }
    const serialized = JSON.stringify(payload)

    // Skip if nothing changed
    if (serialized === lastSaved.current) return

    setSaveStatus('saving')
    try {
      await fetch(`/api/videos/${videoId}/excalidraw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excalidraw_data: payload }),
      })
      lastSaved.current = serialized
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('idle')
    }
  }, [videoId])

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(elements, appState), 2000)
  }, [save])

  // Initialize lastSaved with initial data
  useEffect(() => {
    if (initialData) {
      lastSaved.current = JSON.stringify(initialData)
    }
  }, [])

  return (
    <div className="relative w-full h-full" style={{ minHeight: fullScreen ? 'calc(100vh - 48px)' : 500 }}>
      <Excalidraw
        initialData={initialData ? {
          elements: (initialData as any).elements ?? [],
          appState: {
            ...((initialData as any).appState ?? {}),
            viewBackgroundColor: '#262624',
          },
        } : { appState: { viewBackgroundColor: '#262624' } }}
        theme="dark"
        onChange={handleChange}
      />

      {/* Save indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)' }}>
            <Save className="w-3 h-3 animate-pulse" /> Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)', color: '#34d399' }}>
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
        {!fullScreen && (
          <a
            href={`/dashboard/videos/${videoId}/diagram`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm transition-colors hover:bg-white/10"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)' }}
          >
            <Maximize2 className="w-3 h-3" /> Open full screen
          </a>
        )}
      </div>
    </div>
  )
}
