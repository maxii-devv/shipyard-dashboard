import 'server-only'
import type { ChildProcess } from 'node:child_process'
import { join } from 'node:path'

// Manages the long-lived ig-browser-session.cjs child (see that file). Spawned
// lazily on first use; the reference lives at module scope so it persists across
// requests within the same Next server process. The child self-exits when idle.

// Turbopack's file-tracing models child_process and resolves the first arg of any
// spawn/fork call as a build-time module request — it follows the binding even
// through `import`, `createRequire`, and renames, so our runtime script path
// can't resolve and the build fails. Obtaining require via eval() makes the
// module (and thus spawn) opaque to the tracer, so the arg is left alone. require
// exists in the Next server runtime; this file is server-only.
// eslint-disable-next-line no-eval
const dynamicRequire = eval('require') as NodeRequire
const launchNode = (dynamicRequire('node:child_process') as typeof import('node:child_process')).spawn

const PORT = Number(process.env.IG_BROWSER_PORT ?? 9223)
const RUN_CWD = process.env.CLAUDE_RUN_CWD ?? '/data/izan-project'
// playwright-core ships nested under @playwright/mcp; expose both global roots
// on NODE_PATH so the child's require('playwright-core') resolves.
const NODE_PATH = '/usr/local/lib/node_modules/@playwright/mcp/node_modules:/usr/local/lib/node_modules'

const SCRIPT_PATH = process.env.IG_BROWSER_SCRIPT || join(RUN_CWD, 'tools', 'ig-browser-session.cjs')

export const IG_BROWSER_PORT = PORT
export const IG_BROWSER_BASE = `http://127.0.0.1:${PORT}`

let child: ChildProcess | null = null

async function isUp(): Promise<boolean> {
  try {
    const r = await fetch(`${IG_BROWSER_BASE}/status`, { signal: AbortSignal.timeout(1500) })
    return r.ok
  } catch {
    return false
  }
}

/** Ensure the browser-session child is running and accepting requests. */
export async function ensureBrowserChild(): Promise<void> {
  if (await isUp()) return

  if (!child || child.exitCode !== null || child.killed) {
    child = launchNode('node', [SCRIPT_PATH], {
      stdio: 'ignore',
      env: {
        ...process.env,
        NODE_PATH,
        PW_PORT: String(PORT),
        PW_PROFILE: '/data/pw-profile',
        PW_CHROME: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      },
    })
    child.on('exit', () => { child = null })
  }

  // Wait for it to bind (browser launch on first /shot can take a few more s).
  for (let i = 0; i < 40; i++) {
    if (await isUp()) return
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('ig-browser session did not start in time')
}

export function markBrowserStopped() {
  child = null
}
