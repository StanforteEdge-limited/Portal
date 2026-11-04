# StanforteEdge Portal

Staff portal for StanforteEdge — a monorepo with a Fastify API backend, shared contracts, and PWA / Desktop frontends.

## Stack

| Workspace | Path | Stack |
|-----------|------|-------|
| **API** | `apps/api/` | Fastify 5, TypeScript, Drizzle ORM (PostgreSQL), JWT auth, BullMQ, Socket.io |
| **Web (PWA)** | `apps/web/` | React 18, Vite, Tailwind CSS — browser app |
| **Desktop** | `apps/desktop/` | React 18, Vite, Tailwind CSS + Tauri 2 (native desktop shell) |
| **Shared** | `apps/shared/` | Shared TypeScript frontend utilities, auth helpers, API services |
| **Contracts** | `packages/contract/` | Shared TypeBox schemas and TypeScript DTOs/types |

**Package manager:** pnpm (v10.33.0 via Corepack).

> ⚠️ `package.json` overrides pin React to 18.2.0. Installing React 19 packages will cause incompatibilities.

## Architecture

### API (`apps/api/`)

Fastify application bootstrapped in `apps/api/src/server.ts` with:
- Global prefix `/v1`
- JWT auth (access + refresh tokens)
- Tenant isolation & RBAC checks
- Redis rate limiting and background queues (BullMQ)
- Drizzle ORM client with PostgreSQL
- Socket.io for real-time messaging and presence

**Modules** (located in `apps/api/src/apps/`):
- `identity`: Auth, RBAC, Users, Audit
- `tenancy`: Multi-tenant organization and workspace context
- `hr`: Employees, Onboarding, Attendance, Leave, Payroll, Policies, Projects, Requests, Tasks, Timesheets, Workflow
- `finance`: Accounting, Procurement, Purchase Orders, Vendor Portal
- `crm`: Accounts, Activities, Contacts, Leads, Opportunities, Pipelines
- `communication`: Chat, Mail (IMAP/SMTP/Sync), Groups
- `storage`: Presigned S3 file uploads and downloads
- `platform`: Health check, Version, Billing

## Prerequisites

- **Node.js** 20+
- **pnpm** 10.33+ (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **PostgreSQL** running locally (or via Docker Compose)
- **Redis** running locally (or via Docker Compose)
- **(Optional) Rust** for Tauri desktop builds (`apps/desktop/`) — install via `rustup.rs`

## Quick Start

### 1. Start Dependent Services

```bash
docker compose up -d postgres redis mailpit
```

### 2. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env.local
```

### 3. Build Shared Contracts & Generate Schema

```bash
pnpm run build:contract
pnpm --filter portal-api-fastify drizzle:generate
pnpm --filter portal-api-fastify drizzle:migrate
```

### 4. Development

```bash
# Start API (http://localhost:3000/v1)
pnpm run dev:api

# Start Web PWA (http://localhost:5173)
pnpm run dev:web

# Start Desktop App (Tauri)
pnpm run tauri:dev
```

## Testing

```bash
# Run unit tests across API (Vitest)
pnpm run test:unit

# Run integration tests (Vitest)
pnpm run test:e2e

# Run Playwright browser tests
pnpm run test:playwright
```

## Contributing & PRs

1. Branch from `development` or `main`.
2. Ensure `pnpm run build:contract`, `pnpm run build:api`, and `pnpm run build:web` pass.
3. Ensure unit tests pass (`pnpm run test:unit`).
