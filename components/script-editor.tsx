'use client'

import { useCallback, useRef, useState } from 'react'
import { AlignLeft, Clock } from 'lucide-react'

interface ScriptEditorProps {
  initialContent: string | null
  assetId: string
  readOnly?: boolean
  onContentChange?: (text: string) => void
}

/** Strip Tiptap JSON to plain text if needed */
function toPlainText(raw: string | null): string {
  if (!raw?.trim()) return ''
  try {
    if (raw.trim().startsWith('{')) {
      const json = JSON.parse(raw)
      const extractText = (node: any): string => {
        if (node.type === 'text') return node.text || ''
        if (node.type === 'hardBreak') return '\n'
        if (node.content) return node.content.map(extractText).join('')
        return ''
      }
      if (json.content) {
        return json.content.map((block: any) => extractText(block)).join('\n\n').trim()
      }
    }
  } catch {}
  return raw
}

function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay]) // eslint-disable-line react-hooks/exhaustive-deps
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function ScriptEditor({ initialContent, assetId, readOnly = false, onContentChange }: ScriptEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [body, setBody] = useState(() => toPlainText(initialContent))

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
  const estMinutes = Math.ceil(wordCount / 150)

  const doSave = useCallback(async (text: string) => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
    } catch {
      setSaveError('Auto-save failed')
      setSaveStatus('unsaved')
    }
  }, [assetId])

  const debouncedSave = useDebounce(doSave, 1500)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#1c1b1a' }}>
      {/* Toolbar / stats bar */}
      {!readOnly && (
        <div
          className="flex items-center gap-3 px-4 py-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#262624' }}
        >
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <AlignLeft className="w-3 h-3" />
            {wordCount.toLocaleString()} words
          </span>
          {wordCount > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <Clock className="w-3 h-3" />
              ~{estMinutes} min video
            </span>
          )}
          <span className={`ml-auto text-[10px] font-medium ${
            saveStatus === 'saved' ? 'text-emerald-400/50' :
            saveStatus === 'saving' ? 'text-amber-400/70' : 'text-white/30'
          }`}>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : '●'}
          </span>
        </div>
      )}

      {/* Editor */}
      <textarea
        value={body}
        placeholder={readOnly ? '' : 'Start writing your script here...\n\nTip: Use ALL CAPS for section headers (INTRO, MAIN POINT, OUTRO), indent for beats, and [B-ROLL NOTE] for cutaway cues.'}
        disabled={readOnly}
        onChange={e => {
          const v = e.target.value
          setBody(v)
          setSaveStatus('unsaved')
          onContentChange?.(v)
          debouncedSave(v)
        }}
        className="w-full bg-transparent border-0 outline-none resize-none text-sm leading-relaxed px-5 py-4"
        style={{
          color: 'rgba(255,255,255,0.82)',
          fontFamily: 'monospace',
          caretColor: '#dc2626',
          minHeight: '320px',
        }}
      />

      {saveError && (
        <div className="px-5 pb-3 text-xs text-red-400">{saveError}</div>
      )}
    </div>
  )
}
