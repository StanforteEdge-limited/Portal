# Testing Guide - StanforteEdge Portal

This guide outlines how to run unit tests, API integration/e2e tests, and browser E2E tests for the StanforteEdge Portal project.

---

## Prerequisites

1. **Node.js** (v20+) & **pnpm** (v10+)
2. **Docker & Docker Compose** (for running PostgreSQL, Redis, and Mailpit during integration/e2e tests)

---

## 1. Running Services for Integration & E2E Tests

Start the dependent services (PostgreSQL, Redis, Mailpit):
```bash
docker compose up -d postgres redis mailpit
```

Run database migrations and seed data (if required for API e2e tests):
```bash
pnpm --filter portal-api prepare:runtime
```

---

## 2. Unit Tests

Unit tests are located in `apps/api/src/**/*.spec.ts`. They test individual services, domain logic, and tenant isolation logic in isolation using mocks.

To run all unit tests:
```bash
pnpm test:unit
```

To run a specific unit test:
```bash
pnpm --filter portal-api npx jest health.service.spec.ts
```

---

## 3. API End-to-End (E2E) Tests

API E2E tests are located in `apps/api/test/e2e/**/*.e2e-spec.ts`. They perform real HTTP requests against a running API instance, exercising routes, guards, controllers, services, and the database/Redis.

1. Start the API server:
   ```bash
   pnpm --filter portal-api dev
   ```
   *(Or set `E2E_API_URL` to point to your running API instance, e.g., `http://localhost:3000/v1`)*

2. Run the API E2E test suite:
   ```bash
   pnpm test:e2e
   ```

---

## 4. Browser End-to-End Tests (Playwright)

Browser E2E tests are located in root `e2e/**/*.spec.ts`.

1. Ensure the API and Web frontend are running (or configured in `playwright.config.ts`).
2. Run Playwright tests:
   ```bash
   pnpm test:playwright
   ```

---

## CI/CD Integration

In CI pipelines (GitHub Actions, GitLab CI, etc.), recommended steps are:
1. Spin up services via `docker compose up -d`
2. Install dependencies: `pnpm install --frozen-lockfile`
3. Run unit tests: `pnpm test:unit`
4. Run migrations/seed: `pnpm --filter portal-api prepare:runtime`
5. Start API & run API E2E tests: `pnpm test:e2e`
