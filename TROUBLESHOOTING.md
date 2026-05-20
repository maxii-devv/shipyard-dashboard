# Troubleshooting & Runbook

Quick reference for "is this broken or is it supposed to do that?" decisions, and the
commands you actually need when something does break. Written after Phase A (source-code
hardening, commit `0e5a6d4`, 2026-05-20) and Phase B (public HTTPS via nginx + Let's
Encrypt, 2026-05-20).

If you're new to the codebase, skim **[Things That Look Broken But Aren't](#things-that-look-broken-but-arent)** first — that's where most "is the dashboard down?" panic dies.

---

## Deployment Facts

| Thing | Value |
|---|---|
| Dashboard URL (public, HTTPS) | `https://izan.62-171-142-52.nip.io` |
| Dashboard URL (Tailscale, HTTP) | `http://100.102.77.38:3000` (still works for direct/internal access) |
| TLS cert | Let's Encrypt, issuer `E8`. Files in `/etc/letsencrypt/live/izan.62-171-142-52.nip.io/` on the VPS. Auto-renews via certbot's systemd timer. |
| VPS public IP | `62.171.142.52` (Contabo-ish, treat as the canonical IP) |
| Reverse proxy | host-level nginx, vhost at `/etc/nginx/sites-available/izan-shipyard` (auto-edited by certbot to add 443 + redirect) |
| VPS app dir | `/izan/app` (the `izan-dashboard` repo checked out here) |
| GitHub repo | `maxii-devv/izan-dashboard` (renamed from `shipyard-dashboard` on 2026-05-21; GitHub redirects the old URL for now, both local + VPS git remotes already updated) |
| Container name | `izan-app` |
| DB container | `izan-db` (PostgreSQL 17) |
| Backup dir | `/izan/app.bak-20260520-001827` (delete after stability soak) |
| Other tenants on this VPS | `pholoh-dashboard` (default nginx vhost serving `/PHOLOH/infra/dashboard`) + `pholoh-postgres` / `pholoh-redis` / `pholoh-portainer` containers. **Do not break these.** |
| SSH | Tailscale IP only (`bodi@100.102.77.38`), key auth via `~/.ssh/izan_vps`, sudo password lives in your password manager. Port 22 is publicly firewalled. **Do not change.** |
| UFW rules (incoming) | `41641/udp` (Tailscale), `100.121.116.62` (mintos peer, full), `100.122.58.31` (omarchy-ntb peer, full), `80/tcp` (ACME + HTTP→HTTPS redirect), `443/tcp` (HTTPS). Default: deny. |

The same code runs in dev (`npm run dev` in this dir) and in prod. The Docker image
is built from this dir's `Dockerfile` with `output: 'standalone'`.

---

## Things That Look Broken But Aren't

### `/api/metricool/*` returns 503 on `/dashboard/analytics`

**By design.** Metricool env vars (`METRICOOL_API_TOKEN`, `METRICOOL_USER_ID`,
`METRICOOL_BLOG_ID`) are deliberately unset. User policy is "no third-party SaaS;
build in-house." The route at [app/api/metricool/route.ts:10-12](app/api/metricool/route.ts#L10-L12)
short-circuits with 503 when those vars are missing.

The Analytics page renders fine; the cross-platform stat widgets just stay empty.
To restore: either fill the env vars (re-enables Metricool integration), or replace
those widgets with our own scrapers/feeds.

### `/dashboard/system`, `/dashboard/tag`, `/dashboard/review` return 404

Placeholders. Marked `disabled: true` in [components/sidebar.tsx:63-65](components/sidebar.tsx#L63-L65)
so they're not clickable in the UI. You'll only hit the 404 by typing the URL.

### `/dashboard/videos` (bare) returns 404

No `page.tsx` at that level. The real entry points are `/dashboard/videos/new` and
`/dashboard/videos/[id]`. Nothing in the UI links to bare `/dashboard/videos`.

### `Could not connect to database. The server does not support SSL connections.`

The pg pool tried to negotiate SSL against the in-stack `izan-db` container which
doesn't accept it. Fix: ensure `DATABASE_SSL=disable` is set in the container env
(see `docker-compose.yml` on VPS or `.env`). [lib/db.ts](lib/db.ts) and
[lib/backend/db.ts](lib/backend/db.ts) both respect this — if you see the error,
one of them got out of sync or the env var didn't propagate.

### Logged out unexpectedly after env change

Cookie clear attributes must match the set attributes. If you toggle `COOKIE_SECURE`
between deploys (e.g. flipping to HTTPS), existing sessions become un-clearable until
they expire naturally because the browser refuses to delete a cookie whose attrs
don't match. See [app/api/logout/route.ts:1-3](app/api/logout/route.ts#L1-L3).

### Tab title says `Viral Coach — @madebyizan` even though the project is renamed

Cosmetic. Title is hardcoded in `app/layout.tsx`. Parameterise via env when convenient.

---

## When Login Won't Work

1. **Are you locked out?** Check the rate-limit table:
   ```bash
   docker exec -i izan-db psql -U postgres -d postgres -c \
     "SELECT ip, count(*) FILTER (WHERE NOT success) AS fails, max(created_at) AS last
      FROM login_attempts
      WHERE created_at > now() - interval '15 minutes'
      GROUP BY ip ORDER BY fails DESC;"
   ```
   Default lockout: 20 failures per 15 minutes per IP. To clear your own lockout:
   ```bash
   docker exec -i izan-db psql -U postgres -d postgres -c \
     "DELETE FROM login_attempts WHERE ip = 'YOUR.IP.HERE' AND NOT success;"
   ```
   See [lib/security/rate-limit.ts](lib/security/rate-limit.ts).

2. **Cross-origin rejection (403, not 401)?** Origin/Referer didn't match the
   allowed list. Set `ALLOWED_ORIGINS` in env (comma-separated, scheme+host+port,
   no path). Without it, only the request's own `Host` header counts as same-origin.
   See [lib/security/origin.ts](lib/security/origin.ts).

3. **Cookie not setting?** If `COOKIE_SECURE=1` and you're on plain HTTP, browsers
   will silently drop the cookie. Production is HTTPS (`https://izan.62-171-142-52.nip.io`)
   so this is fine. Only flip to `0` if you're testing on the bare Tailscale
   `http://100.102.77.38:3000` URL — and remember to flip it back.

4. **`?next=` redirects you back to `/dashboard` instead of the requested path?**
   That's [app/login/page.tsx:14-22](app/login/page.tsx#L14-L22) `safeNext()` rejecting
   the value. Only same-origin relative paths (`/foo/bar`) are accepted.

5. **Real password but still 401?** Compare `DASHBOARD_PASSWORD` env in the running
   container (`docker exec izan-app env | grep DASHBOARD_PASSWORD`) against what
   you're typing. Constant-time compare via `crypto.timingSafeEqual` means a single
   char difference fails.

---

## When the Dashboard Renders But Numbers Look Wrong

### Empty / zero metrics on a recent post

Usually the IG Insights `views` vs `plays` gotcha (see [CLAUDE.md → Instagram Insights API Gotchas](../CLAUDE.md)). If a sync ran with the wrong metric name, the entire insights call returns non-OK and the post is written with all zeros while caption/permalink still sync correctly.

Detect it:
```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  node -e "const {Client}=require('pg'); const c=new Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}); c.connect().then(()=>c.query(\"SELECT instagram_media_id, caption, views, likes FROM content_performance WHERE views=0 AND likes=0 ORDER BY post_timestamp DESC LIMIT 10\")).then(r=>console.table(r.rows)).finally(()=>c.end())"
```

Fix: re-trigger the sync once the metric list is correct, or patch the stale rows
directly. `getMyMedia(limit)` only refreshes the N most recent posts — older rows
won't auto-heal.

### Dashboard render is fine but client API call 500s

```bash
# On the VPS:
docker logs --tail=200 izan-app
```

Look for the sanitised log line:
```
[db/exec] table=<x> action=<y> err=<real pg message>
```
That's [app/api/db/exec/route.ts:35](app/api/db/exec/route.ts#L35) — the client only sees
`"database error"` (intentional, schema fingerprinting defence), but the real
message is in the container logs.

---

## When `/api/db/exec` 4xx's the Browser

| Status | Meaning |
|---|---|
| 400 `invalid request` | Body was malformed JSON or over the 1 MiB cap |
| 403 (from middleware) | Cross-origin POST blocked — Origin/Referer mismatch |
| 401 (from middleware) | Session cookie missing or invalid |
| 200 with `{ error: { message: "database error" } }` | pg threw something — check `docker logs izan-app` |
| 200 with `{ error: { code: "PGRST116" } }` | "No rows found" from `.single()` — call sites depend on this, not actually an error |

---

## When `/api/storage/sign` 4xx's

| Status | Meaning |
|---|---|
| 400 `bucket and path required` | Body missing fields |
| 400 `invalid bucket` | Bucket name failed regex `/^[a-z0-9_\-]+$/i` |
| 403 `bucket not allowed` | Bucket not in `ALLOWED_BUCKETS` env (defaults: `thumbnails, assets, video-attachments, social-media-files, supporting-media, blog-assets, knowledge-base`) |
| 400 `path too long` | Key exceeds 512 chars |
| 400 `invalid path` | Path contains `..` traversal or NUL byte |

To add a bucket, append to `ALLOWED_BUCKETS` env (override the defaults) and
restart the container.

---

## TLS / Public-Access Operations

### "The site says cert expired / wrong" — force renewal

```bash
# On VPS:
sudo certbot renew --force-renewal -d izan.62-171-142-52.nip.io
sudo systemctl reload nginx
```
Auto-renewal runs twice daily via the `snap.certbot.renew.timer` systemd unit;
manual force-renewal is only for emergencies. Real expiry is in
`/etc/letsencrypt/live/izan.62-171-142-52.nip.io/cert.pem` — read with
`openssl x509 -enddate -noout -in <path>`.

### Confirm cert from outside

```bash
echo | openssl s_client -servername izan.62-171-142-52.nip.io \
  -connect izan.62-171-142-52.nip.io:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

### "External users can't reach the site"

Walk through this in order:

1. **DNS resolves?** `dig +short izan.62-171-142-52.nip.io` → should return `62.171.142.52`. (nip.io is a public wildcard-DNS service; if it returns nothing, nip.io is down — fall back to `izan.62-171-142-52.sslip.io` by adding a new nginx `server_name` + cert. **Note:** sslip.io's Let's Encrypt registered-domain rate limit was exhausted on 2026-05-20 — wait for the 168h window to clear before re-issuing certs on `*.sslip.io`.)
2. **UFW open?** On VPS: `sudo ufw status numbered` → must show `80/tcp ALLOW` and `443/tcp ALLOW`.
3. **nginx running?** `sudo systemctl status nginx`.
4. **nginx config valid?** `sudo nginx -t`.
5. **izan-app container up?** `docker ps --filter name=izan-app`.
6. **Loopback proxy works?** From the VPS: `curl -sI -H 'Host: izan.62-171-142-52.nip.io' http://127.0.0.1/`. If this fails, the issue is the vhost — check `/etc/nginx/sites-enabled/izan-shipyard`.

### Change the public hostname

1. Pick the new hostname (own domain or another nip.io / sslip.io form).
2. Add an A record (or use a wildcard-DNS service's IP-in-hostname format like `<prefix>.<dashed-ip>.nip.io`).
3. On VPS, edit `/etc/nginx/sites-available/izan-shipyard` — replace the `server_name` line and add any new `server_name` to the `listen 443 ssl` block too.
4. `sudo certbot --nginx -d <new-hostname>`.
5. Update `/izan/.env`: `NEXT_PUBLIC_BASE_URL` and `ALLOWED_ORIGINS` to the new HTTPS URL.
6. `cd /izan && docker compose up -d --force-recreate --no-deps izan-app`.

### Roll back to "Tailscale-only" emergency mode

```bash
# On VPS:
sudo ufw delete allow 80/tcp
sudo ufw delete allow 443/tcp
sudo systemctl stop nginx     # optional; keeps pholoh dashboard reachable to peers via Tailscale via 100.102.77.38:80
```
The dashboard is still reachable at `http://100.102.77.38:3000` via Tailscale.
Re-enable later with `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp` and
`sudo systemctl start nginx`.

---

## Container / Build Operations

### Rebuild after pushing code

```bash
# On VPS:
cd /izan
git -C app pull
docker compose up -d --build izan-app
docker logs -f --tail=50 izan-app
```

### Restart without rebuild (env change only)

```bash
docker compose up -d izan-app
```

### Tail logs

```bash
docker logs -f --tail=200 izan-app   # app
docker logs -f --tail=200 izan-db    # postgres
```

### Run a one-off SQL

```bash
docker exec -i izan-db psql -U postgres -d postgres -c "SELECT 1;"
```

### Apply a new migration

```bash
docker exec -i izan-db psql -U postgres -d postgres < /izan/app/migrations/XXX_name.sql
```

### Disk reclaim

```bash
docker builder prune -af
docker image prune -af
# Then verify nothing critical was hit:
docker ps --format '{{.Names}}\t{{.Status}}'
```

### Roll back to backup

```bash
cd /izan
docker compose down izan-app
mv app app.broken
mv app.bak-20260520-001827 app  # adjust filename for the backup you want
docker compose up -d --build izan-app
```

---

## Phase A Security Inventory (what's hardened, where)

| Concern | File | Notes |
|---|---|---|
| Brute-force login | [lib/security/rate-limit.ts](lib/security/rate-limit.ts), [migrations/011_login_attempts.sql](migrations/011_login_attempts.sql) | 20 fails / 15 min default. Tune via `LOGIN_MAX_FAILURES_PER_WINDOW`, `LOGIN_LOCKOUT_WINDOW_SEC`. |
| Timing attacks on password | [app/api/login/route.ts](app/api/login/route.ts) | `timingSafeEqual` + 100–300ms jitter on every branch |
| CSRF (DiD over SameSite=Lax) | [lib/security/origin.ts](lib/security/origin.ts), [middleware.ts](middleware.ts) | Origin or Referer must match host or `ALLOWED_ORIGINS` env |
| Open redirect via `?next=` | [app/login/page.tsx:14-22](app/login/page.tsx#L14-L22) | `safeNext()` blocks `//`, `/\`, `/login`, control chars |
| Schema fingerprinting via pg errors | [app/api/db/exec/route.ts](app/api/db/exec/route.ts) | Logs real msg, returns generic |
| Body-size DoS | [lib/security/body-limit.ts](lib/security/body-limit.ts) | 1 MiB cap on `/api/db/exec`, 4 KB on `/api/login` & `/api/storage/sign` |
| Storage bucket abuse | [app/api/storage/sign/route.ts](app/api/storage/sign/route.ts) | Allowlist via `ALLOWED_BUCKETS` env |
| Path traversal in uploads | [app/api/storage/sign/route.ts:59](app/api/storage/sign/route.ts#L59) | Explicit `..` + NUL rejection (storage shim also rejects, this fails earlier with clearer 400) |
| XFO / CSP / Referrer-Policy / HSTS | [lib/security/headers.ts](lib/security/headers.ts) | Applied via middleware on every response. HSTS only when scheme is HTTPS. |
| Server fingerprint | [next.config.ts:11](next.config.ts#L11) | `poweredByHeader: false` + explicit delete in headers |
| Bot scanner spam | [middleware.ts](middleware.ts) | Fast-404 regex before any handler runs |
| IP source trust | [app/api/login/route.ts](app/api/login/route.ts) `clientIp()` | XFF only honoured when `TRUST_PROXY=1` (set this once you're behind Caddy/Cloudflare) |

### Required env (production)

```
DATABASE_URL=postgresql://...
DATABASE_SSL=disable        # for in-stack postgres; omit for hosted pg with SSL
DASHBOARD_PASSWORD=<long random>
SESSION_SECRET=<32+ random bytes hex>
UPLOAD_SIGN_KEY=<32+ random bytes hex>
CRON_SECRET=<long random>
COOKIE_SECURE=1             # set to 0 only for plain-HTTP testing
TRUST_PROXY=1               # only when behind a trusted reverse proxy
NEXT_PUBLIC_BASE_URL=https://your.domain
```

Optional:
```
ALLOWED_ORIGINS=https://your.domain,https://other.domain
ALLOWED_BUCKETS=thumbnails,assets,...
LOGIN_MAX_FAILURES_PER_WINDOW=20
LOGIN_LOCKOUT_WINDOW_SEC=900
```

---

## Known Pending Work

These aren't bugs, but they will trip up future-you if forgotten:

- **Two pg pools** — [lib/db.ts](lib/db.ts) and [lib/backend/db.ts](lib/backend/db.ts) maintain separate `Pool` instances. They were aligned on SSL handling in commit `206dc12` but they're still two pools. Consolidate when convenient.
- **`ANTHROPIC_API_KEY` placeholder** on VPS — AI captions / insights routes 500 until set.
- **Port 3000 still bound to Tailscale (`100.102.77.38:3000`)** in addition to `127.0.0.1`. Nothing public reaches it (UFW doesn't allow 3000 inbound) but the duplicate binding is redundant now that nginx is the public front door. Drop the Tailscale-IP binding in `docker-compose.yml` next time the file is touched.
- **`bun.lock` still committed** even though the build standardised on npm.
- **`dashboard-realtime-wrapper.tsx`** is a no-op — either remove or re-implement via SSE.
- **Tab title** hardcoded to `Viral Coach — @madebyizan` in `app/layout.tsx`.

---

## When in doubt

1. `docker logs --tail=200 izan-app` on the VPS — sanitised pg errors land here with full detail.
2. Browser DevTools → Network — Phase A doesn't change response shapes; if the dashboard's misbehaving client-side it'll still show in the Network tab.
3. `docker exec -i izan-db psql -U postgres -d postgres` — direct DB access.
4. Roll back to `/izan/app.bak-<timestamp>/` if a deploy clearly broke things (see Roll back section).
