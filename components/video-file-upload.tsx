'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Film, Trash2, Check, Loader2 } from 'lucide-react'

interface VideoFileUploadProps {
  videoId: string
  initialPath?: string | null
  initialName?: string | null
  initialSize?: number | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function VideoFileUpload({ videoId, initialPath, initialName, initialSize }: VideoFileUploadProps) {
  const [filePath, setFilePath] = useState(initialPath ?? null)
  const [fileName, setFileName] = useState(initialName ?? null)
  const [fileSize, setFileSize] = useState(initialSize ?? null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    setProgress(0)
    setDone(false)

    try {
      // Step 1: Get a signed upload URL from our API
      const urlRes = await fetch(`/api/videos/${videoId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!urlRes.ok) throw new Error(await urlRes.text())
      const { signedUrl, path } = await urlRes.json()

      // Step 2: Upload directly to Supabase Storage (bypasses Vercel limit)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 95))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100)
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.send(file)
      })

      // Step 3: Confirm upload — save path to DB
      const confirmRes = await fetch(`/api/videos/${videoId}/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, filename: file.name, fileSize: file.size }),
      })
      if (!confirmRes.ok) throw new Error(await confirmRes.text())

      setFilePath(path)
      setFileName(file.name)
      setFileSize(file.size)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [videoId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) uploadFile(file)
  }

  const handleRemove = async () => {
    if (!confirm('Remove the uploaded video file?')) return
    setRemoving(true)
    await fetch(`/api/videos/${videoId}/confirm-upload`, { method: 'DELETE' })
    setFilePath(null)
    setFileName(null)
    setFileSize(null)
    setRemoving(false)
  }

  // Existing file state
  if (filePath && !uploading) {
    return (
      <div
        style={{
          background: '#2d2c2a',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40, height: 40,
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {done ? (
            <Check className="w-5 h-5" style={{ color: '#22c55e' }} />
          ) : (
            <Film className="w-5 h-5" style={{ color: '#dc2626' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fileName ?? 'Video file uploaded'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {fileSize ? formatBytes(fileSize) : 'Stored in Supabase'}
            {done && <span style={{ color: '#22c55e', marginLeft: 8 }}>✓ Upload complete</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Replace
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'rgba(255,255,255,0.2)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
          >
            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
      </div>
    )
  }

  // Upload state
  if (uploading) {
    return (
      <div
        style={{
          background: '#2d2c2a',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#dc2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Uploading directly to storage... {progress}%
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%', borderRadius: 99, background: '#dc2626',
              width: `${progress}%`, transition: 'width 0.2s ease',
            }}
          />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
          Uploading directly to Supabase — no file size limit
        </p>
      </div>
    )
  }

  // Empty drop zone
  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${dragging ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12,
          padding: '28px 20px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          background: dragging ? 'rgba(220,38,38,0.04)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        onMouseLeave={e => { if (!dragging) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Upload className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            Drop video file here, or click to browse
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            Uploads directly to Supabase Storage — no size limit
          </p>
        </div>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>⚠ {error}</p>
      )}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
