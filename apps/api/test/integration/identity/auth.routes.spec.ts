import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { profile } from '$app/db/schema';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '$core/auth/cookies';

describe('auth routes (integration)', () => {
  let db: TestDb;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [{ prefix: '/auth', plugin: AuthRoutes }]);
    // Stub mail queue to avoid Redis
    const container = appContainer();
    try {
      (container as any).mailQueue = { enqueue: vi.fn().mockResolvedValue(undefined) } as any;
    } catch {
      // If setter not exposed, try replacing via property descriptor hack
      Object.defineProperty(container, 'mailQueue', { value: { enqueue: vi.fn().mockResolvedValue(undefined) }, configurable: true, writable: true });
    }
  });

  async function setPassword(profileId: bigint, password: string) {
    await db.client
      .update(profile)
      .set({ passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date() })
      .where(eq(profile.id, profileId));
  }

  afterEach(async () => {
    try {
      await app?.close();
    } catch {}
    try {
      await db?.close();
    } catch {}
  });

  it('POST /auth/login sets httpOnly cookies and returns user info', async () => {
    const ctx = await seedBasicTenant(db);
    // Update password to a known hash for login
    const password = 'Password123!';
    await setPassword(ctx.userId, password);

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe('owner@example.com');
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
    expect(cookieStr).toContain(AUTH_ACCESS_COOKIE);
    expect(cookieStr).toContain(AUTH_REFRESH_COOKIE);
    expect(cookieStr).toContain('HttpOnly');
    expect(json.data.tokens).toBeUndefined();
  });

  it('POST /auth/login rejects invalid credentials with 401', async () => {
    const ctx = await seedBasicTenant(db);
    await setPassword(ctx.userId, 'Password123!');

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'wrongpass' },
    });

    expect(res.statusCode).toBe(401);
    const json = res.json();
    expect(json.success).toBe(false);
  });

  it('POST /auth/refresh rotates tokens', async () => {
    const ctx = await seedBasicTenant(db);
    const password = 'Password123!';
    await setPassword(ctx.userId, password);

    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password },
    });
    const loginCookies = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie'].join(';')
      : String(loginRes.headers['set-cookie'] || '');

    const refreshToken = loginCookies.match(new RegExp(`${AUTH_REFRESH_COOKIE}=([^;]+)`))?.[1];
    expect(refreshToken).toBeTruthy();

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/refresh`,
      payload: { refresh_token: refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
  });

  it('POST /auth/refresh rejects invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/refresh`,
      payload: { refresh_token: 'invalid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/status requires auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/auth/status`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/status returns user when authenticated', async () => {
    const ctx = await seedBasicTenant(db);
    await setPassword(ctx.userId, 'Password123!');

    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookies = loginRes.headers['set-cookie'];

    const res = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/auth/status`,
      headers: { cookie: Array.isArray(cookies) ? cookies.join('; ') : String(cookies || '') },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe('owner@example.com');
  });

  it('POST /auth/logout clears cookies', async () => {
    const ctx = await seedBasicTenant(db);
    await setPassword(ctx.userId, 'Password123!');
    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookies = loginRes.headers['set-cookie'];

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/logout`,
      headers: { cookie: Array.isArray(cookies) ? cookies.join('; ') : String(cookies || '') },
    });
    expect(res.statusCode).toBe(200);
    const clearedCookies = res.headers['set-cookie'];
    expect(clearedCookies).toBeDefined();
  });

  it('POST /auth/forgot-password returns 200 regardless', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/forgot-password`,
      payload: { email: 'nonexistent@example.com' },
    });
    expect(res.statusCode).toBe(200);
  });
});
