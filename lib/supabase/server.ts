// Stable re-export: every server component and route that previously imported
// `createClient` from here now transparently uses the pg-backed shim. The
// original implementation used @supabase/ssr + cookies; with auth moved to the
// password-gate middleware, cookies are no longer needed here. Kept async to
// preserve the call-site contract (`const supabase = await createClient()`).
import { createClient as makeClient } from '@/lib/db-shim'

export async function createClient() {
  return makeClient()
}
