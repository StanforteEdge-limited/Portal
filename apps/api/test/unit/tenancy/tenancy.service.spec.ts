import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '$core/errors';
import { TenancyService } from '$apps/tenancy/repository';
import { createFakeDb } from '../../support/fake-db';
import { tenant, tenantMembership } from '$apps/tenancy/model';

function buildService(db: ReturnType<typeof createFakeDb>) {
  return new TenancyService(db as any, { inviteUser: vi.fn() } as any, {
    runSystem: (_label: string, callback: () => unknown) => callback(),
  } as any);
}

describe('TenancyService (unit, fake db)', () => {
  const ownerContext = { tenantId: 1n, profileId: 10n, membershipId: 1n, isOwner: true } as any;
  const memberContext = { tenantId: 1n, profileId: 11n, membershipId: 2n, isOwner: false } as any;

  it('rejects reserved workspace slugs before querying', async () => {
    const tenancy = buildService(createFakeDb());

    await expect(
      tenancy.createWorkspace({
        name: 'Admin Workspace',
        slug: 'admin',
        email: 'owner@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires owner context to update tenant settings', async () => {
    const tenancy = buildService(createFakeDb());

    await expect(tenancy.updateTenant(memberContext, { name: 'New Name' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents deactivating tenant owners', async () => {
    const db = createFakeDb().queue(tenantMembership, [
      { id: 1n, tenantId: 1n, profileId: 20n, status: 'active', isOwner: true },
    ]);
    const tenancy = buildService(db);

    await expect(tenancy.deactivateMember(ownerContext, 20n)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates tenant settings for owners', async () => {
    const db = createFakeDb().insertReturning(tenant, {
      id: 1n,
      name: 'Acme Updated',
      slug: 'acme',
      status: 'active',
      plan: 'business',
      metadata: { theme: 'ocean' },
      updatedAt: new Date(),
    });
    const tenancy = buildService(db);

    const res = await tenancy.updateTenant(ownerContext, {
      name: 'Acme Updated',
      plan: 'business',
      metadata: { theme: 'ocean' },
    });

    expect(res).toMatchObject({ id: '1', name: 'Acme Updated', plan: 'business' });
    expect(db.updates.some((entry) => entry.table === tenant)).toBe(true);
  });
});
