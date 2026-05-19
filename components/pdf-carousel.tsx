'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

interface PdfCarouselProps {
  url: string
  filename?: string
}

export function PdfCarousel({ url, filename }: PdfCarouselProps) {
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)

  // Load PDF document
  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load PDF')
          setLoading(false)
        }
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [url])

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
      renderTaskRef.current = null
    }

    const page = await pdf.getPage(pageNum)
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    if (containerWidth === 0) return
    const viewport = page.getViewport({ scale: 1 })
    const scale = containerWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })

    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const task = page.render({ canvasContext: ctx, viewport: scaledViewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch {
      // render was cancelled, ignore
    }
    renderTaskRef.current = null
  }, [])

  useEffect(() => {
    if (!loading && pageCount > 0) {
      renderPage(currentPage)
    }
  }, [currentPage, loading, pageCount, renderPage])

  // Re-render on resize (debounced)
  useEffect(() => {
    if (loading || pageCount === 0) return
    let timeout: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(() => renderPage(currentPage), 100)
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => { observer.disconnect(); clearTimeout(timeout) }
  }, [loading, pageCount, currentPage, renderPage])

  const prev = () => setCurrentPage(p => Math.max(1, p - 1))
  const next = () => setCurrentPage(p => Math.min(pageCount, p + 1))

  const openFullscreen = () => {
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20" style={{ background: '#1c1b1a' }}>
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-12" style={{ background: '#1c1b1a' }}>
        <span className="text-xs text-white/30">{error}</span>
      </div>
    )
  }

  const displayName = filename?.replace(/\.[^.]+$/, '') || 'Document'

  return (
    <div className="w-full" style={{ background: '#1c1b1a' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <span className="text-xs font-semibold text-white/80 truncate">
          {displayName} <span className="font-normal text-white/40">&middot; {pageCount} pages</span>
        </span>
        <button
          onClick={openFullscreen}
          className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          title="Open PDF"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide area */}
      <div ref={containerRef} className="relative w-full">
        <canvas ref={canvasRef} className="w-full block" />

        {/* Nav arrows */}
        {pageCount > 1 && (
          <>
            {currentPage > 1 && (
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
                style={{ background: 'rgba(0,0,0,0.7)', opacity: 0.8 }}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            )}
            {currentPage < pageCount && (
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
                style={{ background: 'rgba(0,0,0,0.7)', opacity: 0.8 }}
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            )}
          </>
        )}

        {/* Footer: progress bar + counter */}
        {pageCount > 1 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div
                className="h-full transition-all"
                style={{ width: `${(currentPage / pageCount) * 100}%`, background: '#0a66c2' }}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <span className="text-[11px] font-medium text-white/60">{currentPage} / {pageCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
