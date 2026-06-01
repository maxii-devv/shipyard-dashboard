import { NextRequest } from 'next/server'
import { ensureBrowserChild, markBrowserStopped, IG_BROWSER_BASE } from '@/lib/ig-browser-proc'

// Control channel for the live browser panel. Proxies actions to the localhost
// browser-session child. The screenshot stream is served separately by
// ./shot/route.ts.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POST_ACTIONS: Record<string, string> = {
  click: '/click', move: '/move', type: '/type', key: '/key', scroll: '/scroll', nav: '/nav',
}

export async function POST(req: NextRequest) {
  let body: { action?: string; [k: string]: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const action = String(body.action ?? '')

  // Stop tears down the child so the profile frees up for MCP pipelines.
  if (action === 'stop') {
    try { await fetch(`${IG_BROWSER_BASE}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(4000) }) } catch { /* may already be down */ }
    markBrowserStopped()
    return Response.json({ ok: true })
  }

  try {
    await ensureBrowserChild()
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 })
  }

  // start / status both just probe; start additionally guarantees the child is up.
  if (action === 'start' || action === 'status') {
    try {
      const r = await fetch(`${IG_BROWSER_BASE}/status`, { signal: AbortSignal.timeout(5000) })
      return Response.json(await r.json(), { status: r.status })
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 })
    }
  }

  const path = POST_ACTIONS[action]
  if (!path) return Response.json({ error: `unknown action: ${action}` }, { status: 400 })

  const { action: _omit, ...rest } = body
  try {
    const r = await fetch(`${IG_BROWSER_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
      signal: AbortSignal.timeout(70000),
    })
    return Response.json(await r.json().catch(() => ({})), { status: r.status })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
