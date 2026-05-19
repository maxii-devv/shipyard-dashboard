import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExcalidrawWrapper } from '@/components/excalidraw-wrapper'

export default async function DiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: video, error } = await supabase
    .from('videos')
    .select('id, title, excalidraw_data')
    .eq('id', id)
    .single()

  if (error || !video) notFound()

  return (
    <div className="h-screen flex flex-col" style={{ background: '#262624' }}>
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link
          href={`/dashboard/videos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {video.title}
        </Link>
      </div>
      <div className="flex-1">
        <ExcalidrawWrapper videoId={id} initialData={video.excalidraw_data} fullScreen />
      </div>
    </div>
  )
}
