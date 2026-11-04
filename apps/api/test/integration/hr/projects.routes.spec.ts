import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { ProjectsRoutes } from '$apps/hr/projects/routes';
import { profile } from '$app/db/schema';

describe('project routes (integration)', () => {
  let db: TestDb;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '/projects', plugin: ProjectsRoutes },
    ]);

    Object.defineProperty(appContainer(), 'mailQueue', {
      value: { enqueue: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(async () => {
    await app?.close().catch(() => {});
    await db?.close().catch(() => {});
  });

  async function loginCookie() {
    const ctx = await seedBasicTenant(db);
    await db.client
      .update(profile)
      .set({ passwordHash: await bcrypt.hash('Password123!', 10), updatedAt: new Date() })
      .where(eq(profile.id, ctx.userId));

    const login = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });

    const cookies = login.headers['set-cookie'];
    return {
      ctx,
      cookie: Array.isArray(cookies) ? cookies.join('; ') : String(cookies || ''),
    };
  }

  it('supports the complete project lifecycle', async () => {
    const { ctx, cookie } = await loginCookie();

    const create = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/projects`,
      headers: { cookie },
      payload: {
        name: 'Portal rollout',
        description: 'Workspace delivery project',
        organization_id: ctx.orgId.toString(),
        project_code: 'PORTAL-001',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        governance_status: 'planned',
      },
    });

    expect(create.statusCode).toBe(200);
    const created = create.json().data;
    expect(created.name).toBe('Portal rollout');
    expect(created.governance.project_code).toBe('PORTAL-001');

    const projectId = String(created.id);
    const list = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/projects?active_only=true`,
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data.items.map((item: any) => String(item.id)).includes(projectId)).toBe(true);

    const detail = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/projects/${projectId}/governance`,
      headers: { cookie },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.project.id.toString()).toBe(projectId);
    expect(detail.json().data.usage.open_requests).toBe(0);

    const update = await app.inject({
      method: 'PUT',
      url: `${TEST_API_PREFIX}/projects/${projectId}`,
      headers: { cookie },
      payload: { name: 'Portal rollout v2', governance_status: 'active' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().data.name).toBe('Portal rollout v2');
    expect(update.json().data.governance.governance_status).toBe('active');

    const archive = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/projects/${projectId}/archive`,
      headers: { cookie },
    });
    expect(archive.statusCode).toBe(200);
    expect(archive.json().data.isActive).toBe(false);

    const unarchive = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/projects/${projectId}/unarchive`,
      headers: { cookie },
    });
    expect(unarchive.statusCode).toBe(200);
    expect(unarchive.json().data.isActive).toBe(true);
  });
});
