import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { AuditRoutes } from '$apps/identity/audit/routes';
import { auditEvent, emailLog, profile, tenant } from '$app/db/schema';

describe('audit routes (integration)', () => {
  let db: TestDb;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '/audit', plugin: AuditRoutes },
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
    const loginRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookies = loginRes.headers['set-cookie'];
    return {
      ctx,
      cookie: Array.isArray(cookies) ? cookies.join('; ') : String(cookies || ''),
    };
  }

  async function createOtherTenant() {
    const [other] = await db.client
      .insert(tenant)
      .values({ name: 'Other Tenant', slug: 'other-tenant' })
      .returning({ id: tenant.id });
    return other.id;
  }

  it('requires authentication for audit reads', async () => {
    const res = await app.inject({ method: 'GET', url: `${TEST_API_PREFIX}/audit/` });
    expect(res.statusCode).toBe(401);
  });

  it('creates and lists tenant-scoped audit events', async () => {
    const { ctx, cookie } = await loginCookie();
    const otherTenantId = await createOtherTenant();
    await db.client.insert(auditEvent).values({
      tenantId: otherTenantId,
      entityType: 'profile',
      entityId: 'outside',
      action: 'updated',
      comment: 'Other tenant event',
    });

    const createRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/audit/`,
      headers: { cookie },
      payload: {
        entity_type: 'profile',
        entity_id: ctx.userId.toString(),
        action: 'updated',
        comment: 'Changed profile',
        data: { field: 'phone' },
      },
    });
    expect(createRes.statusCode).toBe(200);
    expect(createRes.json().data.performed_by).toBe(ctx.userId.toString());

    const listRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/audit/?entity_type=profile`,
      headers: { cookie },
    });
    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    expect(body.data.meta.total).toBe(1);
    expect(body.data.items[0]).toMatchObject({
      entity_type: 'profile',
      entity_id: ctx.userId.toString(),
      action: 'updated',
      user: { email: 'owner@example.com' },
    });
  });

  it('returns request audit history scoped to the active tenant', async () => {
    const { ctx, cookie } = await loginCookie();
    const otherTenantId = await createOtherTenant();
    await db.client.insert(auditEvent).values([
      {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        entityType: 'request',
        entityId: 'req-1',
        action: 'submitted',
        comment: 'Submitted',
      },
      {
        tenantId: otherTenantId,
        entityType: 'request',
        entityId: 'req-1',
        action: 'approved',
        comment: 'Other tenant',
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/audit/requests/req-1`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.history).toHaveLength(1);
    expect(res.json().data.history[0].action).toBe('submitted');
  });

  it('lists email logs only for the active tenant and validates dates', async () => {
    const { ctx, cookie } = await loginCookie();
    const otherTenantId = await createOtherTenant();
    await db.client.insert(emailLog).values([
      {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        toEmail: 'owner@example.com',
        subject: 'Welcome',
        status: 'sent',
        updatedAt: new Date(),
      },
      {
        tenantId: otherTenantId,
        toEmail: 'outside@example.com',
        subject: 'Other',
        status: 'sent',
        updatedAt: new Date(),
      },
    ]);

    const invalidDate = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/audit/email-logs?from=not-a-date`,
      headers: { cookie },
    });
    expect(invalidDate.statusCode).toBe(400);

    const res = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/audit/email-logs?status=sent`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.meta.total).toBe(1);
    expect(res.json().data.items[0].to_email).toBe('owner@example.com');
  });
});
