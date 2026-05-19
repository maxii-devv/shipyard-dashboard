# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Self-hosted content management dashboard for creators managing multi-platform
content pipelines. Built with Next.js 16, React 19, PostgreSQL (via `pg`), and
DaisyUI 5. Designed as a template that can be cloned and deployed against any
Postgres + a local uploads volume — no Supabase, no Vercel.

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build (output: 'standalone')
npm run lint         # ESLint
npm run test         # Vitest
npm run test:watch
npm run test:coverage
npx vitest run __tests__/api/ideas.test.ts   # single test
```

Docker:

```bash
docker build -t shipyard-dashboard .
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack, `output: 'standalone'`)
- **UI:** TailwindCSS 4 + DaisyUI 5 + shadcn/ui (new-york, neutral)
- **Database:** PostgreSQL via `pg` connection pool (`DATABASE_URL`)
- **Storage:** Local disk under `UPLOADS_DIR` (default `/data/uploads`)
- **AI:** Anthropic Claude, OpenAI DALL-E
- **Integrations:** Metricool, Tavily, ScapeCreators
- **Testing:** Vitest + Testing Library + jsdom
- **Rich editors:** BlockNote, Excalidraw

### Path Alias
`@/*` resolves to the project root (configured in tsconfig.json).

### Supabase-shaped DB shim
The codebase predates the refactor away from Supabase; rather than rewrite
every call site, a thin shim mirrors the `@supabase/supabase-js` surface:

| File | Role |
|------|------|
| [lib/db-shim-builder.ts](lib/db-shim-builder.ts) | Transport-agnostic `QueryBuilder` (`from().select/insert/update/delete/eq/in/order/limit/single/maybeSingle`) + `makeAuthStub`. No Node imports — safe for both bundles. |
| [lib/db-shim.ts](lib/db-shim.ts) | **Server entry.** Marked `'server-only'`. Runs SQL directly via `pg`. Exports `createClient(_url?, _key?)`. |
| [lib/db-shim-browser.ts](lib/db-shim-browser.ts) | **Browser entry.** `createBrowserClient()` returns a client that POSTs every query to `/api/db/exec`. |
| [lib/db-exec.ts](lib/db-exec.ts) | Shared SQL executor used by both the server shim and the `/api/db/exec` proxy. Whitelists every identifier via `IDENT_RE`. |

Server code:
```ts
import { createClient } from '@/lib/db-shim'
const db = createClient()
const { data, error } = await db.from('ideas').select('*').eq('status', 'IDEA').single()
```

The exposed `createClient(url, key)` ignores both args — connection is always
`DATABASE_URL`. The auth methods are stubs (no per-user auth); `signOut()` on
the browser shim POSTs `/api/logout` to clear the session cookie.

### Authentication
Single shared password — no per-user accounts.

- **[middleware.ts](middleware.ts)** gates every non-public path. Public paths:
  `/login`, `/api/login`, `/api/logout`, `/api/cron/*`, `/api/files/*`, static.
- **[app/api/login/route.ts](app/api/login/route.ts)** checks `DASHBOARD_PASSWORD`
  (alias: `APP_PASSWORD`) and sets a 30-day HMAC-signed `app_session` cookie.
- **[lib/session.ts](lib/session.ts)** is Edge-runtime-safe: WebCrypto HMAC,
  constant-time hex compare. Signing key: `SESSION_SECRET` (falls back to
  `CRON_SECRET` for a quick-start with one env var).

### Local-disk Storage
Replaces Supabase Storage. Same `.storage.from(bucket).{upload, getPublicUrl,
remove, createSignedUploadUrl}` surface.

- **[lib/storage-shim.ts](lib/storage-shim.ts)** writes under
  `UPLOADS_DIR/<bucket>/<key>` with atomic `.tmp → rename`, path-traversal
  protection, and HMAC-signed `PUT` tokens (`UPLOAD_SIGN_KEY`).
