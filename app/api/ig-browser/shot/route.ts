import { ensureBrowserChild, IG_BROWSER_BASE } from '@/lib/ig-browser-proc'

// Serves the latest screenshot of the live browser as a JPEG. The panel polls
// this (cache-busted) ~1x/sec to render a live-ish view.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureBrowserChild()
    const r = await fetch(`${IG_BROWSER_BASE}/shot`, { signal: AbortSignal.timeout(30000) })
    if (!r.ok) return new Response('shot failed', { status: 502 })
    const buf = Buffer.from(await r.arrayBuffer())
    return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } })
  } catch (e) {
    return new Response((e as Error).message, { status: 502 })
  }
}
