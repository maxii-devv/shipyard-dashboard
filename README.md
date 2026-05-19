# Shipyard — Content Dashboard

Self-hosted content management dashboard for creators managing multi-platform
content pipelines. Built with Next.js 16, React 19, PostgreSQL, and DaisyUI 5.

Deploys as a single Docker container against your own Postgres and a local
uploads volume — no Supabase, no Vercel, no third-party storage.

## Features

- Idea pipeline, video / social post drafting, thumbnail studio
- Content calendar + analytics across YouTube / Instagram / LinkedIn (via Metricool)
- Competitor tracking (via ScapeCreators), curated news feed (via Tavily)
- AI-assisted captions and insights (Anthropic Claude) and thumbnail generation (OpenAI DALL-E)
- Cron jobs for competitor sync and idea cross-linking
- Built-in password gate (single shared password, HMAC-signed session cookie)
- Local-disk file storage with HMAC-signed upload URLs — no S3, no Supabase Storage

## Architecture

The app talks to two backends:

- **PostgreSQL** via `pg` connection pool (`DATABASE_URL`). Database access goes
  through a thin Supabase-shaped query builder ([lib/db-shim.ts](lib/db-shim.ts)
  server / [lib/db-shim-browser.ts](lib/db-shim-browser.ts) browser) so call
  sites still read like `db.from('table').select(...).eq(...)`.
- **Local disk** under `UPLOADS_DIR` (default `/data/uploads`), served by
  [app/api/files/[bucket]/[...path]/route.ts](app/api/files/[bucket]/[...path]/route.ts)
  and written via short-lived HMAC-signed `PUT` URLs.

There is no per-user auth — a single shared password (`DASHBOARD_PASSWORD`)
unlocks the dashboard and the cookie is verified by [middleware.ts](middleware.ts)
on every non-public request.

## Quick Start (Docker)

```bash
# 1. Bring up Postgres (any way you like — local, managed, your existing cluster)
# 2. Build & run the dashboard, pointing it at that Postgres
docker build -t shipyard-dashboard .
docker run -d --name shipyard \
  -p 3000:3000 \
  -v shipyard-uploads:/data/uploads \
  -e DATABASE_URL='postgres://user:pass@host:5432/db' \
  -e DASHBOARD_PASSWORD='change-me' \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e UPLOAD_SIGN_KEY="$(openssl rand -hex 32)" \
  -e CRON_SECRET="$(openssl rand -hex 32)" \
  -e NEXT_PUBLIC_BASE_URL='https://your-domain.example' \
  shipyard-dashboard
```

Then apply the schema (one-time):

```bash
psql "$DATABASE_URL" -f migrations/010_full_cms_schema.sql
```

Open `http://localhost:3000`, log in with the password you set above.

## Quick Start (local dev)

```bash
git clone <your-fork-url>
cd shipyard-dashboard
npm install
cp .env.example .env.local        # then fill in DATABASE_URL + password
npm run dev                       # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string (e.g. `postgres://user:pass@host:5432/db`) |
| `DASHBOARD_PASSWORD` | Yes | Shared password for the login page (alias: `APP_PASSWORD`) |
| `SESSION_SECRET` | Recommended | 32-byte hex secret for signing session cookies. Falls back to `CRON_SECRET`. |
| `UPLOAD_SIGN_KEY` | Recommended | 32-byte hex secret for signing upload URLs. Falls back to `CRON_SECRET`. |
| `CRON_SECRET` | Recommended | Bearer token for `/api/cron/*` endpoints. Doubles as fallback session/upload key. |
| `UPLOADS_DIR` | No | Where uploaded files live on disk. Default `/data/uploads` (Docker) / `./uploads` (local). |
| `NEXT_PUBLIC_BASE_URL` | No | Absolute origin for generated URLs (e.g. signed upload URLs). |
| `ANTHROPIC_API_KEY` | No | Enables AI captions & insights |
| `OPENAI_API_KEY` | No | Enables AI thumbnail generation (DALL-E) |
| `METRICOOL_API_TOKEN` | No | Social scheduling & analytics |
| `SCRAPECREATORS_API_KEY` | No | Competitor tracking |
| `TAVILY_API_KEY` | No | News feed |

See [`.env.example`](.env.example) for the full list.

## Project Structure

```
app/
  api/                # API routes (videos, ideas, social, competitors, cron, …)
    db/exec/          # JSON-RPC proxy used by the browser-side db shim
    files/            # File serving + HMAC PUT for the uploads volume
    storage/          # sign / remove helpers for the storage shim
    login/, logout/   # Session lifecycle
  dashboard/          # Dashboard pages (ideas, videos, calendar, analytics, …)
  login/              # Password login page
components/           # React components (60+)
lib/
  db-exec.ts          # Server-side SQL executor
  db-shim.ts          # Server entry of the Supabase-shaped shim
  db-shim-browser.ts  # Browser entry (proxies through /api/db/exec)
  db-shim-builder.ts  # Shared transport-agnostic QueryBuilder
  storage-shim.ts     # Local-disk replacement for Supabase Storage
  session.ts          # Edge-safe HMAC session cookies
migrations/           # SQL migrations (apply with psql)
middleware.ts         # Password gate
Dockerfile            # 3-stage standalone build
```

## Database Migrations

Migrations live in [migrations/](migrations/). Apply them in numeric order against
your `DATABASE_URL` — `010_full_cms_schema.sql` is the consolidated baseline for
the dashboard's CMS tables.

```bash
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

## Customization

- **Branding:** logo / name in [components/sidebar.tsx](components/sidebar.tsx)
  (search for "Shipyard") and [app/login/page.tsx](app/login/page.tsx)
- **Integrations:** swap Metricool / ScapeCreators / Tavily by editing the
  matching routes under [app/api/](app/api/) — each is self-contained
- **Theme:** [app/globals.css](app/globals.css) for the DaisyUI dark theme

## License

[CC BY-NC 4.0](LICENSE) — free to use and modify, but not for commercial purposes.
