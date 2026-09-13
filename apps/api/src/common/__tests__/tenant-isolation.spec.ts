import { sql } from 'drizzle-orm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RepositoryService } from '$common/db/repository.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { UsersService } from '$modules/identity/users/users.service';
import { OrganizationsService } from '$modules/directory/organizations/organizations.service';
import { RbacService } from '$modules/identity/rbac/rbac.service';
import { TenancyService } from '$modules/tenancy/tenancy.service';
import { AuthService } from '$modules/identity/auth/auth.service';

const tenantA = { tenantId: 10n, profileId: 1n, membershipId: 100n, isOwner: true };

function repositoryDb() {
  const selected: any[] = [];
  const db: any = {
    selected,
    select: jest.fn(() => ({
      from: jest.fn(() => {
        const query: any = {
          where: jest.fn(() => query),
          orderBy: jest.fn(() => query),
          offset: jest.fn(() => query),
          limit: jest.fn(() => query),
          then: (resolve: (value: any) => unknown) => Promise.resolve(selected.shift() ?? []).then(resolve),
        };
        return query;
      }),
    })),
    insert: jest.fn(() => ({
      values: jest.fn((data: any) => ({
        returning: jest.fn(async () => [{ id: 1n, ...data }]),
      })),
    })),
    execute: jest.fn(async () => [{ ok: true }]),
  };
  return db;
}

