import { ADMIN_EMAIL, ADMIN_PASSWORD, apiRequest, expectData, expectOk, login } from './helpers';

const TEST_PASSWORD = 'ChangeMe123!';

function uniqueEmail(label: string) {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@stanforteedge.test`;
}

function expectCreated<T>(response: Awaited<ReturnType<typeof apiRequest<T>>>) {
  expect([200, 201]).toContain(response.status);
  expect(typeof response.body).toBe('object');
  const body = response.body as { success?: boolean; data?: T };
  expect(body.success).toBe(true);
  expect(body.data).toBeDefined();
  return body.data as T;
}

function listItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const candidate = data as { items?: unknown[]; rows?: unknown[]; data?: unknown[] };
    return candidate.items ?? candidate.rows ?? candidate.data ?? [];
  }
  return [];
}

describe('Identity + tenancy workflow (e2e)', () => {
  let adminAccessToken: string;
  let organizationId: string;
  let createdUserId: string;
  let createdUserEmail: string;
  let createdUserAccessToken: string;

  it('signs in as the seeded admin and resolves tenant context', async () => {
    const { accessToken, body } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    adminAccessToken = accessToken;
    expect(body.data?.user?.email).toBe(ADMIN_EMAIL);

    const status = expectData(await apiRequest('/auth/status', { token: adminAccessToken })) as {
      tenant?: { slug?: string };
      roles?: string[];
      permissions?: string[];
    };
    expect(status.tenant?.slug).toBe('stanforte-demo');
    expect(status.roles ?? []).toContain('administrator');
    expect(status.permissions ?? []).toContain('*');

    const tenants = expectData(await apiRequest('/auth/tenants', { token: adminAccessToken })) as Array<{
      slug: string;
      isOwner: boolean;
    }>;
    expect(tenants.some((tenant) => tenant.slug === 'stanforte-demo' && tenant.isOwner)).toBe(true);
  });

  it('reads tenant, organization, and RBAC baseline surfaces', async () => {
    const currentTenant = expectData(await apiRequest('/tenancy/current', { token: adminAccessToken })) as {
      slug?: string;
      status?: string;
    };
    expect(currentTenant.slug).toBe('stanforte-demo');
    expect(currentTenant.status).toBe('active');

    const organizationPayload = expectData(await apiRequest('/organizations/my', { token: adminAccessToken }));
    const organizationMembership = listItems(organizationPayload)[0] as {
      organization?: { id?: string | number; name?: string };
    };
    const organization = organizationMembership?.organization;
    expect(organization.id ?? organization.name).toBeDefined();
    organizationId = String(organization.id);

    const rbacOverview = expectData(await apiRequest('/admin/rbac', { token: adminAccessToken })) as {
      roles?: number;
      permissions?: number;
    };
    expect(rbacOverview.roles).toBeGreaterThan(0);
    expect(rbacOverview.permissions).toBeGreaterThan(0);

    const rolesPayload = expectData(await apiRequest('/admin/rbac/roles', { token: adminAccessToken }));
    const roles = listItems(rolesPayload) as Array<{ slug?: string; permissions?: unknown[] }>;
    expect(roles.some((role) => role.slug === 'administrator')).toBe(true);
    expect(roles.some((role) => role.slug === 'staff')).toBe(true);
  });

  it('creates a tenant user, assigns roles, and verifies user role surfaces', async () => {
    createdUserEmail = uniqueEmail('identity-tenancy');
    const createdUser = expectCreated<{
      id: string;
      email: string;
      status: string;
      primaryOrganizationId?: string;
    }>(
      await apiRequest('/users', {
        method: 'POST',
        token: adminAccessToken,
        body: {
          email: createdUserEmail,
          first_name: 'Identity',
          last_name: 'Tenant',
          type: 'staff',
          status: 'active',
          primary_organization_id: organizationId,
          set_password: true,
          password: TEST_PASSWORD,
          roles: ['staff'],
        },
      }),
    );
    createdUserId = createdUser.id;
    expect(createdUser.email).toBe(createdUserEmail);
    expect(createdUser.status).toBe('active');

    const fetchedUser = expectData(await apiRequest(`/users/${createdUserId}`, { token: adminAccessToken })) as {
      id?: string;
      email?: string;
    };
    expect(fetchedUser.id).toBe(createdUserId);
    expect(fetchedUser.email).toBe(createdUserEmail);

    const assignedRoles = expectCreated(
      await apiRequest(`/users/${createdUserId}/roles`, {
        method: 'POST',
        token: adminAccessToken,
        body: { roles: ['staff'] },
      }),
    ) as { roles?: Array<{ slug?: string; is_primary?: boolean }> };
    expect(assignedRoles.roles?.map((role) => role.slug)).toContain('staff');
    expect(assignedRoles.roles?.[0]?.is_primary).toBe(true);

    const adminRbacView = expectData(
      await apiRequest(`/admin/rbac/users/${createdUserId}`, { token: adminAccessToken }),
    ) as { roles?: Array<{ slug?: string; permissions?: unknown[] }> };
    expect(adminRbacView.roles?.some((role) => role.slug === 'staff')).toBe(true);
  });

  it('updates profile data, tenant roles, and member listings for the new user', async () => {
    const updatedUser = expectData(
      await apiRequest(`/users/${createdUserId}`, {
        method: 'PATCH',
        token: adminAccessToken,
        body: {
          first_name: 'Identity Updated',
          type: 'staff',
          status: 'active',
          primary_organization_id: organizationId,
        },
      }),
    ) as { id?: string; firstName?: string };
    expect(updatedUser.id).toBe(createdUserId);
    expect(updatedUser.firstName).toBe('Identity Updated');

    const tenantRoles = await apiRequest(`/tenancy/members/${createdUserId}/roles`, {
      method: 'POST',
      token: adminAccessToken,
      body: { roles: ['staff'] },
    });
    expect([200, 201]).toContain(tenantRoles.status);
    expect((tenantRoles.body as { success?: boolean }).success).toBe(true);

    const members = expectData(await apiRequest('/tenancy/members', { token: adminAccessToken })) as Array<{
      profileId?: string;
      email?: string;
      roles?: string[];
    }>;
    const member = members.find((item) => item.profileId === createdUserId);
    expect(member?.email).toBe(createdUserEmail);
    expect(member?.roles ?? []).toContain('staff');
  });

  it('creates a pending tenant member without enabling login', async () => {
    const pendingEmail = uniqueEmail('identity-pending');
    const pendingUser = expectCreated<{ id: string; email: string; status: string }>(
      await apiRequest('/users', {
        method: 'POST',
        token: adminAccessToken,
        body: {
          email: pendingEmail,
          first_name: 'Identity',
          last_name: 'Pending',
          type: 'staff',
          status: 'pending',
          primary_organization_id: organizationId,
          roles: ['staff'],
        },
      }),
    );
    expect(pendingUser.email).toBe(pendingEmail);
    expect(pendingUser.status).toBe('pending');

    const loginAttempt = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: pendingEmail, password: TEST_PASSWORD },
    });
    expect(loginAttempt.status).toBe(401);

    const members = expectData(await apiRequest('/tenancy/members', { token: adminAccessToken })) as Array<{
      profileId?: string;
      profileStatus?: string;
    }>;
    expect(members.some((member) => member.profileId === pendingUser.id && member.profileStatus === 'pending')).toBe(
      true,
    );
  });

  it('allows the created staff user to sign in but blocks admin-only tenant surfaces', async () => {
    const loginResult = await login(createdUserEmail, TEST_PASSWORD);
    createdUserAccessToken = loginResult.accessToken;
    expect(loginResult.body.data?.user?.email).toBe(createdUserEmail);

    const profile = expectData(await apiRequest('/profile', { token: createdUserAccessToken })) as {
      id?: string;
      email?: string;
    };
    expect(profile.id).toBe(createdUserId);
    expect(profile.email).toBe(createdUserEmail);

    const deniedTenant = await apiRequest('/tenancy/current', { token: createdUserAccessToken });
    expect(deniedTenant.status).toBe(403);

    const deniedRbac = await apiRequest('/admin/rbac/roles', { token: createdUserAccessToken });
    expect(deniedRbac.status).toBe(403);

    const anonymous = await apiRequest('/tenancy/current');
    expect(anonymous.status).toBe(401);
  });
});
