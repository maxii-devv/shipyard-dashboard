'use client'

import dynamic from 'next/dynamic'

const ExcalidrawEmbed = dynamic(
  () => import('@/components/excalidraw-embed').then(m => ({ default: m.ExcalidrawEmbed })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center w-full h-full" style={{ minHeight: 500, background: '#1c1b1a' }}>
      <p className="text-xs text-white/20">Loading diagram...</p>
    </div>
  )}
)

interface ExcalidrawWrapperProps {
  videoId: string
  initialData: Record<string, unknown> | null
  fullScreen?: boolean
}

export function ExcalidrawWrapper({ videoId, initialData, fullScreen }: ExcalidrawWrapperProps) {
  return <ExcalidrawEmbed videoId={videoId} initialData={initialData} fullScreen={fullScreen} />
}
