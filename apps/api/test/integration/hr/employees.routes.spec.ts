import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { buildTestApp, TEST_API_PREFIX, appContainer } from '../../support/app';
import { createTestDb, type TestDb } from '../../support/pg';
import { seedBasicTenant } from '../../support/seed';
import { AuthRoutes } from '$apps/identity/auth/routes';
import { EmployeesRoutes } from '$apps/hr/employees/routes';
import { OnboardingRoutes } from '$apps/hr/onboarding/routes';
import { permission, profile, role, rolePermission, tenantMembership, userRole } from '$app/db/schema';

describe('employee onboarding routes (integration)', () => {
  let db: TestDb;
  let app: any;
  let mailEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = await createTestDb();
    app = await buildTestApp(db, [
      { prefix: '/auth', plugin: AuthRoutes },
      { prefix: '/employees', plugin: EmployeesRoutes },
      { prefix: '/onboarding', plugin: OnboardingRoutes },
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

  it('provisions an employee, assigns access, and completes onboarding', async () => {
    const ctx = await seedBasicTenant(db);
    const now = new Date();
    const [staffRole] = await db.client.insert(role).values({
      tenantId: ctx.tenantId,
      name: 'Staff',
      slug: 'staff',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: role.id });
    for (const slug of ['onboarding.view', 'onboarding.manage']) {
      const [staffPermission] = await db.client.insert(permission).values({ name: slug, slug, module: 'hr', createdAt: now, updatedAt: now }).returning({ id: permission.id });
      await db.client.insert(rolePermission).values({ tenantId: ctx.tenantId, roleId: staffRole.id, permissionId: staffPermission.id });
    }
    await db.client.update(profile).set({ passwordHash: await bcrypt.hash('Password123!', 10), updatedAt: now }).where(eq(profile.id, ctx.userId));

    const login = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/auth/login`, payload: { email: 'owner@example.com', password: 'Password123!' } });
    const cookies = login.headers['set-cookie'];
    const cookie = Array.isArray(cookies) ? cookies.join('; ') : String(cookies || '');

    const created = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/employees`,
      headers: { cookie },
      payload: { first_name: 'Eve', last_name: 'Staff', email: 'eve@example.com', job_title: 'Analyst', primary_organization_id: ctx.orgId.toString(), roles: ['staff'] },
    });
    expect(created.statusCode).toBe(200);
    const employeeId = created.json().data.id;
    expect(created.json().data.invitation_sent).toBe(true);
    expect(mailEnqueue).toHaveBeenCalled();

    const [membership] = await db.client.select().from(tenantMembership).where(eq(tenantMembership.profileId, BigInt(employeeId)));
    expect(membership?.tenantId).toBe(ctx.tenantId);
    const [assignment] = await db.client.select().from(userRole).where(eq(userRole.profileId, BigInt(employeeId)));
    expect(assignment?.roleId).toBe(staffRole.id);

    const inviteUrl = mailEnqueue.mock.calls.at(-1)[0].templateContext.inviteUrl as string;
    const inviteToken = new URL(inviteUrl).searchParams.get('token');
    expect(inviteToken).toBeTruthy();
    const accepted = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/employees/accept-invite`, payload: { token: inviteToken, new_password: 'Employee123!' } });
    expect(accepted.statusCode).toBe(200);

    const employeeLogin = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/auth/login`, payload: { email: 'eve@example.com', password: 'Employee123!' } });
    expect(employeeLogin.statusCode).toBe(200);
    const employeeCookies = employeeLogin.headers['set-cookie'];
    const employeeCookie = Array.isArray(employeeCookies) ? employeeCookies.join('; ') : String(employeeCookies || '');
    const onboarding = await app.inject({ method: 'GET', url: `${TEST_API_PREFIX}/onboarding`, headers: { cookie: employeeCookie } });
    expect(onboarding.statusCode).toBe(200);
    expect(onboarding.json().data.progress.status).toBe('accepted');

    const saved = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/onboarding`, headers: { cookie: employeeCookie }, payload: { action: 'save_profile', payload: { phone: '+2348000000000', nationality: 'Nigerian' } } });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().data.progress.currentStep).toBe('forms');

    const completed = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/onboarding`, headers: { cookie: employeeCookie }, payload: { action: 'complete_step', step_key: 'review' } });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().data.progress.status).toBe('completed');
  });
});
