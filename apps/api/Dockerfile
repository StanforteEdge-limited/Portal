# StanforteEdge Portal API — NestJS + Postgres + Redis (BullMQ) + Mailpit
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
    && apk add --no-cache chromium nss freetype harfbuzz fontconfig ttf-freefont ca-certificates

WORKDIR /app

# Workspace manifests + lockfile first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/shared/package.json apps/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN pnpm install --frozen-lockfile

# Full source (only apps/api is needed at runtime, but keep the workspace layout)
COPY apps/api apps/api

RUN pnpm --dir apps/api build

ENV NODE_ENV=production \
    PDF_BROWSER_PATH=/usr/bin/chromium-browser

WORKDIR /app/apps/api
EXPOSE 3000

# Apply pending migrations (drizzle-kit migrate) then boot the compiled app
CMD ["sh", "-c", "pnpm drizzle:migrate && node -r ./path-alias-register.js dist/main.js"]