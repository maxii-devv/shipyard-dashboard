import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://app.metricool.com/api'

function authParams() {
  return `userToken=${process.env.METRICOOL_API_TOKEN}&userId=${process.env.METRICOOL_USER_ID}&blogId=${process.env.METRICOOL_BLOG_ID}`
}

export async function GET(req: NextRequest) {
  if (!process.env.METRICOOL_API_TOKEN || !process.env.METRICOOL_USER_ID) {
    return NextResponse.json({ error: 'Metricool not configured. Set METRICOOL_API_TOKEN and METRICOOL_USER_ID in .env.local' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint param required' }, { status: 400 })
  }

  try {
    let url: string

    switch (endpoint) {
      // ── Instagram ───────────────────────────────────────────────────────────
      case 'instagram_posts': {
        const from = searchParams.get('from') || '2026-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/posts/instagram?from=${from}&to=${to}&${authParams()}`
        break
      }
      case 'instagram_reels': {
        const from = searchParams.get('from') || '2026-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/reels/instagram?from=${from}&to=${to}&${authParams()}`
        break
      }
      case 'instagram_stories': {
        const from = searchParams.get('from') || '2026-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/stories/instagram?from=${from}&to=${to}&${authParams()}`
        break
      }
      case 'instagram_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/instagram?date=${date}&${authParams()}`
        break
      }

      // ── Twitter ─────────────────────────────────────────────────────────────
      case 'twitter_posts': {
        const from = searchParams.get('from') || '2026-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/posts/twitter?from=${from}&to=${to}&${authParams()}`
        break
      }
      case 'twitter_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/twitter?date=${date}&${authParams()}`
        break
      }

      // ── LinkedIn ─────────────────────────────────────────────────────────────
      case 'linkedin_posts': {
        const from = searchParams.get('from') || '2026-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/posts/linkedin?from=${from}&to=${to}&${authParams()}`
        break
      }
      case 'linkedin_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/Linkedin?date=${date}&${authParams()}`
        break
      }

      // ── YouTube ──────────────────────────────────────────────────────────────
      case 'youtube_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/youtube?date=${date}&${authParams()}`
        break
      }
      case 'youtube_posts': {
        const from = searchParams.get('from') || '2025-01-01T00:00:00'
        const to = searchParams.get('to') || new Date().toISOString().split('.')[0]
        url = `${BASE_URL}/v2/analytics/posts/youtube?from=${from}&to=${to}&${authParams()}`
        break
      }

      // ── TikTok ───────────────────────────────────────────────────────────────
      case 'tiktok_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/tiktok?date=${date}&${authParams()}`
        break
      }

      // ── Facebook ─────────────────────────────────────────────────────────────
      case 'facebook_stats': {
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/Facebook?date=${date}&${authParams()}`
        break
      }

      // ── Scheduled ────────────────────────────────────────────────────────────
      case 'scheduled_posts': {
        const start = searchParams.get('start') || new Date().toISOString().split('.')[0]
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 14)
        const end = searchParams.get('end') || endDate.toISOString().split('.')[0]
        url = `${BASE_URL}/v2/scheduler/posts?start=${start}&end=${end}&${authParams()}`
        break
      }

      // ── Legacy ───────────────────────────────────────────────────────────────
      case 'stats_posts': {
        const start = searchParams.get('start') || '20260101'
        const end = searchParams.get('end') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/posts?start=${start}&end=${end}&${authParams()}`
        break
      }
      case 'stats_values': {
        // Legacy alias — prefer specific endpoints above
        const category = searchParams.get('category') || 'instagram'
        const date = searchParams.get('date') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/values/${category}?date=${date}&${authParams()}`
        break
      }
      case 'profiles': {
        url = `${BASE_URL}/admin/simpleProfiles?${authParams()}`
        break
      }

      // ── Timeline (time series for any metric) ──────────────────────────────
      case 'timeline': {
        const metric = searchParams.get('metric')
        if (!metric) return NextResponse.json({ error: 'metric param required for timeline' }, { status: 400 })
        const start = searchParams.get('start') || new Date(Date.now() - 90 * 86400000).toISOString().replace(/-/g, '').split('T')[0]
        const end = searchParams.get('end') || new Date().toISOString().replace(/-/g, '').split('T')[0]
        url = `${BASE_URL}/stats/timeline/${metric}?start=${start}&end=${end}&${authParams()}`
        break
      }

      default:
        return NextResponse.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 }, // cache 5 min
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    console.error('Metricool API error:', err)
    return NextResponse.json({ error: 'Metricool API request failed' }, { status: 500 })
  }
}
