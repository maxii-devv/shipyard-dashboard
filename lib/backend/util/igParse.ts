export interface IGInsights {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagement_rate: number
}

// Pure parser for the Instagram `/insights` response body. Kept dependency-free
// (no DB, no network) so it can be unit-tested directly.
export function parseInsights(data: unknown): IGInsights {
  const byName: Record<string, number> = {}
  const rows = (data as { data?: unknown[] } | null)?.data ?? []
  for (const raw of rows) {
    const item = raw as { name?: string; value?: number; values?: { value?: number }[] }
    if (!item.name) continue
    byName[item.name] = item.values?.[0]?.value ?? item.value ?? 0
  }

  const likes = byName.likes ?? 0
  const comments = byName.comments ?? 0
  const shares = byName.shares ?? 0
  const saves = byName.saved ?? 0
  const reach = byName.reach ?? 0
  const views = byName.views ?? byName.plays ?? byName.video_views ?? reach

  const engagement_rate =
    reach > 0
      ? parseFloat(((likes + comments + shares + saves) / reach).toFixed(4))
      : 0

  return { views, likes, comments, shares, saves, reach, engagement_rate }
}
