# Testing Guide - StanforteEdge Portal

This guide outlines how to run unit tests, integration tests, and browser E2E tests for the StanforteEdge Portal project.

---

## Prerequisites

1. **Node.js** (v20+) & **pnpm** (v10.33+ via `corepack`)
2. **Docker & Docker Compose** (for running PostgreSQL, Redis, and Mailpit during integration/e2e tests)

---

## 1. Running Dependent Services

Start the dependent services:
```bash
docker compose up -d postgres redis mailpit
```

Run database migrations:
```bash
corepack pnpm --filter portal-api-fastify drizzle:migrate
```

---

## 2. Unit Tests

Unit tests are written using **Vitest** and located in `apps/api/test/unit/**/*.spec.ts`.

To run all unit tests:
```bash
corepack pnpm run test:unit
```

To run a specific unit test file:
```bash
corepack pnpm --filter portal-api-fastify test:unit test/unit/identity/auth/jwt.service.spec.ts
```

---

## 3. Integration Tests

Integration tests run against a running PostgreSQL/Redis test instance:
```bash
corepack pnpm run test:e2e
```

---

## 4. Browser End-to-End Tests (Playwright)

Browser E2E tests are located in root `e2e/**/*.spec.ts`.

1. Ensure the API (`pnpm dev:api`) and Web frontend (`pnpm dev:web`) are running.
2. Run Playwright tests:
```bash
corepack pnpm run test:playwright
```
