import { createClient } from '@/lib/supabase/server'
import { ContentCalendar } from '@/components/content-calendar'
import { Calendar } from 'lucide-react'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .neq('status', 'published')
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  const { data: socialPosts } = await supabase
    .from('social_posts')
    .select('*')
    .neq('status', 'published')
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  return (
    <div className="min-h-screen p-8" style={{ background: '#262624' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Calendar className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Content Calendar</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Scheduled videos and upcoming content
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', color: '#f87171' }}
          >
            Error loading calendar: {error.message}
          </div>
        ) : (
          <ContentCalendar videos={videos ?? []} socialPosts={socialPosts ?? []} />
        )}
      </div>
    </div>
  )
}
