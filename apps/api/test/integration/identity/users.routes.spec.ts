import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { UsersRoutes } from '$apps/identity/users/routes';
import { profile, tenantMembership, profileOrganization, userRole } from '$app/db/schema';

describe('users routes (integration)', () => {
  let db: TestDb;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '', plugin: UsersRoutes },
    ]);

    const container = appContainer();
    Object.defineProperty(container, 'mailQueue', {
      value: { enqueue: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(async () => {
    await app?.close().catch(() => {});
    await db?.close().catch(() => {});
  });

  async function setPassword(profileId: bigint, password: string) {
    await db.client
      .update(profile)
      .set({ passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date() })
      .where(eq(profile.id, profileId));
  }

  async function loginCookie() {
    const ctx = await seedBasicTenant(db);
    await setPassword(ctx.userId, 'Password123!');
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

  it('requires authentication for profile reads', async () => {
    const res = await app.inject({ method: 'GET', url: `${TEST_API_PREFIX}/profile` });
    expect(res.statusCode).toBe(401);
  });

  it('returns and updates the authenticated profile in the active tenant', async () => {
    const { cookie } = await loginCookie();

    const profileRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/profile`,
      headers: { cookie },
    });
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json().data.email).toBe('owner@example.com');
    expect(profileRes.json().data.organizations).toHaveLength(1);

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `${TEST_API_PREFIX}/profile`,
      headers: { cookie },
      payload: { first_name: 'Alicia', phone: '+15551234567' },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data.first_name).toBe('Alicia');
    expect(updateRes.json().data.phone).toBe('+15551234567');
  });

  it('lists tenant users and creates a tenant-scoped staff profile', async () => {
    const { ctx, cookie } = await loginCookie();

    const listBefore = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/users`,
      headers: { cookie },
    });
    expect(listBefore.statusCode).toBe(200);
    expect(listBefore.json().data.meta.total).toBe(1);

    const createRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/users`,
      headers: { cookie },
      payload: {
        email: 'staff.member@example.com',
        first_name: 'Staff',
        last_name: 'Member',
        type: 'staff',
        primary_organization_id: ctx.orgId.toString(),
        set_password: true,
        password: 'Password123!',
        roles: ['owner'],
      },
    });

    expect(createRes.statusCode).toBe(200);
    const created = createRes.json().data;
    expect(created.email).toBe('staff.member@example.com');
    expect(created.primary_organization_id).toBe(ctx.orgId.toString());

    const [membership] = await db.client
      .select()
      .from(tenantMembership)
      .where(eq(tenantMembership.profileId, BigInt(created.id)))
      .limit(1);
    expect(membership?.tenantId).toBe(ctx.tenantId);

    const orgLinks = await db.client
      .select()
      .from(profileOrganization)
      .where(eq(profileOrganization.profileId, BigInt(created.id)));
    expect(orgLinks[0]?.organizationId).toBe(ctx.orgId);

    const roles = await db.client
      .select()
      .from(userRole)
      .where(eq(userRole.profileId, BigInt(created.id)));
    expect(roles).toHaveLength(1);
  });
});
