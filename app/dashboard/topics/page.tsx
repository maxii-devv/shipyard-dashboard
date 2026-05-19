import { Hash } from 'lucide-react'
import { TopicsClientView } from './topics-client-view'

export default function TopicsPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: '#262624' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5 mb-1">
          <Hash className="w-5 h-5" style={{ color: '#f59e0b' }} />
          <h1 className="text-xl font-bold tracking-tight text-white">Topics</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Things worth talking about. Track topics and plan content around them.
        </p>
        <TopicsClientView />
      </div>
    </div>
  )
}
