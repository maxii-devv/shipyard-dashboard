'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, AlignLeft } from 'lucide-react'
import { VideoFileUpload } from '@/components/video-file-upload'
import { VideoTranscription } from '@/components/video-transcription'

interface EditingSectionProps {
  videoId: string
  videoTitle: string
  initialVideoFilePath: string | null
  initialVideoFileName: string | null
  initialVideoFileSize: number | null
  initialDescription: string | null
  initialDescriptionStatus: string | null
}

export function EditingSection({
  videoId,
  videoTitle,
  initialVideoFilePath,
  initialVideoFileName,
  initialVideoFileSize,
  initialDescription,
  initialDescriptionStatus,
}: EditingSectionProps) {
  const [description, setDescription] = useState(initialDescription)
  const [descStatus, setDescStatus] = useState(initialDescriptionStatus)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateDescription = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/videos/${videoId}/generate-description`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error ?? 'Generation failed')
      } else {
        setDescription(data.description)
        setDescStatus('draft')
      }
    } catch (err: any) {
      setGenError(err.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const copyDescription = () => {
    if (!description) return
    navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Video Upload */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Video File
        </p>
        <VideoFileUpload
          videoId={videoId}
          initialPath={initialVideoFilePath}
          initialName={initialVideoFileName}
          initialSize={initialVideoFileSize}
        />
      </div>

      {/* Transcription */}
      <div className="rounded-xl px-5 py-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <VideoTranscription videoId={videoId} videoTitle={videoTitle} />
      </div>

      {/* Description */}
      <div className="rounded-xl p-5" style={{ background: '#2d2c2a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Description
            </p>
            {descStatus && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: descStatus === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                  color: descStatus === 'approved' ? '#10b981' : 'rgba(255,255,255,0.35)',
                }}
              >
                {descStatus === 'draft' ? 'Draft' : descStatus === 'approved' ? 'Approved' : descStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {description && (
              <button
                onClick={copyDescription}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: copied ? '#10b981' : 'rgba(255,255,255,0.3)' }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button
              onClick={generateDescription}
              disabled={generating}
              className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: 'rgba(220,38,38,0.1)',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.2)',
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {generating ? 'Generating...' : description ? 'Regenerate' : 'Generate from transcript'}
            </button>
          </div>
        </div>

        {genError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-xs text-red-400">{genError}</p>
          </div>
        )}

        {description ? (
          <pre
            className="text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto"
            style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'inherit' }}
          >
            {description}
          </pre>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Upload and transcribe your video, then click &ldquo;Generate from transcript&rdquo; to create an SEO-optimized description.
          </p>
        )}
      </div>
    </div>
  )
}
