import { describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException } from '$core/errors';
import { RbacService } from '$apps/identity/rbac/repository';
import { createFakeDb } from '../../../support/fake-db';

// Tables
import { role, permission, rolePermission, userRole } from '$apps/identity/rbac/model';
import { profile } from '$apps/identity/users/model';
import { tenantMembership } from '$apps/tenancy/model';

describe('RbacService (unit, fake db)', () => {
  const tenantCtx = { require: () => ({ tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: false }), requireTenantId: () => 1n } as any;
  const auth = { getUserPermissions: () => ['*'] } as any;

  it('throws when deleting system role', async () => {
    const db = createFakeDb().queue(role, [
      { id: 10n, tenantId: 1n, name: 'System', slug: 'system', isSystem: true, isActive: true },
    ]);
    const authMock = { getUserPermissions: () => ['*'], clearRbacStateCache: () => {}, invalidateRbacState: () => {} } as any;
    const rbac = new RbacService(db as any, tenantCtx, authMock);

    await expect(rbac.deleteRole('10', undefined, { tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: false } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates replacement role exists', async () => {
    const db = createFakeDb()
      .queue(role, [
        { id: 10n, tenantId: 1n, name: 'R', slug: 'r', isSystem: false, isActive: true },
      ])
      .queue(role, []);
    const authMock = { getUserPermissions: () => ['*'], clearRbacStateCache: () => {}, invalidateRbacState: () => {} } as any;
    const rbac = new RbacService(db as any, tenantCtx, authMock);

    await expect(rbac.deleteRole('10', '20', { tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: false } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists permissions with filters', async () => {
    const db = createFakeDb().queue(permission, [
      { id: 1n, code: 'users.manage', name: 'Users', module: 'identity', group: 'identity' },
      { id: 2n, code: 'roles.manage', name: 'Roles', module: 'identity', group: 'identity' },
    ]);
    const rbac = new RbacService(db as any, tenantCtx, auth);

    const res = await rbac.listPermissions({ module: 'identity', search: 'users' }, { tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: false } as any);
    expect(Array.isArray(res)).toBe(true);
  });

  it('assigns user roles', async () => {
    const db = createFakeDb()
      .queue(profile, [{ id: 7n, email: 'staff@example.com', username: null, firstName: 'Staff', lastName: 'User' }])
      .queue(tenantMembership, [{ id: 5n, profileId: 7n, tenantId: 1n, role: 'user', isOwner: false, status: 'active' }])
      .queue(role, [{ id: 1n, tenantId: 1n, name: 'Staff', slug: 'staff', isSystem: false, isActive: true }])
      .queue(userRole, [])
      .queue(userRole, []);
    const authMock = { getUserPermissions: () => ['*'], clearRbacStateCache: () => {}, invalidateRbacState: () => {} } as any;
    const rbac = new RbacService(db as any, tenantCtx, authMock);

    const res = await rbac.assignUserRoles('7', { role_ids: ['1'] }, { tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: false } as any);
    expect(res).toBeDefined();
  });
});
