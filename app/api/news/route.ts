import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db-shim'

// ── Types ───────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  source_id: string
  source_name: string
  source_type: 'rss' | 'reddit'
  source_color: string
  published_at: string
  reddit_score?: number
  reddit_comments?: number
}

interface NewsSource {
  id: string
  name: string
  source_type: 'rss' | 'reddit'
  url: string
  color: string
}

// ── Cache ───────────────────────────────────────────────────────────────────

let cache: { data: NewsItem[]; sourceKey: string; timestamp: number } | null = null
const CACHE_TTL = 15 * 60 * 1000

// ── Helpers ─────────────────────────────────────────────────────────────────

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function stripHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTag(block: string, tag: string): string | null {
  // Handle CDATA content
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i')
  const cdataMatch = block.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1].trim()

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = block.match(regex)
  return match ? match[1].trim() : null
}

function extractLink(block: string): string | null {
  // Atom: <link href="..." />
  const atomLink = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'][^>]*)?\/?\s*>/i)
  if (atomLink) return atomLink[1]
  // RSS: <link>url</link>
  const rssLink = extractTag(block, 'link')
  return rssLink
}

// ── RSS Fetching ────────────────────────────────────────────────────────────

function parseRSS(xml: string, source: NewsSource): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<(?:item|entry)([\s\S]*?)<\/(?:item|entry)>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractLink(block)
    const desc = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content') || ''
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated')

    if (title && link) {
      items.push({
        id: simpleHash(link),
        title: stripHtml(title),
        description: stripHtml(desc).slice(0, 250),
        url: link,
        source_id: source.id,
        source_name: source.name,
        source_type: 'rss',
        source_color: source.color,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  }

  return items
}

async function fetchRSS(source: NewsSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentDashboard/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) {
      console.error(`[News] RSS fetch failed for "${source.name}" (${source.url}): ${res.status} ${res.statusText}`)
      return []
    }
    const xml = await res.text()
    const items = parseRSS(xml, source)
    if (items.length === 0) {
      console.warn(`[News] RSS parsed 0 items from "${source.name}" (${source.url}) — feed may be empty or format unrecognized`)
    }
    return items
  } catch (err) {
    console.error(`[News] RSS error for "${source.name}" (${source.url}):`, err instanceof Error ? err.message : err)
    return []
  }
}

// ── Reddit Fetching ─────────────────────────────────────────────────────────

async function fetchReddit(source: NewsSource): Promise<NewsItem[]> {
  try {
    // Strip leading "r/" or "/r/" if user included it — url should just be the subreddit name
    const subreddit = source.url.replace(/^\/?r\//, '')
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentDashboard/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error(`[News] Reddit fetch failed for r/${subreddit}: ${res.status} ${res.statusText}`)
      return []
    }
    const json = await res.json()

    return (json.data?.children ?? [])
      .filter((c: any) => !c.data.stickied)
      .map((c: any) => ({
        id: c.data.id,
        title: c.data.title,
        description: (c.data.selftext || '').slice(0, 250),
        url: c.data.url?.startsWith('/r/')
          ? `https://www.reddit.com${c.data.url}`
          : c.data.url || `https://www.reddit.com${c.data.permalink}`,
        source_id: source.id,
        source_name: source.name,
        source_type: 'reddit' as const,
        source_color: source.color,
        published_at: new Date(c.data.created_utc * 1000).toISOString(),
        reddit_score: c.data.score,
        reddit_comments: c.data.num_comments,
      }))
  } catch (err) {
    console.error(`[News] Reddit error for "${source.name}":`, err instanceof Error ? err.message : err)
    return []
  }
}

// ── Load user's sources from settings ────────────────────────────────────────

async function getUserSources(): Promise<NewsSource[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: setting, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'news_sources')
      .single()

    if (error) {
      console.error('[News] Failed to load sources from user_settings:', error.message)
      return []
    }

    if (!setting?.value) {
      console.warn('[News] No news_sources found in user_settings')
      return []
    }

    const sources: NewsSource[] = JSON.parse(setting.value)
    console.log(`[News] Loaded ${sources.length} source(s):`, sources.map(s => `${s.name} (${s.source_type}: ${s.url})`).join(', '))
    return sources
  } catch (err) {
    console.error('[News] Error loading sources:', err instanceof Error ? err.message : err)
    return []
  }
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const force = new URL(request.url).searchParams.get('force')

  const sources = await getUserSources()

  if (sources.length === 0) {
    return NextResponse.json([])
  }

  const sourceKey = sources.map(s => s.id).sort().join(',')

  if (!force && cache && cache.sourceKey === sourceKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  }

  const rssSources = sources.filter(s => s.source_type === 'rss')
  const redditSources = sources.filter(s => s.source_type === 'reddit')

  console.log(`[News] Fetching from ${rssSources.length} RSS + ${redditSources.length} Reddit sources`)

  const results = await Promise.allSettled([
    ...rssSources.map(source => fetchRSS(source)),
    ...redditSources.map(source => fetchReddit(source)),
  ])

  // Log rejected promises
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      const src = i < rssSources.length ? rssSources[i] : redditSources[i - rssSources.length]
      console.error(`[News] Source "${src?.name}" rejected:`, r.reason)
    }
  }

  const allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

  console.log(`[News] Fetched ${allItems.length} total items`)

  cache = { data: allItems, sourceKey, timestamp: Date.now() }

  return NextResponse.json(allItems, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
