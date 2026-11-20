# StanforteEdge Portal API - Fastify + Postgres + Redis (BullMQ) + Mailpit
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
    && apk add --no-cache chromium nss freetype harfbuzz fontconfig ttf-freefont ca-certificates

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096

# Workspace manifests + lockfile first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/shared/package.json apps/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/desktop/package.json apps/desktop/package.json
COPY packages/contract/package.json packages/contract/package.json

RUN pnpm install --frozen-lockfile

# Full source (only apps/api is needed at runtime, but keep the workspace layout)
COPY packages/contract packages/contract
COPY apps/api apps/api

RUN pnpm --filter @stanforte/contract build && pnpm --dir apps/api build \
    && chown -R node:node /app

ENV NODE_ENV=production \
    NODE_OPTIONS="" \
    PDF_BROWSER_PATH=/usr/bin/chromium-browser

WORKDIR /app/apps/api
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/v1/health/healthz || exit 1

# Apply pending migrations under a Postgres advisory lock (single replica wins),
# then exec the compiled app so SIGTERM propagates cleanly
CMD ["sh", "-c", "pnpm drizzle:migrate:locked && exec node -r ./path-alias-register.cjs dist/server.js"]
