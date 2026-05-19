import { NextResponse } from 'next/server'

const METRICOOL_BASE = 'https://app.metricool.com/api'

function authParams() {
  return `userToken=${process.env.METRICOOL_API_TOKEN}&userId=${process.env.METRICOOL_USER_ID}&blogId=${process.env.METRICOOL_BLOG_ID}`
}

interface ActivityDay {
  total: number
  instagram: number
  linkedin: number
  youtube: number
}

function toDateKey(dateStr: string): string {
  return dateStr.slice(0, 10)
}

function calculateStreaks(activity: Record<string, ActivityDay>, clientToday?: string) {
  // Use client's local date if provided, otherwise fall back to UTC
  const todayStr = clientToday || new Date().toISOString().slice(0, 10)
  const dates: string[] = []
  for (let i = 0; i < 365; i++) {
    const d = new Date(todayStr + 'T12:00:00')
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const postedToday = (activity[dates[0]]?.total ?? 0) > 0

  // Current streak: include today if it has posts, otherwise start from yesterday
  let current = 0
  const startIdx = postedToday ? 0 : 1
  for (let i = startIdx; i < dates.length; i++) {
    if ((activity[dates[i]]?.total ?? 0) > 0) {
      current++
    } else {
      break
    }
  }

  // Longest streak: scan oldest to newest
  let longest = 0
  let run = 0
  for (let i = dates.length - 1; i >= 0; i--) {
    if ((activity[dates[i]]?.total ?? 0) > 0) {
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }

  return { current, longest, postedToday }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientToday = searchParams.get('today') || undefined
  const today = new Date()
  const yearAgo = new Date(today)
  yearAgo.setDate(yearAgo.getDate() - 364)

  const from = yearAgo.toISOString().split('.')[0]
  const to = today.toISOString().split('.')[0]
  const activity: Record<string, ActivityDay> = {}
  const errors: string[] = []

  function ensureDay(date: string): ActivityDay {
    if (!activity[date]) {
      activity[date] = { total: 0, instagram: 0, linkedin: 0, youtube: 0 }
    }
    return activity[date]
  }

  // ── Instagram (posts + reels + stories) ────────────────────────────────────
  if (!process.env.METRICOOL_API_TOKEN) {
    errors.push('instagram: METRICOOL_API_TOKEN not configured')
  } else try {
    const [postsRes, reelsRes, storiesRes] = await Promise.all([
      fetch(`${METRICOOL_BASE}/v2/analytics/posts/instagram?from=${from}&to=${to}&${authParams()}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }),
      fetch(`${METRICOOL_BASE}/v2/analytics/reels/instagram?from=${from}&to=${to}&${authParams()}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }),
      fetch(`${METRICOOL_BASE}/v2/analytics/stories/instagram?from=${from}&to=${to}&${authParams()}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }),
    ])

    const [posts, reels, stories] = await Promise.all([
      postsRes.ok ? postsRes.json() : { data: [] },
      reelsRes.ok ? reelsRes.json() : { data: [] },
      storiesRes.ok ? storiesRes.json() : { data: [] },
    ])

    // Deduplicate posts/reels by postId
    const seen = new Set<string>()
    const allIg = [...(posts.data ?? []), ...(reels.data ?? []), ...(stories.data ?? [])]
    for (const post of allIg) {
      const id = post.postId ?? post.id
      if (id && seen.has(String(id))) continue
      if (id) seen.add(String(id))

      const dateStr = post.publishedAt?.dateTime
      if (!dateStr) continue
      const day = ensureDay(toDateKey(dateStr))
      day.instagram++
      day.total++
    }
  } catch (err) {
    errors.push(`instagram: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  if (!process.env.METRICOOL_API_TOKEN) {
    errors.push('linkedin: METRICOOL_API_TOKEN not configured')
  } else try {
    const res = await fetch(
      `${METRICOOL_BASE}/v2/analytics/posts/linkedin?from=${from}&to=${to}&${authParams()}`,
      { headers: { 'Content-Type': 'application/json' }, next: { revalidate: 300 } }
    )
    const data = res.ok ? await res.json() : { data: [] }

    for (const post of data.data ?? []) {
      const dateStr = post.publishedAt?.dateTime
      if (!dateStr) continue
      const day = ensureDay(toDateKey(dateStr))
      day.linkedin++
      day.total++
    }
  } catch (err) {
    errors.push(`linkedin: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // ── Compute totals ─────────────────────────────────────────────────────────
  let instagram = 0, linkedin = 0, youtube = 0, total = 0, activeDays = 0
  for (const day of Object.values(activity)) {
    instagram += day.instagram
    linkedin += day.linkedin
    youtube += day.youtube
    total += day.total
    if (day.total > 0) activeDays++
  }

  const streaks = calculateStreaks(activity, clientToday)

  return NextResponse.json(
    { activity, streaks, totals: { instagram, linkedin, youtube, total, activeDays }, errors: errors.length ? errors : undefined },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  )
}
