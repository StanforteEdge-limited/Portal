import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { TenancyRoutes } from '$apps/tenancy/routes';
import {
  profile,
  profileOrganization,
  role,
  tenant,
  tenantMembership,
  userRole,
} from '$app/db/schema';

describe('tenancy routes (integration)', () => {
  let db: TestDb;
  let app: any;
  let mailEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '/tenancy', plugin: TenancyRoutes },
    ]);

    mailEnqueue = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(appContainer(), 'mailQueue', {
      value: { enqueue: mailEnqueue },
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

  async function createTenantMember(ctx: Awaited<ReturnType<typeof loginCookie>>['ctx']) {
    const now = new Date();
    const [member] = await db.client
      .insert(profile)
      .values({
        email: 'member@example.com',
        type: 'staff',
        status: 'active',
        firstName: 'Team',
        lastName: 'Member',
        primaryOrganizationId: ctx.orgId,
      })
      .returning({ id: profile.id });
    await db.client.insert(tenantMembership).values({
      tenantId: ctx.tenantId,
      profileId: member.id,
      status: 'active',
      isOwner: false,
    });
    await db.client.insert(profileOrganization).values({
      tenantId: ctx.tenantId,
      profileId: member.id,
      organizationId: ctx.orgId,
      isPrimary: true,
      createdAt: now,
    });
    return member.id;
  }

  it('creates a workspace without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/workspaces`,
      payload: {
        name: 'New Workspace',
        slug: 'new-workspace',
        email: 'founder@example.com',
        first_name: 'Fran',
        last_name: 'Founder',
        password: 'Password123!',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      slug: 'new-workspace',
      email: 'founder@example.com',
      role: 'owner',
    });
  });

  it('requires email verification before allowing the workspace owner to sign in', async () => {
    const registration = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/workspaces`,
      payload: {
        name: 'Verified Workspace',
        slug: 'verified-workspace',
        email: 'verified@example.com',
        first_name: 'Vera',
        last_name: 'Founder',
        password: 'Password123!',
      },
    });
    expect(registration.statusCode).toBe(200);
    expect(registration.json().data.verification_required).toBe(true);
    expect(mailEnqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'verify_email' }));

    const verificationUrl = mailEnqueue.mock.calls[0][0].templateContext.verificationUrl as string;
    const verificationToken = new URL(verificationUrl).searchParams.get('token');
    expect(verificationToken).toBeTruthy();

    const blockedLogin = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'verified@example.com', password: 'Password123!' },
    });
    expect(blockedLogin.statusCode).toBe(401);

    const verified = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/verify-email`,
      payload: { token: verificationToken },
    });
    expect(verified.statusCode).toBe(200);

    const login = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/auth/login`,
      payload: { email: 'verified@example.com', password: 'Password123!' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().data.user.email).toBe('verified@example.com');
  });

  it('requires authentication for tenant reads', async () => {
    const res = await app.inject({ method: 'GET', url: `${TEST_API_PREFIX}/tenancy/` });
    expect(res.statusCode).toBe(401);
  });

  it('reads and updates tenant settings for the active owner', async () => {
    const { cookie } = await loginCookie();

    const getRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/tenancy/`,
      headers: { cookie },
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().data.slug).toBe('acme');

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `${TEST_API_PREFIX}/tenancy/`,
      headers: { cookie },
      payload: { name: 'Acme Group', plan: 'business', metadata: { theme: 'ocean' } },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data).toMatchObject({ name: 'Acme Group', plan: 'business' });
  });

  it('lists, assigns roles to, and deactivates tenant members', async () => {
    const { ctx, cookie } = await loginCookie();
    const memberId = await createTenantMember(ctx);

    const listRes = await app.inject({
      method: 'GET',
      url: `${TEST_API_PREFIX}/tenancy/members`,
      headers: { cookie },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data.map((member: any) => member.profileId)).toContain(memberId.toString());

    const assignRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/members/${memberId.toString()}/roles`,
      headers: { cookie },
      payload: { roles: ['owner'] },
    });
    expect(assignRes.statusCode).toBe(200);
    expect(assignRes.json().roles).toEqual(['owner']);

    const assignments = await db.client
      .select()
      .from(userRole)
      .where(eq(userRole.profileId, memberId));
    expect(assignments).toHaveLength(1);
    expect(assignments[0].tenantId).toBe(ctx.tenantId);

    const deactivateRes = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/members/${memberId.toString()}/deactivate`,
      headers: { cookie },
    });
    expect(deactivateRes.statusCode).toBe(200);
    const [membership] = await db.client
      .select()
      .from(tenantMembership)
      .where(eq(tenantMembership.profileId, memberId))
      .limit(1);
    expect(membership?.status).toBe('inactive');
  });

  it('does not assign roles from another tenant', async () => {
    const { ctx, cookie } = await loginCookie();
    const memberId = await createTenantMember(ctx);
    const [otherTenant] = await db.client
      .insert(tenant)
      .values({ name: 'Other Tenant', slug: 'other-tenant' })
      .returning({ id: tenant.id });
    await db.client.insert(role).values({
      tenantId: otherTenant.id,
      name: 'External',
      slug: 'external',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/members/${memberId.toString()}/roles`,
      headers: { cookie },
      payload: { roles: ['external'] },
    });

    expect(res.statusCode).toBe(400);
  });

  it('transfers tenant ownership to an active member', async () => {
    const { ctx, cookie } = await loginCookie();
    const memberId = await createTenantMember(ctx);

    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/tenancy/transfer-ownership`,
      headers: { cookie },
      payload: { profile_id: memberId.toString() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ownerProfileId).toBe(memberId.toString());

    const memberships = await db.client
      .select()
      .from(tenantMembership)
      .where(eq(tenantMembership.tenantId, ctx.tenantId));
    expect(memberships.find((membership) => membership.profileId === ctx.userId)?.isOwner).toBe(false);
    expect(memberships.find((membership) => membership.profileId === memberId)?.isOwner).toBe(true);
  });
});
