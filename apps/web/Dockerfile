# StanforteEdge Web — Vite dev (default) or nginx static build (target: prod)

# ---- dev ---------------------------------------------------------------
FROM node:20-alpine AS dev
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/shared/package.json apps/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN pnpm install --frozen-lockfile

# Full source (vite aliases @stanforte/shared -> ../shared/src/index.ts)
COPY apps/web apps/web
COPY apps/shared apps/shared

EXPOSE 5173
CMD ["pnpm", "--dir", "apps/web", "dev", "--host", "0.0.0.0", "--port", "5173"]

# ---- build -------------------------------------------------------------
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/shared/package.json apps/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY apps/shared apps/shared

RUN pnpm --dir apps/web build

# ---- prod --------------------------------------------------------------
FROM nginx:1.25-alpine AS prod
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf