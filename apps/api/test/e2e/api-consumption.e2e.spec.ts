import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../support/app';
import { createTestDb, type TestDb } from '../support/pg';
import { appRoutes } from '$app/bootstrap/routes';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '$core/auth/cookies';
import { permission, role, rolePermission } from '$app/db/schema';

describe('End-to-End API Consumption Journey (e2e)', () => {
  let db: TestDb;
  let app: any;
  let mailEnqueue: ReturnType<typeof vi.fn>;
  let sessionCookieHeader = '';
  let refreshTokenValue = '';
  let tenantId = '';
  let verificationToken = '';

  function getCookieHeader(res: any): string {
    if (res.cookies && Array.isArray(res.cookies) && res.cookies.length > 0) {
      return res.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    }
    const setCookies = res.headers['set-cookie'];
    if (!setCookies) return '';
    const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
    return arr.map((c: string) => c.split(';')[0].trim()).join('; ');
  }

  beforeAll(async () => {
    // 1. Connect to isolated ephemeral test database in Docker Postgres
    db = await createTestDb();

    // 2. Seed global system administrator template role (tenantId = null)
    // This allows createWorkspace to automatically bind full administrative permissions to the founder
    const now = new Date();
    const [adminRole] = await db.client
      .insert(role)
      .values({
        name: 'Administrator',
        slug: 'administrator',
        tenantId: null,
        isSystem: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [superPerm] = await db.client
      .insert(permission)
      .values({
        slug: '*',
        name: 'Super Admin Access',
        module: 'system',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db.client.insert(rolePermission).values({
      roleId: adminRole.id,
      permissionId: superPerm.id,
      tenantId: null,
    });

    // 3. Build the full Fastify application mounting all routes
    app = await buildTestApp(db, appRoutes);

    // 4. Configure locks and mail mock
    const container = appContainer();
    mailEnqueue = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(container, 'mailQueue', {
      value: { enqueue: mailEnqueue },
      configurable: true,
      writable: true,
    });
    // Mock locks.ping to report redis up for readiness probe
    if (container.locks) {
      container.locks.ping = vi.fn().mockResolvedValue(true);
    }
  });

  afterAll(async () => {
    await app?.close().catch(() => {});
    await db?.close().catch(() => {});
  });

  /* ---------------------------------------------------------------------- */
  /* Step 1: Health & Readiness Check                                       */
  /* ---------------------------------------------------------------------- */
  it('Step 1: GET /v1/health/healthz and /readyz report ok status and live database', async () => {
    const liveness = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/health/healthz`,
    });
    expect(liveness.statusCode).toBe(200);
    expect(liveness.json()).toEqual({ status: 'ok' });

    const readiness = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/health/readyz`,
    });
    expect(readiness.statusCode).toBe(200);
    const readyBody = readiness.json();
    expect(readyBody.status).toBe('ok');
    expect(readyBody.database).toBe('up');
  });

  /* ---------------------------------------------------------------------- */
  /* Step 2: Workspace Signup & Email Verification                          */
  /* ---------------------------------------------------------------------- */
  it('Step 2: POST /v1/tenancy/workspaces provisions a new organization workspace', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/workspaces`,
      payload: {
        name: 'Apex Innovations Ltd',
        slug: 'apex-innovations',
        email: 'ceo@apexinnovations.com',
        first_name: 'Alexander',
        last_name: 'Pierce',
        password: 'Password123!@#',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      name: 'Apex Innovations Ltd',
      slug: 'apex-innovations',
      email: 'ceo@apexinnovations.com',
      role: 'administrator',
      verification_required: true,
    });

    // Capture verification token dispatched via mailer
    expect(mailEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'verify_email' }),
    );
    const callArgs = mailEnqueue.mock.calls[0][0];
    const verificationUrl = callArgs.templateContext.verificationUrl as string;
    verificationToken = new URL(verificationUrl).searchParams.get('token')!;
    expect(verificationToken).toBeTruthy();
  });

  it('Step 3: POST /v1/auth/verify-email verifies workspace owner email', async () => {
    // Attempting login before verification fails with 401
    const blockedLogin = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: {
        email: 'ceo@apexinnovations.com',
        password: 'Password123!@#',
      },
    });
    expect(blockedLogin.statusCode).toBe(401);

    // Verify email using token
    const verificationRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/verify-email`,
      payload: { token: verificationToken },
    });
    expect(verificationRes.statusCode).toBe(200);
    expect(verificationRes.json().success).toBe(true);
  });

  /* ---------------------------------------------------------------------- */
  /* Step 3: Login & Cookie-based Authentication                            */
  /* ---------------------------------------------------------------------- */
  it('Step 4: POST /v1/auth/login authenticates owner and issues httpOnly session cookies', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: {
        email: 'ceo@apexinnovations.com',
        password: 'Password123!@#',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const body = loginRes.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('ceo@apexinnovations.com');
    expect(body.data.user.first_name).toBe('Alexander');
    expect(body.data.user.tenant).toBeDefined();

    tenantId = body.data.user.tenant.id.toString();

    // Store session cookies for all subsequent authenticated requests
    sessionCookieHeader = getCookieHeader(loginRes);
    expect(sessionCookieHeader).toContain(AUTH_ACCESS_COOKIE);
    expect(sessionCookieHeader).toContain(AUTH_REFRESH_COOKIE);

    refreshTokenValue =
      loginRes.cookies?.find((c: any) => c.name === AUTH_REFRESH_COOKIE)?.value ||
      sessionCookieHeader.match(new RegExp(`${AUTH_REFRESH_COOKIE}=([^;]+)`))?.[1] ||
      '';
    expect(refreshTokenValue).toBeTruthy();
  });

  /* ---------------------------------------------------------------------- */
  /* Step 4: Authenticated Profile & Tenant Introspection                  */
  /* ---------------------------------------------------------------------- */
  it('Step 5: GET /v1/profile returns authenticated profile', async () => {
    const profileRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/profile`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
    });

    expect(profileRes.statusCode).toBe(200);
    const body = profileRes.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('ceo@apexinnovations.com');
  });

  /* ---------------------------------------------------------------------- */
  /* Step 5: RBAC Authorization & Permission Matrix                         */
  /* ---------------------------------------------------------------------- */
  it('Step 6: GET /v1/admin/rbac provides roles and permission matrix', async () => {
    const rbacRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/admin/rbac`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
    });

    expect(rbacRes.statusCode).toBe(200);
    const body = rbacRes.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  /* ---------------------------------------------------------------------- */
  /* Step 6: HR Department Operations                                       */
  /* ---------------------------------------------------------------------- */
  it('Step 7: POST & GET /v1/departments creates and lists departments', async () => {
    // Create new Department
    const createDeptRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/departments`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
      payload: {
        name: 'Research & Development',
        code: 'RND',
        description: 'Product innovation team',
      },
    });

    expect(createDeptRes.statusCode).toBe(200);
    const createdDept = createDeptRes.json();
    expect(createdDept.success).toBe(true);
    expect(createdDept.data.code).toBe('RND');
    expect(createdDept.data.name).toBe('Research & Development');

    // List departments
    const listDeptRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/departments`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
    });

    expect(listDeptRes.statusCode).toBe(200);
    const listBody = listDeptRes.json();
    expect(listBody.success).toBe(true);
    const items = listBody.data.items ?? listBody.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((d: any) => d.code === 'RND')).toBe(true);
  });

  /* ---------------------------------------------------------------------- */
  /* Step 7: HR Project Management Lifecycle                               */
  /* ---------------------------------------------------------------------- */
  it('Step 8: POST & GET /v1/projects creates a project and reads details', async () => {
    const createProjectRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/projects`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
      payload: {
        name: 'Project Horizon',
        description: 'Strategic platform initiative',
        status: 'active',
      },
    });

    expect(createProjectRes.statusCode).toBe(200);
    const projectBody = createProjectRes.json();
    expect(projectBody.success).toBe(true);
    expect(projectBody.data.name).toBe('Project Horizon');
    const projectId = projectBody.data.id;

    // Read project by id
    const getProjectRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/projects/${projectId}`,
      headers: {
        cookie: sessionCookieHeader,
        'x-tenant-id': tenantId,
      },
    });

    expect(getProjectRes.statusCode).toBe(200);
    expect(getProjectRes.json().data.name).toBe('Project Horizon');
  });

  /* ---------------------------------------------------------------------- */
  /* Step 8: Token Rotation & Session Refresh                              */
  /* ---------------------------------------------------------------------- */
  it('Step 9: POST /v1/auth/refresh rotates authentication tokens', async () => {
    const refreshRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/refresh`,
      headers: {
        cookie: sessionCookieHeader,
      },
      payload: {
        refresh_token: refreshTokenValue,
      },
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.json().success).toBe(true);

    const newCookieHeader = getCookieHeader(refreshRes);
    expect(newCookieHeader).toContain(AUTH_ACCESS_COOKIE);

    // Update session cookies with rotated token
    sessionCookieHeader = newCookieHeader;
  });

  /* ---------------------------------------------------------------------- */
  /* Step 9: Secure Logout                                                 */
  /* ---------------------------------------------------------------------- */
  it('Step 10: POST /v1/auth/logout clears auth cookies and terminates session', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/logout`,
      headers: {
        cookie: sessionCookieHeader,
      },
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json().success).toBe(true);

    const clearedCookies = logoutRes.headers['set-cookie'];
    expect(clearedCookies).toBeDefined();
    const clearedStr = Array.isArray(clearedCookies) ? clearedCookies.join('; ') : String(clearedCookies);
    // Cookie clearing sets Max-Age=0 or past expires date
    expect(clearedStr).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/);
  });
});
