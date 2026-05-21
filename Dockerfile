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
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh nextjs \
 && mkdir -p /data/uploads /home/nextjs/.claude \
 && chown -R nextjs:nodejs /data /home/nextjs

# `.next/standalone` already includes a pruned node_modules with only the
# runtime deps Next traced as reachable from your routes — we still ship
# `node_modules/pg` explicitly because the trace can miss conditional requires.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/migrations ./migrations

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
