import { Youtube } from 'lucide-react'
import { PlatformPlaceholder } from '@/components/platform-placeholder'

export default function YouTubePage() {
  return (
    <PlatformPlaceholder
      platform="YouTube"
      accentColor="#ff0000"
      icon={<Youtube className="w-5 h-5" />}
      description="Track YouTube channel performance — views, retention, click-through rate, and outlier videos."
      comingSoonItems={[
        'Channel view & subscriber growth',
        'Per-video retention curves',
        'Thumbnail CTR breakdown',
        'Top-performing video outliers',
        'Shorts vs long-form split',
      ]}
    />
  )
}
