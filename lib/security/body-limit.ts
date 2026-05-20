// Hard cap on request bodies. Next 16 doesn't enforce a body-size limit by
// default for App Router routes; without this an attacker can POST a 100 MB
// JSON to /api/db/exec or /api/login and exhaust memory.
//
// Usage at the top of a route handler:
//   const guard = enforceBodyLimit(req, 1 << 20)  // 1 MiB
//   if (guard) return guard

import { NextResponse, type NextRequest } from 'next/server'

export function enforceBodyLimit(req: NextRequest, maxBytes: number): NextResponse | null {
  const lenStr = req.headers.get('content-length')
  if (!lenStr) return null // chunked / unknown length — handler must guard itself
  const len = Number(lenStr)
  if (!Number.isFinite(len)) return null
  if (len > maxBytes) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }
  return null
}

// Wrap req.json() so a too-large or malformed body returns a clean response.
// Catches the "Content-Length missing, body is huge" case via a manual stream
// read with a running byte counter.
export async function readJsonGuarded<T = unknown>(req: NextRequest, maxBytes: number): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const overByLength = enforceBodyLimit(req, maxBytes)
  if (overByLength) return { ok: false, res: overByLength }
  const reader = req.body?.getReader()
  if (!reader) {
    return { ok: false, res: NextResponse.json({ error: 'empty body' }, { status: 400 }) }
  }
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try { await reader.cancel() } catch { /* ignore */ }
      return { ok: false, res: NextResponse.json({ error: 'payload too large' }, { status: 413 }) }
    }
    chunks.push(value)
  }
  const buf = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    buf.set(c, off)
    off += c.byteLength
  }
  try {
    const text = new TextDecoder().decode(buf)
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  }
}
