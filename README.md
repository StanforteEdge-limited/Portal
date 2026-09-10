# StanforteEdge Portal

Staff portal for StanforteEdge — a monorepo with a NestJS API backend and two PWA frontends.

## Stack

| Workspace | Path | Stack |
|-----------|------|-------|
| **API** | `apps/api/` | NestJS, TypeScript, Prisma (Postgres), JWT auth, Swagger |
| **Web (PWA)** | `apps/web/` | React 18, Vite, Tailwind — browser app, no Tauri code |
| **Desktop** | `apps/desktop/` | React 18, Vite, Tailwind + Tauri 2 (native shell, tray, updates, deep links) |
| **PWA (legacy)** | `PWA/` | React 18, Vite, Redux, CKEditor, FullCalendar |
| **Shared** | `apps/shared/` | Shared TypeScript types, API clients, utilities |

**Package manager:** pnpm (v10.33.0) — do NOT use npm.

> ⚠️ `package.json` overrides pin React to 18.2.0. Installing React 19 packages will break.

## Architecture

### API (`apps/api/`)

NestJS application bootstrapped in `apps/api/src/main.ts` with:
- Global prefix `/v1`
- Swagger docs at `/docs`
- JWT auth (access + refresh tokens)
- Rate limiting on auth endpoints
- CORS configured for localhost dev origins + `CORS_ORIGINS` env
- Response envelope interceptor + global exception filter

**Modules** (24 NestJS modules in `apps/api/src/modules/`):

| Module | Purpose |
|--------|---------|
| `auth` | Login, register, invite, refresh tokens |
| `rbac` | Role/permission management |
| `users` | User CRUD |
| `requests` | Staff requests (create, approve, retire) |
| `finance` | Finance records, ledger, manual entries |
| `hr` | HR records, attendance, leave |
| `payroll` | Payroll runs |
| `workflow` | Approval workflows |
| `documents` | Document management |
| `files` | File upload/serve |
| `forms` | Dynamic forms |
| `onboarding` | HR onboarding forms |
| `notifications` | Email notifications |
| `audit` | Audit logging |
| `policies` | Policy management |
| `acknowledgements` | Policy acknowledgements |
| `organizations`, `groups`, `contacts` | Org structure |
| `projects` | Project management |
| `taxonomy` | Categories & tags |
| `work` | Work tracking |
| `admin` | Admin endpoints |
| `health` | Health check |

**Shared infrastructure** (`apps/api/src/common/`):
- `prisma/` — Database client
- `auth/` — JWT guards, decorators
- `mail/` — Nodemailer SMTP
- `pdf/` — Puppeteer PDF generation
- `http/` — Exception filter, response interceptor
- `validation/` — Custom validators

### Frontends

Both PWAs consume the same API via `apps/shared/`, which provides typed API clients, auth helpers (token storage, HTTP client), and utilities.

## Prerequisites