describe('tenant isolation', () => {
  it('scopes repository reads and adds the active tenant to writes', async () => {
    const db = repositoryDb();
    const context = new TenantContextService();
    context.enter(tenantA);
    const repository: any = new RepositoryService({ client: db } as any, context);

    db.selected.push([{ profileId: 7n }], [{ id: 7n, tenantId: 10n }]);
    await expect(repository.profile.findMany({ where: { email: 'member@example.com' } })).resolves.toEqual([
      { id: 7n, tenantId: 10n },
    ]);
    expect(db.select).toHaveBeenCalledTimes(2);

    await repository.project.create({ data: { name: 'Tenant A project' } });
    expect(db.insert).toHaveBeenCalled();
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 10n, name: 'Tenant A project' }),
    );
    await expect(repository.project.create({ data: { tenantId: 20n, name: 'cross-tenant' } })).rejects.toThrow(
      'Tenant mismatch',
    );
  });

  it('requires tenant context for raw queries', async () => {
    const db = repositoryDb();
    const repository: any = new RepositoryService({ client: db } as any);
    await expect(repository.$queryRaw(sql`select 1`)).rejects.toBeInstanceOf(UnauthorizedException);

    const context = new TenantContextService();
    context.enter(tenantA);
    const scoped: any = new RepositoryService({ client: db } as any, context);
    await expect(scoped.$queryRaw(sql`select ${tenantA.tenantId}`)).resolves.toEqual([{ ok: true }]);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('allows only explicit system context to bypass tenant reads', async () => {
    const db = repositoryDb();
    const context = new TenantContextService();
    const repository: any = new RepositoryService({ client: db } as any, context);

    await expect(context.runSystem('nightly cross-tenant reconciliation', () =>
      repository.profile.findMany({ where: { email: 'member@example.com' } }),
    )).resolves.toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(1);

    await expect(context.runSystem('', () => undefined)).rejects.toThrow('reason is required');
    await expect(repository.$queryRaw(sql`select 1`)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not expose profiles or organizations from another tenant', async () => {
    const drizzle: any = {
      profile: { findUnique: jest.fn() },
      tenantMembership: { findFirst: jest.fn(), findMany: jest.fn() },
      profileOrganization: { findMany: jest.fn() },
      organization: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    };
    const users = new UsersService(drizzle, { inviteUser: jest.fn() } as any);
    drizzle.profile.findUnique.mockResolvedValue({
      id: 1n,
      organizations: [{ tenantId: 20n, organization: { id: 2n } }],
      groups: [],
      projectMemberships: [],
      employeeProfile: null,
    });
    expect((await users.getMyProfile('1', tenantA)).organizations).toEqual([]);

    const organizations = new OrganizationsService(drizzle);
    drizzle.organization.findUnique.mockResolvedValue(null);
    await expect(organizations.getOrganization('2', 10n)).rejects.toBeInstanceOf(NotFoundException);
    expect(drizzle.organization.findUnique).toHaveBeenCalledWith({ where: { id: 2n, tenantId: 10n } });
    drizzle.profileOrganization.findMany.mockResolvedValue([]);
    expect((await organizations.getMyOrganizations('1', 10n)).data).toEqual([]);
  });

  it('filters RBAC assignments by tenant and never assigns across memberships', async () => {
    const drizzle: any = {
      role: { findMany: jest.fn(), count: jest.fn() },
      permission: { count: jest.fn() },
      userRole: { groupBy: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
      tenantMembership: { findFirst: jest.fn() },
      $transaction: jest.fn(async (value: any) => (Array.isArray(value) ? Promise.all(value) : value(drizzle))),
    };
    const rbac = new RbacService(drizzle);
    drizzle.role.findMany.mockResolvedValue([]);
    expect((await rbac.listRoles(false, tenantA)).data).toEqual([]);
    expect(drizzle.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ users: { where: { tenantId: 10n }, include: expect.anything() } }) }),
    );

    const tenancy = new TenancyService(drizzle, { inviteUser: jest.fn() } as any);
    drizzle.tenantMembership.findFirst.mockResolvedValue(null);
    await expect(tenancy.assignRoles(tenantA, 9n, ['admin'])).rejects.toBeInstanceOf(NotFoundException);
    expect(drizzle.role.findMany).not.toHaveBeenCalled();
  });

  it('switches and refreshes only through an active tenant membership', async () => {
    const drizzle: any = {
      profile: { findUnique: jest.fn().mockResolvedValue({ type: 'staff' }) },
      tenantOrganization: { findFirst: jest.fn() },
      tenantMembership: { findFirst: jest.fn() },
      tenant: { findUnique: jest.fn() },
      userRole: { findMany: jest.fn() },
      role: { findMany: jest.fn().mockResolvedValue([]) },
      rolePermission: { findMany: jest.fn() },
      token: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    };
    const jwt: any = { signAsync: jest.fn().mockResolvedValue('access') };
    const auth = new AuthService(drizzle, jwt, {} as any);
    drizzle.tenantOrganization.findFirst.mockResolvedValue({ tenantId: 20n });
    drizzle.tenantMembership.findFirst.mockResolvedValue(null);
    await expect(auth.switchTenant('1', '20')).rejects.toBeInstanceOf(UnauthorizedException);

    drizzle.tenantMembership.findFirst.mockResolvedValue({ id: 200n, isOwner: false });
    drizzle.tenant.findUnique.mockResolvedValue({ id: 20n, name: 'Tenant B', slug: 'tenant-b', status: 'active' });
    drizzle.userRole.findMany.mockResolvedValue([]);
    drizzle.rolePermission.findMany.mockResolvedValue([]);
    await expect(auth.switchTenant('1', '20')).resolves.toEqual({
      tenant: { id: '20', name: 'Tenant B', slug: 'tenant-b', isOwner: false },
    });
    expect(drizzle.token.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 20n }) }));
  });

  it('invites a profile into the active tenant, not another tenant', async () => {
    const drizzle: any = {
      profile: { findUnique: jest.fn() },
      tenantMembership: { findFirst: jest.fn(), create: jest.fn() },
    };
    const users = { inviteUser: jest.fn().mockResolvedValue({}) };
    const tenancy = new TenancyService(drizzle, users as any);
    drizzle.profile.findUnique.mockResolvedValue({ id: 9n, status: 'pending' });
    drizzle.tenantMembership.findFirst.mockResolvedValue(null);

    await expect(tenancy.inviteMember(tenantA, 'person@example.com')).resolves.toEqual({
      success: true,
      profileId: '9',
    });
    expect(drizzle.tenantMembership.create).toHaveBeenCalledWith({
      data: { tenantId: 10n, profileId: 9n, status: 'active', isOwner: false },
    });
    expect(users.inviteUser).toHaveBeenCalledWith('9', expect.anything(), 10n);
  });
});
