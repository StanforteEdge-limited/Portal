import { eq } from 'drizzle-orm';
import {
  profile,
  organization,
  tenant,
  role,
  permission,
  rolePermission,
  profileOrganization,
  tenantMembership,
  tenantOrganization,
  userRole,
} from '$app/db/schema';
import type { TestDb } from './pg';

export interface SeedContext {
  db: TestDb;
  userId: bigint;
  tenantId: bigint;
  orgId: bigint;
  profileId: bigint;
  membershipId: bigint;
  roleId: bigint;
  permissionIds: bigint[];
}

export async function seedBasicTenant(db: TestDb): Promise<SeedContext> {
  const now = new Date();

  const [p] = await db.client
    .insert(profile)
    .values({
      email: 'owner@example.com',
      passwordHash: '$2a$10$T6TyX3PcgZC0YEi82H6Mruwhlf.m.ETf3odjOk2DSKByggK.I0T2C',
      status: 'active',
      failedLoginAttempts: 0,
      type: 'employee',
      firstName: 'Alice',
      lastName: 'Owner',
    })
    .returning({ id: profile.id });

  const [org] = await db.client
    .insert(organization)
    .values({
      name: 'Acme',
      code: 'ACME',
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: organization.id });

  const [t] = await db.client
    .insert(tenant)
    .values({
      slug: 'acme',
      name: 'Acme',
    })
    .returning({ id: tenant.id });

  await db.client.update(organization).set({ tenantId: t.id }).where(eq(organization.id, org.id));
  await db.client.insert(tenantOrganization).values({ tenantId: t.id, organizationId: org.id });
  await db.client.update(profile).set({ primaryOrganizationId: org.id, updatedAt: now }).where(eq(profile.id, p.id));

  // Role (owner)
  const [r] = await db.client
    .insert(role)
    .values({
      tenantId: t.id,
      name: 'Owner',
      slug: 'owner',
      isSystem: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: role.id });

  // Profile organization link
  await db.client
    .insert(profileOrganization)
    .values({
      profileId: p.id,
      organizationId: org.id,
      tenantId: t.id,
      isPrimary: true,
      createdAt: now,
    });

  // Tenant membership
  const [m] = await db.client
    .insert(tenantMembership)
    .values({
      profileId: p.id,
      tenantId: t.id,
      role: 'owner',
      isOwner: true,
      status: 'active',
    })
    .returning({ id: tenantMembership.id });

  // Permissions (common) - ensure some exist
  const permsToCreate = [
    { slug: 'users.manage', name: 'Users Manage', module: 'identity' },
    { slug: 'roles.manage', name: 'Roles Manage', module: 'identity' },
    { slug: 'settings.manage', name: 'Settings Manage', module: 'system' },
    { slug: 'tenancy:read', name: 'Tenancy Read', module: 'tenancy' },
    { slug: 'tenancy:write', name: 'Tenancy Write', module: 'tenancy' },
    { slug: '*', name: 'All', module: 'system' },
  ];
  const permIds: bigint[] = [];
  for (const pc of permsToCreate) {
    const existing = await db.client.select().from(permission).where(eq(permission.slug, pc.slug)).limit(1);
    if (existing[0]) {
      permIds.push(existing[0].id);
    } else {
      const [ip] = await db.client
        .insert(permission)
        .values({ ...pc, createdAt: now, updatedAt: now })
        .returning({ id: permission.id });
      permIds.push(ip.id);
    }
  }
  // Grant all to role
  for (const pid of permIds) {
    await db.client.insert(rolePermission).values({ tenantId: t.id, roleId: r.id, permissionId: pid }).onConflictDoNothing();
  }
  await db.client
    .insert(userRole)
    .values({ tenantId: t.id, profileId: p.id, roleId: r.id, isPrimaryRole: true })
    .onConflictDoNothing();

  return {
    db,
    userId: p.id,
    tenantId: t.id,
    orgId: org.id,
    profileId: p.id,
    membershipId: m.id,
    roleId: r.id,
    permissionIds: permIds,
  };
}