- **Node.js** 20+
- **pnpm** 10.33+ (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **PostgreSQL** running locally
- **(Optional) Google Chrome** for PDF generation via Puppeteer
- **(Optional) Rust** for Tauri desktop builds (`apps/desktop/`) — install via `rustup.rs`

### Tauri (desktop) prerequisites

If building the Tauri desktop app (`pnpm run tauri:build` in `apps/desktop/`), you also need:
- Rust toolchain (`rustup` + `cargo`)
- System libs: `webkit2gtk`, `libappindicator`, etc.
- See [Tauri prerequisites docs](https://v2.tauri.app/start/prerequisites/)

## Setup

### Validation script

```bash
bash scripts/check-setup.sh
```

Runs through all prerequisites and flags missing items.

### Quick start

```bash
# Install all workspace dependencies
pnpm install

# Configure environments
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env.local
# Edit apps/api/.env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Run database migrations
pnpm --filter portal-api prisma:migrate

# Seed RBAC roles & permissions
pnpm --filter portal-api seed:rbac
```

### Development

```bash
# Start API (http://localhost:3000, Swagger at /docs)
pnpm run dev:api

# Start new PWA (http://localhost:5173)
pnpm run dev:pwa2

# Start desktop app (Tauri, Vite on http://localhost:5174)
pnpm run tauri:dev

# Start legacy PWA (http://localhost:5173)
pnpm run dev:pwa
```

Pushes to `development` trigger the `Development CI` workflow before promotion to `main`.

### API Endpoints

- Base URL: `http://localhost:3000/v1`
- Health: `http://localhost:3000/v1/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`

### Seeding

```bash
pnpm --filter portal-api seed:rbac           # RBAC roles & permissions
pnpm --filter portal-api seed:first-user     # Initial admin user
pnpm --filter portal-api seed:request-categories
pnpm --filter portal-api seed:finance-requests
pnpm --filter portal-api seed:hr-leave-system
pnpm --filter portal-api seed:loans-system
pnpm --filter portal-api seed:documents
pnpm --filter portal-api seed:hr-onboarding-forms
pnpm --filter portal-api seed:release-baseline
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev:api` | Start API dev server |
| `pnpm run dev:pwa` | Start legacy PWA |
| `pnpm run dev:pwa2` | Start web PWA |
| `pnpm run dev:web` | Start web PWA |
| `pnpm run dev:desktop` | Start desktop frontend only |
| `pnpm run build:api` | Build API |
| `pnpm run build:pwa` | Build legacy PWA |
| `pnpm run build:pwa2` | Build web PWA |
| `pnpm run build:desktop` | Build desktop frontend |
| `pnpm run tauri:dev` | Start Tauri dev (desktop) |
| `pnpm run tauri:build` | Build Tauri (desktop) |
| `pnpm --filter portal-api prisma:migrate` | Run dev migrations |
| `pnpm --filter portal-api prisma:generate` | Regenerate Prisma client |

## Testing

Tests use Playwright against the web PWA (`apps/web/`). They assume the API and PWA are running locally.

```bash
# Run all e2e tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run a specific test file
npx playwright test e2e/payroll.spec.ts
```

**Test files** (`e2e/`):
- `debug.spec.ts` — Login smoke test (takes screenshots)
- `payroll.spec.ts` — HR and finance payroll list/detail views
- `payroll-e2e.spec.ts` — Full payroll flows

**Config:** `playwright.config.ts` — Chromium via MS Edge channel, base URL `http://localhost:5173`.

## Deployment

Three GitHub Actions workflows trigger on push to `main`:

### `deploy-api.yml`
- Trigger: changes to `apps/api/**`, `package.json`, or the workflow itself
- Steps: install deps, generate Prisma client, build API, SCP to server, run migrations + seeds, reload PM2
- Required secrets: `API_SSH_HOST`, `API_SSH_USER`, `API_SSH_PRIVATE_KEY`, `API_APP_DIR`
- Runs via PM2 (`apps/api/ecosystem.config.cjs`) — single instance, fork mode, 500MB limit

### `deploy-pwa.yml` (legacy PWA)
- Trigger: changes to `PWA/**` or the workflow
- Steps: install deps, build with env vars (`VITE_API_BASE_URL`, `VITE_APP_BASE_PATH`, version metadata), write `version.json`, SCP `dist/` to web server
- Required secrets: `PWA_SSH_HOST`, `PWA_SSH_USER`, `PWA_SSH_PRIVATE_KEY`, `PWA_WEB_DIR`, `PWA_API_BASE_URL`, `PWA_BASE_PATH`

### `deploy-pwa2.yml` (new PWA)
- Trigger: changes to `apps/web/**`, `apps/shared/**`, or the workflow
- Steps: install deps, build with env vars, write `version.json`, SCP `dist/` to web server
- Required secrets: same as legacy PWA plus `PWA2_WEB_DIR`, `PWA2_BASE_PATH`

## Troubleshooting

### "Cannot find module" or import errors

Prisma client needs to be regenerated after schema changes:
```bash
pnpm --filter portal-api prisma:generate
```

### Prisma migration fails

Ensure PostgreSQL is running and `DATABASE_URL` in `apps/api/.env` is correct. Test connectivity:
```bash
psql "$(grep DATABASE_URL apps/api/.env | cut -d= -f2-)"
```

### Puppeteer fails to generate PDF

Set `PDF_BROWSER_PATH` in `apps/api/.env` to a valid Chrome/Chromium path. On macOS:
```
PDF_BROWSER_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

### pnpm install fails due to lockfile version

Ensure you're on pnpm 10.33+:
```bash
corepack enable && corepack prepare pnpm@10.33.0 --activate
```

### "JWT secret must be set to non-default values"

The API refuses to start in production with default secrets. Set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `apps/api/.env`.

### Port conflicts

- API defaults to port 3000 (`PORT` in `apps/api/.env`)
- PWA dev servers default to 5173 (Vite)
- Change via env vars if ports are occupied

### Tauri build fails

Ensure Rust is installed (`rustc --version`) and system dependencies are met. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## API Reference

- **Swagger UI** (dev): `http://localhost:3000/docs` — interactive API docs, try endpoints live
- **OpenAPI JSON**: `http://localhost:3000/docs-json`
- **Postman collection**: `apps/api/postman/` — finance flow collection with env preset

## Database

See [apps/api/prisma/README.md](./apps/api/prisma/README.md) for the model reference (118 models, 13 domains).

## Design System

See [docs/design/DESIGN.md](./docs/design/DESIGN.md) — "Precision Hospitality" spec with color tokens, typography, component rules, and Material 3 token mapping.

## Other Docs

| Document | Location | Purpose |
|----------|----------|---------|
| RBAC matrix | [RBAC_ACCESS_MATRIX.md](./RBAC_ACCESS_MATRIX.md) | Role/permission mapping |
| PWA migration map | [docs/pwa-migration-map.md](./docs/pwa-migration-map.md) | Old→new UI route mapping |
| Release checklist | [docs/release-checklist.md](./docs/release-checklist.md) | Pre-launch QA checklist |
| Smoke test | [docs/launch-smoke-15min.md](./docs/launch-smoke-15min.md) | 15-min post-deploy sanity check |
| Payroll instructions | [docs/instructions/payroll.md](./docs/instructions/payroll.md) | Payroll module usage |
| Postman | [apps/api/postman/README.md](./apps/api/postman/README.md) | Finance flow API testing |

## Contributing

### Branch naming
```
<type>/<short-description>
```
Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `db` (migrations).

### PR workflow
1. Branch from `main`
2. Make changes, run relevant seed scripts if adding DB models
3. Open PR against `main`
4. Ensure CI passes (GitHub Actions)

### Commits
Conventional Commits format: `type(scope): description`  
e.g. `feat(finance): add expense report export`

## RBAC

See [RBAC_ACCESS_MATRIX.md](./RBAC_ACCESS_MATRIX.md) for the role/permission matrix.
