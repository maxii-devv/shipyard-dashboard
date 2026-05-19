// Stable re-export: every client component that imported `createClient` from
// here now uses the browser-side shim, which proxies all queries to the
// server-side pg-backed executor via /api/db/exec (gated by the password
// middleware). No call-site changes required.
import { createBrowserClient } from '@/lib/db-shim-browser'

export function createClient() {
  return createBrowserClient()
}
