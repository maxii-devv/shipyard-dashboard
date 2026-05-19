import { Newspaper } from 'lucide-react'
import { NewsFeed } from './news-feed'

export default function NewsPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: '#262624' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5 mb-1">
          <Newspaper className="w-5 h-5" style={{ color: '#3b82f6' }} />
          <h1 className="text-xl font-bold tracking-tight text-white">News</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Latest from your selected sources — save interesting stories as topics
        </p>
        <NewsFeed />
      </div>
    </div>
  )
}
