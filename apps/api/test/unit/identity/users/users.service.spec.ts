import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '$core/errors';
import { UsersService } from '$apps/identity/users/repository';
import { createFakeDb } from '../../../support/fake-db';
import { profile } from '$apps/identity/users/model';
import { role, userRole } from '$apps/identity/rbac/model';
import { tenantMembership } from '$apps/tenancy/model';

function buildService(db: ReturnType<typeof createFakeDb>) {
  const tenantContext = {
    runSystem: (_label: string, callback: () => unknown) => callback(),
    currentTenantId: () => 1n,
  } as any;
  const auth = { invalidateRbacState: vi.fn() } as any;
  return new UsersService(db as any, {} as any, { enqueue: vi.fn() } as any, tenantContext, auth);
}

describe('UsersService (unit, fake db)', () => {
  const tenant = { tenantId: 1n, profileId: 99n, membershipId: 1n, isOwner: true } as any;

  it('rejects active user creation without password or invite', async () => {
    const db = createFakeDb().queue(profile, []);
    const users = buildService(db);

    await expect(
      users.createUser(
        {
          email: 'new.user@example.com',
          first_name: 'New',
          last_name: 'User',
          type: 'client',
          status: 'active',
        },
        tenant,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects role assignment for a profile outside the tenant', async () => {
    const db = createFakeDb()
      .queue(profile, [{ id: 7n, email: 'staff@example.com', username: 'staff' }])
      .queue(tenantMembership, []);
    const users = buildService(db);

    await expect(users.setUserRoles('7', { roles: ['owner'] }, tenant)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sets user roles and invalidates RBAC cache', async () => {
    const db = createFakeDb()
      .queue(profile, [{ id: 7n, email: 'staff@example.com', username: 'staff' }])
      .queue(tenantMembership, [{ id: 5n, tenantId: 1n, profileId: 7n, status: 'active', isOwner: false }])
      .queue(role, [{ id: 2n, tenantId: 1n, slug: 'staff', name: 'Staff', isActive: true }]);
    const users = buildService(db);

    const res = await users.setUserRoles('7', { roles: ['staff'] }, tenant);

    expect(res.roles).toEqual([{ id: '2', slug: 'staff', name: 'Staff', is_primary: true }]);
    expect(db.deletes.some((entry) => entry.table === userRole)).toBe(true);
    expect(db.inserts.some((entry) => entry.table === userRole)).toBe(true);
  });
});
