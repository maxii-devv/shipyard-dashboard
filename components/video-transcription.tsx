'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Mic, Copy, Check, ChevronDown, ChevronRight, Clock, FileVideo, AlertCircle, Sparkles } from 'lucide-react'

interface Segment {
  start: number
  end: number
  startFormatted: string
  text: string
}

interface TranscriptResult {
  id: string
  transcript: string
  chapters: string
  segments: Segment[]
  duration: number
  durationFormatted: string
}

interface VideoTranscriptionProps {
  videoId: string
  videoTitle?: string
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[10px] transition-colors"
      style={{ color: copied ? '#10b981' : 'rgba(255,255,255,0.3)' }}
      onMouseOver={e => !copied && (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
      onMouseOut={e => !copied && (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

export function VideoTranscription({ videoId, videoTitle }: VideoTranscriptionProps) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chapters' | 'segments' | 'full'>('chapters')
  const [existingLoaded, setExistingLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing transcription on open
  useEffect(() => {
    if (!open || existingLoaded) return
    setExistingLoaded(true)
    fetch(`/api/videos/${videoId}/transcribe`)
      .then(r => r.json())
      .then(data => {
        if (data?.status === 'done' && data.transcript_json) {
          const j = data.transcript_json
          const segs: Segment[] = (j.segments ?? []).map((s: any) => ({
            start: s.start,
            end: s.end,
            startFormatted: formatTime(s.start),
            text: s.text.trim(),
          }))
          setResult({
            id: data.id,
            transcript: data.transcript_text ?? '',
            chapters: buildChapters(segs),
            segments: segs,
            duration: data.duration_seconds ?? 0,
            durationFormatted: formatTime(data.duration_seconds ?? 0),
          })
        }
      })
      .catch(() => {})
  }, [open, videoId, existingLoaded])

  const handleFile = async (file: File) => {
    setError(null)
    setResult(null)

    // Client-side size guard — Vercel free plan rejects bodies > ~4.5MB with a plain-text 413
    const MAX_MB = 24
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB — limit is ${MAX_MB}MB. Export audio-only (M4A/MP3) from your editor and upload that instead.`)
      return
    }

    setUploading(true)
    setProgress('Uploading...')

    const fd = new FormData()
    fd.append('file', file)

    try {
      setProgress('Transcribing with Whisper AI...')
      const res = await fetch(`/api/videos/${videoId}/transcribe`, { method: 'POST', body: fd })

      // Safely parse response — server may return plain text on 413/502/etc.
      let data: any = null
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        if (res.status === 413) {
          setError('File too large for the server. Export audio-only (M4A/MP3) from your editor — much smaller file size.')
        } else {
          setError(`Server error (${res.status}): ${text.slice(0, 120)}`)
        }
        return
      }

      if (!res.ok) {
        setError(data?.error ?? 'Transcription failed')
      } else {
        setResult(data)
        setActiveTab('chapters')
      }
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="video/*,audio/*,.mp3,.m4a,.wav,.webm" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs group transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}>
          {open
            ? <ChevronDown className="w-3 h-3 group-hover:text-white/50 transition-colors" />
            : <ChevronRight className="w-3 h-3 group-hover:text-white/50 transition-colors" />}
          <span className="uppercase tracking-widest font-semibold group-hover:text-white/50 transition-colors">
            Transcription
          </span>
          {result && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400/70"
              style={{ background: 'rgba(16,185,129,0.08)' }}>
              {result.durationFormatted}
            </span>
          )}
        </button>

        {!uploading && (
          <button onClick={() => { setOpen(true); fileRef.current?.click() }}
            className="flex items-center gap-1 text-[10px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
            <Upload className="w-3 h-3" />
            {result ? 'Re-transcribe' : 'Upload'}
          </button>
        )}
      </div>

      {/* Expanded */}
      {open && (
        <div className="mt-2 space-y-2">
          {/* Upload drop area — when no result */}
          {!result && !uploading && !error && (
            <div
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-colors"
              style={{ border: '1px dashed rgba(255,255,255,0.07)' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <FileVideo className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Drop your video or audio file here</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>MP4, MOV, M4A, MP3, WAV · Max 25MB</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Tip: export audio-only for larger videos</p>
            </div>
          )}

          {/* Processing */}
          {uploading && (
            <div className="flex items-center gap-2.5 py-4 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Mic className="w-4 h-4 animate-pulse" style={{ color: 'rgba(220,38,38,0.7)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{progress}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Powered by OpenAI Whisper</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 mt-1">Dismiss</button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && !uploading && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#1c1b1a' }}>
              {/* Tabs */}
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#262624' }}>
                {(['chapters', 'segments', 'full'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all"
                    style={{
                      background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: activeTab === tab ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                    }}>
                    {tab === 'chapters' ? '🕐 Chapters' : tab === 'segments' ? '📝 Segments' : '📄 Full Text'}
                  </button>
                ))}
                <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {result.durationFormatted} · {result.segments.length} segments
                </span>
              </div>

              <div className="p-3">
                {/* Chapters tab */}
                {activeTab === 'chapters' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        YouTube chapter timestamps — paste into description
                      </p>
                      <CopyButton text={result.chapters} label="Copy all" />
                    </div>
                    {result.chapters ? (
                      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap"
                        style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {result.chapters}
                      </pre>
                    ) : (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Video too short for chapters (&lt;2 minutes)
                      </p>
                    )}
                  </div>
                )}

                {/* Segments tab */}
                {activeTab === 'segments' && (
                  <div className="space-y-0.5 max-h-64 overflow-y-auto">
                    {result.segments.map((seg, i) => (
                      <div key={i} className="flex gap-2.5 py-1 group">
                        <span className="text-[10px] font-mono flex-shrink-0 mt-0.5 w-9"
                          style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {seg.startFormatted}
                        </span>
                        <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {seg.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full text tab */}
                {activeTab === 'full' && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <CopyButton text={result.transcript} label="Copy transcript" />
                    </div>
                    <p className="text-xs leading-relaxed max-h-64 overflow-y-auto"
                      style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {result.transcript}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildChapters(segments: Segment[]): string {
  if (!segments.length) return ''
  const chapters: string[] = []
  let lastTime = -999
  for (const seg of segments) {
    if (seg.start - lastTime >= 60) {
      const text = seg.text.replace(/^[-–—\s]+/, '').slice(0, 60)
      if (text) { chapters.push(`${formatTime(seg.start)} ${text}`); lastTime = seg.start }
    }
  }
  return chapters.join('\n')
}