- **[app/api/files/[bucket]/[...path]/route.ts](app/api/files/[bucket]/[...path]/route.ts)**:
  `GET` serves files; `PUT` accepts an HMAC token for browser uploads.
- **[app/api/storage/sign/route.ts](app/api/storage/sign/route.ts)** issues
  short-lived upload URLs (session-gated).
- **[app/api/storage/remove/route.ts](app/api/storage/remove/route.ts)** deletes
  files under the bucket.

### API Routes (`app/api/`)
- Top-level `const db = createClient()` from `@/lib/db-shim` (bypasses RLS by
  virtue of running against an unrestricted Postgres connection).
- Export named `GET`/`POST`/`PATCH`/`DELETE`.
- Dynamic routes use `{ params }: { params: Promise<{ id: string }> }` (Next.js 16 async params).
- Return `NextResponse.json()` with appropriate status.

### Dashboard Pages (`app/dashboard/`)
- **Platforms:** `/youtube`, `/instagram`, `/linkedin`
- **Content:** `/ideas`, `/topics`, `/formats`
- **Analyze:** `/competitors`, `/analytics`, `/calendar`
- **Tools:** `/news`

### Core Types (`lib/types.ts`)
`Idea`, `Video`, `Asset`, `Thumbnail`, `SocialPost`, `Topic`, `Competitor`.
Status enums: `IdeaStatus`, `VideoStatus`, `SocialPostStatus`. `Platform`
covers youtube / tiktok / instagram / twitter / linkedin.

### Database
- Migrations in [migrations/](migrations/), apply with `psql` in numeric order
- `010_full_cms_schema.sql` is the consolidated CMS baseline (29 tables)
- Hard deletes with `ON DELETE CASCADE`
- Key tables: `ideas`, `videos`, `assets`, `social_posts`, `thumbnails`,
  `competitors`, `topics`
- Junction tables: `idea_platforms`, `idea_tag_links`, `video_thumbnails`
- **No RLS** — the shim runs as a single privileged DB role; the password gate
  guards access at the application layer.

### Components (`components/`)
- Mix of server (async) and client (`'use client'`) components
- Dashboard home widgets: `action-queue.tsx`, `pipeline-summary.tsx`,
  `posting-tracker.tsx`, `competitor-intel.tsx`, `content-calendar.tsx`
- Interactive: `metricool-scheduler.tsx`, `idea-node-graph.tsx`
- Realtime wrapper exists but is currently a no-op (Supabase Realtime was
  removed in the refactor — re-add via SSE or websockets if needed).

### Key Integration Patterns
- **Metricool:** Social scheduling & analytics via `METRICOOL_API_TOKEN`
- **DALL-E:** Thumbnail generation at 1792x1024 (`OPENAI_API_KEY`)
- **Tavily:** News/research API (`TAVILY_API_KEY`)
- **ScapeCreators:** Competitor tracking (`SCRAPECREATORS_API_KEY`)
- **Cron jobs:** Competitor sync, ideas autolink. Authenticated with
  `Authorization: Bearer $CRON_SECRET`.

### Removed Features (do not re-add)
- Morning Reports, AI Content Gallery / AI Studio, Agent Todos — template cleanup
- Laura/Kevin agent references — use generic names
- YouTube OAuth / LinkedIn OAuth — analytics via Metricool only
- Supabase Auth / Supabase Realtime / Supabase Storage — replaced by the shim,
  the password gate, and the local uploads volume

### Template Notes
- Public template repo — avoid hardcoding personal data (names, channel IDs, URLs)
- Integrations should fail gracefully when API keys are not configured
- `next.config.ts` has `output: 'standalone'` for the Docker image and webpack
  resolve config to handle directory paths with spaces
- Bundle split is enforced: anything importing `lib/db-shim` (server) must never
  be imported by a `'use client'` module — use `lib/db-shim-browser` for that
