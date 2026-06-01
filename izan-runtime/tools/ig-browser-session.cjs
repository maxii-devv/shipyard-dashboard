// Long-lived interactive browser session for the dashboard's "live browser"
// panel. Holds ONE Chromium open on the persistent /data/pw-profile profile and
// exposes it over a localhost-only HTTP API: screenshot out, clicks/keys/scroll
// /navigation in. The Next.js /api/ig-browser routes proxy to this; nothing here
// is exposed off the box.
//
// Runs as a separate node process (spawned by lib/ig-browser-proc.ts) so it can
// require the GLOBAL playwright-core (a dep of @playwright/mcp) without Next's
// standalone bundler having to trace playwright — which it does poorly.
//
// While this holds the profile open, the MCP-based runs (/api/run, /api/ig-login)
// can't use the same profile (Chromium single-instance lock), so the panel calls
// /shutdown when the user closes it, and it also self-closes after idle.

const http = require('http')

function loadPlaywright() {
  const candidates = [
    process.env.PWC_PATH,
    '/usr/local/lib/node_modules/@playwright/mcp/node_modules/playwright-core',
    '/usr/local/lib/node_modules/playwright-core',
    'playwright-core',
  ].filter(Boolean)
  for (const c of candidates) {
    try { return require(c) } catch { /* try next */ }
  }
  throw new Error('playwright-core not found in any known location')
}

const { chromium } = loadPlaywright()

const PROFILE = process.env.PW_PROFILE || '/data/pw-profile'
const CHROME = process.env.PW_CHROME || '/usr/bin/chromium-browser'
const PORT = Number(process.env.PW_PORT || 9223)
const VW = 1100
const VH = 760
const IDLE_MS = 10 * 60 * 1000
const LOGIN_URL = 'https://www.instagram.com/accounts/login/'

let context = null
let page = null
let lastActivity = Date.now()

async function ensure() {
  if (context && page && !page.isClosed()) return
  context = await chromium.launchPersistentContext(PROFILE, {
    headless: true,
    executablePath: CHROME,
    viewport: { width: VW, height: VH },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  page = context.pages()[0] || (await context.newPage())
  if (!page.url() || page.url() === 'about:blank') {
    try { await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }) } catch { /* show whatever loads */ }
  }
}

async function shutdown() {
  try { await context?.close() } catch { /* ignore */ }
  process.exit(0)
}

setInterval(() => { if (Date.now() - lastActivity > IDLE_MS) shutdown() }, 30000)

function readBody(req) {
  return new Promise(resolve => {
    let d = ''
    req.on('data', c => { d += c })
    req.on('end', () => resolve(d))
  })
}

const server = http.createServer(async (req, res) => {
  lastActivity = Date.now()
  const json = (obj, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(obj))
  }
  try {
    const u = new URL(req.url, 'http://x')

    // /status must NOT force a browser launch — it's the readiness probe.
    if (req.method === 'GET' && u.pathname === '/status') {
      return json({ ok: true, started: !!(context && page && !page.isClosed()), url: page ? page.url() : null, w: VW, h: VH })
    }

    await ensure()

    if (req.method === 'GET' && u.pathname === '/shot') {
      const buf = await page.screenshot({ type: 'jpeg', quality: 55 })
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' })
      return res.end(buf)
    }

    if (req.method === 'POST') {
      const data = JSON.parse((await readBody(req)) || '{}')
      switch (u.pathname) {
        case '/click': await page.mouse.click(Number(data.x), Number(data.y)); break
        case '/move': await page.mouse.move(Number(data.x), Number(data.y)); break
        case '/type': await page.keyboard.type(String(data.text || ''), { delay: 25 }); break
        case '/key': await page.keyboard.press(String(data.key || '')); break
        case '/scroll': await page.mouse.wheel(0, Number(data.dy || 0)); break
        case '/nav': await page.goto(String(data.url || LOGIN_URL), { waitUntil: 'domcontentloaded', timeout: 60000 }); break
        case '/shutdown': json({ ok: true }); return shutdown()
        default: return json({ error: 'unknown path' }, 404)
      }
      return json({ ok: true, url: page.url() })
    }

    return json({ error: 'not found' }, 404)
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500)
  }
})

server.listen(PORT, '127.0.0.1', () => console.log('IGBROWSER_LISTENING ' + PORT))
