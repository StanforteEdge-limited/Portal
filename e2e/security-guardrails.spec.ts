import { test, expect, request, type APIRequestContext } from '@playwright/test';

/**
 * End-to-end negative integration & security guardrail tests against the running Portal API.
 *
 * Covers:
 *  1. Multi-Tenant Isolation (files, documents, employees, payroll, storage_path prefix)
 *  2. Role-Based Access Control (RBAC) & Workflow Integrity (Finance, Procurement, Payroll, Admin, Profile, Self-approval)
 *  3. Concurrency & Business Logic Integrity (atomic refresh rotation, attendance source/timestamp stripping)
 *  4. Authentication & Rate-Limit Verification (malformed/opaque tokens, OAuth state CSRF, forgot-password 429)
 *  5. Input Validation & File Upload Guardrails (pagination/search bounds, non-UUID lookup, upload size schema)
 *
 * Run:
 *   npx playwright test e2e/security-guardrails.spec.ts
 */

const BASE = (process.env.API_BASE_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@stanforte.com';
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'staff@stanforte.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123!';

// Non-existent / foreign-tenant placeholder IDs
const FOREIGN_UUID = '00000000-0000-4000-8000-000000009999';
const FOREIGN_NUMERIC_ID = '999999999';

test.describe.configure({ mode: 'serial' });

let admin: APIRequestContext;
let staff: APIRequestContext;
let anon: APIRequestContext;

async function api(
  ctx: APIRequestContext,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
) {
  const res = await ctx.fetch(`${BASE}${path}`, {
    method,
    data: body,
    maxRedirects: 0,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(extraHeaders ?? {}),
    },
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status(), ok: res.ok(), headers: res.headers(), json };
}

test.beforeAll(async () => {
  admin = await request.newContext({ baseURL: BASE });
  staff = await request.newContext({ baseURL: BASE });
  anon = await request.newContext({ baseURL: BASE });

  const health = await api(anon, 'GET', '/health');
  expect(health.status, 'API health check must be 200').toBe(200);

  const adminLogin = await api(admin, 'POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: PASSWORD,
  });
  expect([200, 201]).toContain(adminLogin.status);

  const staffLogin = await api(staff, 'POST', '/auth/login', {
    email: STAFF_EMAIL,
    password: PASSWORD,
  });
  expect([200, 201]).toContain(staffLogin.status);
});

test.afterAll(async () => {
  await admin?.dispose();
  await staff?.dispose();
  await anon?.dispose();
});

/* ==========================================================================
   1. Multi-Tenant Isolation Tests
   ========================================================================== */
test.describe('1. Multi-Tenant Isolation', () => {
  test('rejects cross-tenant file presign-download and delete with 404', async () => {
    const dl = await api(staff, 'GET', `/files/${FOREIGN_UUID}/presign-download`);
    expect(dl.status).toBe(404);

    const del = await api(staff, 'DELETE', `/files/${FOREIGN_UUID}`);
    expect(del.status).toBe(404);
  });

  test('rejects cross-tenant document read with 404', async () => {
    const doc = await api(staff, 'GET', `/documents/${FOREIGN_UUID}`);
    expect(doc.status).toBe(404);
  });

  test('rejects cross-tenant employee and payroll run access with 404 even for tenant admin', async () => {
    const emp = await api(admin, 'GET', `/employees/${FOREIGN_NUMERIC_ID}`);
    expect(emp.status).toBe(404);

    const run = await api(admin, 'GET', `/payroll/runs/${FOREIGN_UUID}`);
    expect(run.status).toBe(404);
  });

  test('blocks attaching a storage_path belonging to another tenant prefix with 403', async () => {
    const attach = await api(staff, 'POST', '/files/attach', {
      file_name: 'cross-tenant.pdf',
      storage_path: 'tenants/999999/files/foreign-document.pdf',
    });
    expect(attach.status).toBe(403);
  });

  test('blocks attaching a file_url without a valid tenant-scoped storage_path with 400 or 403', async () => {
    const attach = await api(staff, 'POST', '/files/attach', {
      file_name: 'external.pdf',
      file_url: 'https://example.com/arbitrary.pdf',
    });
    expect([400, 403]).toContain(attach.status);
  });
});

