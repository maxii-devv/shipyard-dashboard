# Multi-stage build for Next.js 16 + React 19 with `output: 'standalone'`.
# Stage 1 installs deps with the full dev toolchain; stage 2 builds the app;
# stage 3 copies just the standalone server + static assets + the migrations
# folder into a minimal runtime image. End image ~150 MB instead of ~1 GB.

# ── Stage 1: dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# libc6-compat is needed for some prebuilt native binaries on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# `npm ci` requires the lockfile; fall back to install if it's missing so the
# template still builds on a fresh checkout that hasn't been `npm install`'d.
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/data/uploads \
    CLAUDE_HOME=/home/nextjs

# Claude Code CLI for /api/chat. The chat route shells out to `claude --print`
# instead of calling the Anthropic API directly, so model usage is billed to
# Izan's Claude subscription (via OAuth session in /home/nextjs/.claude)
# rather than per-token API credits. Installed before the USER switch so
# `npm install -g` can write to /usr/local/lib/node_modules.
# - libc6-compat: glibc shim for prebuilt native binaries
# - git, ripgrep: tools Claude Code probes for on startup; we disable them in
#   the spawn args but the CLI is quieter when they exist on PATH.
RUN apk add --no-cache libc6-compat git ripgrep \
 && npm install -g --no-audit --no-fund @anthropic-ai/claude-code

# Run as a non-root user (matches the official Next.js standalone example).
# The Claude Code session/auth lives at /home/nextjs/.claude, which is
# expected to be a host-mounted volume populated by `claude /login`.
# The CLI also reads /home/nextjs/.claude.json (project/session state) on
# every invocation. That file sits OUTSIDE the mounted volume by default and
# would be wiped on every image rebuild — symlink it INTO the volume so the
# state persists across rebuilds.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs \
 && mkdir -p /data/uploads /home/nextjs/.claude \
 && ln -sf /home/nextjs/.claude/.claude.json /home/nextjs/.claude.json \
 && chown -R nextjs:nodejs /data /home/nextjs

# `.next/standalone` already includes a pruned node_modules with only the
# runtime deps Next traced as reachable from your routes — we still ship
# `node_modules/pg` explicitly because the trace can miss conditional requires.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/migrations ./migrations

# Izan slash-command tree — copied verbatim from the parent repo via the
# `izan-runtime/` folder. Mounted at /data/izan-project so the /api/run route
# can `claude --print` with that as cwd; Claude Code then discovers the
# project-local .claude/commands/ inside it.
RUN mkdir -p /data/izan-project && chown -R nextjs:nodejs /data/izan-project
COPY --from=build --chown=nextjs:nodejs /app/izan-runtime/ /data/izan-project/

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
