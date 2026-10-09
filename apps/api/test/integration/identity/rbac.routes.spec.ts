import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { RbacRoutes } from '$apps/identity/rbac/routes';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { profile } from '$app/db/schema';

describe('rbac routes (integration)', () => {
  let db: TestDb;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '/rbac', plugin: RbacRoutes },
    ]);
    const container = appContainer();
    try {
      (container as any).mailQueue = { enqueue: vi.fn().mockResolvedValue(undefined) } as any;
    } catch {
      Object.defineProperty(container, 'mailQueue', { value: { enqueue: vi.fn().mockResolvedValue(undefined) }, configurable: true, writable: true });
    }
  });

  afterEach(async () => {
    try {
      await app?.close();
    } catch {}
    try {
      await db?.close();
    } catch {}
  });

  it('requires auth for overview', async () => {
    const res = await app.inject({ method: 'GET', url: `${TEST_API_PREFIX}/rbac/` });
    expect(res.statusCode).toBe(401);
  });

  it('returns overview for authenticated user', async () => {
    const ctx = await seedBasicTenant(db);
    await db.client
      .update(profile)
      .set({ passwordHash: await bcrypt.hash('Password123!', 10), updatedAt: new Date() })
      .where(eq(profile.id, ctx.userId));
    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookies = loginRes.headers['set-cookie'];
    const res = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/rbac/`,
      headers: { cookie: Array.isArray(cookies) ? cookies.join('; ') : String(cookies || '') },
    });
    expect(res.statusCode).toBe(200);
  });
});
