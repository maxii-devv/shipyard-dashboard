'use client'

// Small client component used by the (server-rendered) Instagram dashboard at
// app/dashboard/page.tsx. The page itself is a server component so it can't own
// React state — this isolates the refresh action so we can call
// `router.refresh()` (re-runs the server fetch) and show a spin animation
// while the route segment is revalidating.
//
// Mirrors the visual treatment of the RefreshCw button on the Analytics page
// (app/dashboard/analytics/page.tsx).

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function DashboardRefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-60"
      title="Refresh data"
      aria-label="Refresh data"
    >
      <RefreshCw
        className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`}
        style={{ color: 'rgba(255,255,255,0.5)' }}
      />
    </button>
  )
}