/* ==========================================================================
   2. Role-Based Access Control (RBAC) & Workflow Integrity
   ========================================================================== */
test.describe('2. RBAC & Workflow Integrity', () => {
  test('standard employee receives 403 on restricted Finance, Procurement, Payroll, Admin & Storage folder routes', async () => {
    const restrictedCalls: Array<[string, string, unknown?]> = [
      ['POST', `/finance/requests/${FOREIGN_NUMERIC_ID}/disburse`, { amount: 100 }],
      ['POST', `/finance/budgets/${FOREIGN_UUID}/approve`, {}],
      ['GET', '/finance/ledger/export'],
      ['PUT', '/finance/settings', {}],
      ['POST', `/procurement/orders/${FOREIGN_UUID}/approve`, { comment: 'qa-test' }],
      ['GET', '/payroll/runs'],
      ['GET', '/admin/users'],
      ['DELETE', `/files/folders/${FOREIGN_NUMERIC_ID}`],
    ];

    for (const [method, path, body] of restrictedCalls) {
      const res = await api(staff, method, path, body);
      expect(res.status, `Expected 403 for ${method} ${path}, got ${res.status}`).toBe(403);
    }
  });

  test('PATCH /profile ignores protected fields (role, tenantId, status, salary)', async () => {
    const before = await api(staff, 'GET', '/auth/status');
    expect(before.status).toBe(200);
    const beforeUser = before.json.data ?? before.json;

    const patch = await api(staff, 'PATCH', '/profile', {
      first_name: beforeUser.first_name || 'Staff',
      role: 'administrator',
      roles: ['administrator'],
      tenantId: '999999',
      status: 'suspended',
      salary: 9999999,
    });
    expect([200, 400]).toContain(patch.status);

    const after = await api(staff, 'GET', '/auth/status');
    expect(after.status).toBe(200);
    const afterUser = after.json.data ?? after.json;

    expect(afterUser.roles).toEqual(beforeUser.roles);
    expect(afterUser.status).toBe(beforeUser.status);
    expect(afterUser.tenant?.id).toBe(beforeUser.tenant?.id);
  });

  test('non-owner staff cannot list all tenant files (scoped to own uploads)', async () => {
    const list = await api(staff, 'GET', '/files?per_page=10');
    expect(list.status).toBe(200);
    const statusRes = await api(staff, 'GET', '/auth/status');
    const staffId = String((statusRes.json.data ?? statusRes.json).id);
    const items = list.json?.data?.items ?? list.json?.items ?? [];
    for (const item of items) {
      const uploaderId = String(item.uploadedBy ?? item.uploaded_by ?? item.uploader?.id ?? '');
      expect(uploaderId).toBe(staffId);
    }
  });
});

/* ==========================================================================
   3. Concurrency & Business Logic Integrity
   ========================================================================== */
test.describe('3. Concurrency & Business Logic Integrity', () => {
  test('concurrent refresh token rotation allows at most one refresh per token', async () => {
    // Obtain a fresh isolated login session for this concurrency test
    const fresh = await request.newContext({ baseURL: BASE });
    try {
      const loginRes = await fresh.post(`${BASE}/auth/login`, {
        data: { email: STAFF_EMAIL, password: PASSWORD },
      });
      expect([200, 201]).toContain(loginRes.status());

      const setCookies = loginRes.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
      const refreshPair = setCookies
        .map((h) => h.value.split(';')[0])
        .find((c) => c.startsWith('se_refresh_token='));
      expect(refreshPair, 'se_refresh_token cookie must be issued on login').toBeTruthy();

      // Fire 5 parallel refresh calls using isolated contexts so anon stays cookie-free
      const results = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const workerCtx = await request.newContext({ baseURL: BASE });
          try {
            return await workerCtx.post(`${BASE}/auth/refresh`, {
              data: {},
              headers: {
                'content-type': 'application/json',
                cookie: refreshPair!,
              },
            });
          } finally {
            await workerCtx.dispose();
          }
        }),
      );
      const statuses = results.map((r) => r.status());
      const successes = statuses.filter((s) => s === 200 || s === 201);
      const rejected = statuses.filter((s) => s === 401);

      expect(successes.length, `Expected at most 1 successful rotation, got statuses: ${statuses}`).toBeLessThanOrEqual(1);
      expect(rejected.length, `Expected concurrent replays to be rejected with 401, got: ${statuses}`).toBeGreaterThanOrEqual(4);
    } finally {
      await fresh.dispose();
    }
  });

  test('attendance clock-in ignores client-supplied source="import" and backdated timestamp', async () => {
    const res = await api(staff, 'POST', '/attendance/clock-in', {
      source: 'import',
      at: '2020-01-02T08:00:00.000Z',
      attendance_mode: 'onsite',
      latitude: 0,
      longitude: 0,
    });
    // Either rejected by schedule/already-clocked-in/geofence policy (400),
    // or if accepted during valid shift hours, must never record the spoofed 2020 date.
    if (res.ok) {
      const workDate = String(res.json?.data?.daily?.workDate ?? res.json?.daily?.workDate ?? '');
      expect(workDate).not.toContain('2020-01-02');
    } else {
      expect([400, 403, 409]).toContain(res.status);
    }
  });
});

/* ==========================================================================
   4. Authentication & Rate-Limit Verification
   ========================================================================== */
test.describe('4. Authentication & Rate-Limit Verification', () => {
  test('rejects malformed JWT and opaque refresh token on /auth/status with 401', async () => {
    const malformed = await api(anon, 'GET', '/auth/status', undefined, {
      authorization: 'Bearer not.a.valid.jwt',
    });
    expect(malformed.status).toBe(401);

    const opaque = await api(anon, 'GET', '/auth/status', undefined, {
      authorization: 'Bearer 0123456789abcdef0123456789abcdef0123456789abcdef',
    });
    expect(opaque.status).toBe(401);
  });

  test('rejects Google OAuth callback with missing or mismatched state cookie', async () => {
    const res = await api(anon, 'GET', '/auth/google/callback?code=dummy&state=mismatched-state');
    expect(res.status).toBe(302);
    expect(res.headers['location'] || '').toContain('error=invalid_oauth_state');
  });

  test('enforces rate limiting (429) on /auth/forgot-password', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await api(anon, 'POST', '/auth/forgot-password', {
        email: `qa-ratelimit-${i}@example.com`,
      });
      statuses.push(res.status);
    }
    expect(statuses, `Expected 429 in forgot-password burst, got: ${statuses}`).toContain(429);
  });
});

/* ==========================================================================
   5. Input Validation & File Upload Guardrails
   ========================================================================== */
test.describe('5. Input Validation & File Upload Guardrails', () => {
  test('handles special characters, boundary pagination, and non-UUID IDs safely without 500', async () => {
    const list = await api(staff, 'GET', '/files?page=-1&per_page=99999&search=test%25_%27%22');
    expect(list.status).toBeLessThan(500);
    if (list.status === 200) {
      const perPage = list.json?.data?.meta?.per_page ?? list.json?.meta?.per_page ?? 0;
      expect(perPage).toBeLessThanOrEqual(100);
    }

    const badId = await api(staff, 'GET', '/files/not-a-valid-uuid');
    expect(badId.status).toBe(404);
  });

  test('rejects oversized (>50MB) and zero-byte presign-upload requests with 400', async () => {
    const huge = await api(staff, 'POST', '/files/presign-upload', {
      file_name: 'oversized.bin',
      mime_type: 'application/octet-stream',
      file_size: 104857600,
    });
    expect(huge.status).toBe(400);

    const empty = await api(staff, 'POST', '/files/presign-upload', {
      file_name: 'empty.png',
      mime_type: 'image/png',
      file_size: 0,
    });
    expect(empty.status).toBe(400);
  });
});
