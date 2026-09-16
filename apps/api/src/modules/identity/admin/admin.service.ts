import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SQL, and, count, desc, eq, exists, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import { CreateAdminUserDto } from '$modules/identity/admin/dto/create-admin-user.dto';
import { UpdateAdminUserDto } from '$modules/identity/admin/dto/update-admin-user.dto';
import { UpdateUserStatusDto } from '$modules/identity/admin/dto/update-user-status.dto';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { UsersService } from '$modules/identity/users/users.service';
import { TenantContext } from '$common/auth/tenant-context';
import { profile, type Profile } from '$modules/identity/users/model';
import { organization, profileOrganization } from '$modules/directory/organizations/model';
import { tenantMembership, tenantOrganization } from '$modules/tenancy/model';
import { role as roleTable, userRole as userRoleTable } from '$modules/identity/rbac/model';

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly usersService: UsersService,
  ) {}

private async tenantProfileIds(tenantId: bigint): Promise<bigint[]> {
    const rows = await this.db.client
      .select({ profileId: tenantMembership.profileId })
      .from(tenantMembership)
      .where(and(eq(tenantMembership.tenantId, tenantId), eq(tenantMembership.status, 'active')));
    return rows.map((r) => r.profileId);
  }

  private async scopedProfileCondition(tenantId?: bigint): Promise<SQL | undefined> {
    if (!tenantId) return undefined;
    const profileIds = await this.tenantProfileIds(tenantId);
    return profileIds.length ? inArray(profile.id, profileIds) : (sql`false` as SQL);
  }

  private async profileInTenant(tenantId: bigint, profileId: bigint): Promise<boolean> {
    const [row] = await this.db.client
      .select({ id: tenantMembership.id })
      .from(tenantMembership)
      .where(
        and(
          eq(tenantMembership.tenantId, tenantId),
          eq(tenantMembership.profileId, profileId),
          eq(tenantMembership.status, 'active'),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  private async organizationInTenant(tenantId: bigint, organizationId: bigint): Promise<boolean> {
    const [row] = await this.db.client
      .select({ id: tenantOrganization.id })
      .from(tenantOrganization)
      .where(and(eq(tenantOrganization.tenantId, tenantId), eq(tenantOrganization.organizationId, organizationId)))
      .limit(1);
    return Boolean(row);
  }

  private async hydrateUsers(users: Profile[], tenantId?: bigint) {
    if (users.length === 0) return [];
    const ids = users.map((user) => user.id);

    const [orgRows, roleRows] = await Promise.all([
      this.db.client
        .select({ membership: profileOrganization, organization })
        .from(profileOrganization)
        .leftJoin(organization, eq(profileOrganization.organizationId, organization.id))
        .where(
          and(
            inArray(profileOrganization.profileId, ids),
            tenantId ? eq(profileOrganization.tenantId, tenantId) : undefined,
          ),
        ),
      this.db.client
        .select({ userRole: userRoleTable, role: roleTable, organization })
        .from(userRoleTable)
        .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
        .leftJoin(organization, eq(userRoleTable.organizationId, organization.id))
        .where(and(inArray(userRoleTable.profileId, ids), tenantId ? eq(userRoleTable.tenantId, tenantId) : undefined)),
    ]);

    return users.map((user) => ({
      ...user,
      organizations: orgRows
        .filter((r) => r.membership.profileId === user.id)
        .map(({ membership, organization: org }) => ({ ...membership, organization: org })),
      roles: roleRows
        .filter((r) => r.userRole.profileId === user.id && r.role)
        .map(({ userRole: ur, role, organization: org }) => ({ ...ur, role, organization: org })),
    }));
  }

  async listUsers(filters: Record<string, any>, tenant?: TenantContext) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(filters.per_page ?? 20)));
    const skip = (page - 1) * perPage;
    const tenantId = tenant?.tenantId ?? this.tenantContext.currentTenantId();

    const conditions: SQL[] = [];

    if (filters.type) conditions.push(eq(profile.type, String(filters.type)));
    if (filters.status) conditions.push(eq(profile.status, String(filters.status)));

    if (filters.search) {
      const search = `%${String(filters.search)}%`;
      const searchFilter = or(
        ilike(profile.username, search),
        ilike(profile.email, search),
        ilike(profile.firstName, search),
        ilike(profile.lastName, search),
      );
      if (searchFilter) conditions.push(searchFilter as SQL);
    }

    if (filters.organization_id) {
      try {
        const orgId = toBigInt(filters.organization_id);
        const orgFilter = or(
          eq(profile.primaryOrganizationId, orgId),
          exists(
            this.db.client
              .select({ id: profileOrganization.id })
              .from(profileOrganization)
              .where(
                and(
                  eq(profileOrganization.organizationId, orgId),
                  tenantId ? eq(profileOrganization.tenantId, tenantId) : undefined,
                ),
              ),
          ),
        );
        if (orgFilter) conditions.push(orgFilter as SQL);
      } catch {
        // ignore invalid org id format
      }
    }

    if (tenantId) {
      const profileIds = await this.tenantProfileIds(tenantId);
      conditions.push(profileIds.length ? inArray(profile.id, profileIds) : (sql`false` as SQL));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({ user: profile })
        .from(profile)
        .where(where)
        .orderBy(desc(profile.createdAt))
        .offset(skip)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(profile).where(where),
    ]);

    const users = await this.hydrateUsers(rows.map((r) => r.user), tenantId);

    return paginatedResponse(users.map((user) => this.serializeUser(user)), {
      page,
      per_page: perPage,
      total: Number(totalRows[0]?.value ?? 0),
    });
  }

  async getUser(profileId: string, tenant?: TenantContext) {
    const id = parseBigIntId(profileId, 'profile id');
    const tenantId = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    if (tenantId) {
      const isMember = await this.profileInTenant(tenantId, id);
      if (!isMember) throw new NotFoundException('Profile not found');
    }
    const [user] = await this.db.client
      .select()
      .from(profile)
      .where(and(eq(profile.id, id), ...(await this.membershipCondition(tenantId))))
      .limit(1);
    if (!user) throw new NotFoundException('Profile not found');
    const [hydrated] = await this.hydrateUsers([user], tenantId);
    return this.serializeUser(hydrated);
  }

  private async membershipCondition(tenantId?: bigint): Promise<SQL[]> {
    if (!tenantId) return [];
    const condition = await this.scopedProfileCondition(tenantId);
    return condition ? [condition] : [];
  }

  async createUser(dto: CreateAdminUserDto, tenant?: TenantContext) {
    const email = dto.email.trim().toLowerCase();
    const requestedUsername = dto.username?.trim();
    const tenantId = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const usernameScope = await this.scopedProfileCondition(tenantId);

    const username = requestedUsername
      ? requestedUsername
      : await generateUniqueUsername(
          makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
          async (candidate) => {
            const [row] = await this.db.client
              .select({ id: profile.id })
              .from(profile)
              .where(and(eq(profile.username, candidate), ...(usernameScope ? [usernameScope] : [])))
              .limit(1);
            return Boolean(row);
          },
        );

    const [emailExists] = await this.db.client
      .select({ id: profile.id })
      .from(profile)
      .where(and(eq(profile.email, email), ...(await this.membershipCondition(tenantId))))
      .limit(1);
    const usernameExists = requestedUsername
      ? await this.db.client
          .select({ id: profile.id })
          .from(profile)
          .where(and(eq(profile.username, username), ...(await this.membershipCondition(tenantId))))
          .limit(1)
      : null;

    if (emailExists) throw new BadRequestException('Email already exists');
    if (usernameExists) throw new BadRequestException('Username already exists');

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const userType = dto.type ?? 'staff';
    const orgInput = dto.primary_organization_id ?? dto.organization_id;
    let primaryOrganizationId: bigint | null = null;
    if (orgInput !== undefined) {
      const trimmed = String(orgInput).trim();
      if (trimmed) {
        try {
          primaryOrganizationId = toBigInt(trimmed);
        } catch {
          throw new BadRequestException('Invalid primary organization id');
        }
      }
    }
    if (['staff', 'employee'].includes(userType) && !primaryOrganizationId) {
      throw new BadRequestException('Primary organization is required for staff');
    }
    if (primaryOrganizationId) {
      const organizationExists = await this.db.client
        .select({ id: organization.id })
        .from(organization)
        .where(
          and(
            eq(organization.id, primaryOrganizationId),
            tenantId ? eq(organization.tenantId, tenantId) : undefined,
          ),
        )
        .limit(1);
      if (!organizationExists[0]) throw new BadRequestException('Organization not found');
      if (tenantId) {
        const isMapped = await this.organizationInTenant(tenantId, primaryOrganizationId);
        if (!isMapped) throw new BadRequestException('Organization does not belong to the active tenant');
      }
    }

    const created = await this.db.client.transaction(async (tx) => {
      const [created] = await tx
        .insert(profile)
        .values({
          username,
          email,
          passwordHash,
          firstName: dto.first_name,
          lastName: dto.last_name,
          type: userType,
          status: dto.status ?? 'active',
          primaryOrganizationId,
        })
        .returning();

      if (primaryOrganizationId) {
        await tx
          .insert(profileOrganization)
          .values({
            profileId: created.id,
            organizationId: primaryOrganizationId,
            tenantId: tenantId,
            isPrimary: true,
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [profileOrganization.profileId, profileOrganization.organizationId],
            set: { isPrimary: true },
          });
      }
      if (tenantId) {
        await tx.insert(tenantMembership).values({
          tenantId,
          profileId: created.id,
          status: 'active',
          isOwner: false,
        });
      }

      // Assign roles
      if (dto.roles) {
        let roleSlugs: string[] = [];
        if (typeof dto.roles === 'string') {
          roleSlugs = dto.roles.split(',').map((r) => r.trim()).filter(Boolean);
        } else if (Array.isArray(dto.roles)) {
          roleSlugs = dto.roles.map((r) => String(r).trim()).filter(Boolean);
        }

        if (roleSlugs.length > 0) {
          const roleRows = await tx
            .select({ id: roleTable.id })
            .from(roleTable)
            .where(
              and(
                inArray(roleTable.slug, roleSlugs),
                eq(roleTable.isActive, true),
                tenantId ? or(eq(roleTable.tenantId, tenantId), isNull(roleTable.tenantId)) : undefined,
              ),
            );

          await tx
            .delete(userRoleTable)
            .where(and(eq(userRoleTable.profileId, created.id), tenantId ? eq(userRoleTable.tenantId, tenantId) : undefined));
          if (roleRows.length > 0) {
            await tx.insert(userRoleTable).values(
              roleRows.map((role) => ({
                profileId: created.id,
                roleId: role.id,
                tenantId: tenantId as bigint,
                isPrimaryRole: false,
              })),
            );
          }
        }
      }

      return created;
    });

    const [user] = await this.hydrateUsers([created], tenantId);
    const serialized = this.serializeUser(user);

    // Send invitation email if requested
    const shouldSendInvite = dto.send_invite === true || dto.send_invite === 'true';
    if (shouldSendInvite) {
      try {
        await this.usersService.inviteUser(
          String(user.id),
          { message: 'You have been added to the system.' },
          tenantId,
        );
      } catch (err) {
        console.error(`Failed to send invite email to ${dto.email}:`, err);
      }
    }

    return serialized;
  }

  async updateUser(profileId: string, dto: UpdateAdminUserDto, tenant?: TenantContext) {
    const id = parseBigIntId(profileId, 'profile id');
    const tenantId = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    if (tenantId) {
      const isMember = await this.profileInTenant(tenantId, id);
      if (!isMember) throw new NotFoundException('Profile not found');
    }
    const [existing] = await this.db.client
      .select()
      .from(profile)
      .where(and(eq(profile.id, id), ...(await this.membershipCondition(tenantId))))
      .limit(1);
    if (!existing) throw new NotFoundException('Profile not found');

    const data: {
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      type?: string;
      status?: string;
      primaryOrganizationId?: bigint | null;
      passwordHash?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (dto.username && dto.username !== existing.username) {
      const usernameExists = await this.db.client
        .select({ id: profile.id })
        .from(profile)
        .where(and(eq(profile.username, dto.username), ...(await this.membershipCondition(tenantId))))
        .limit(1);
      if (usernameExists[0]) throw new BadRequestException('Username already exists');
      data.username = dto.username;
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailExists = await this.db.client
          .select({ id: profile.id })
          .from(profile)
          .where(and(eq(profile.email, email), ...(await this.membershipCondition(tenantId))))
          .limit(1);
        if (emailExists[0]) throw new BadRequestException('Email already exists');
      }
      data.email = email;
    }

    if (dto.first_name !== undefined) data.firstName = dto.first_name;
    if (dto.last_name !== undefined) data.lastName = dto.last_name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const orgInput = dto.primary_organization_id ?? dto.organization_id;
    let nextPrimaryOrganizationId = existing.primaryOrganizationId;
    if (orgInput !== undefined) {
      const trimmed = String(orgInput).trim();
      if (!trimmed) {
        nextPrimaryOrganizationId = null;
      } else {
        try {
          nextPrimaryOrganizationId = toBigInt(trimmed);
        } catch {
          throw new BadRequestException('Invalid primary organization id');
        }
      }
      data.primaryOrganizationId = nextPrimaryOrganizationId;
    }

    const nextType = dto.type ?? existing.type;
    if (['staff', 'employee'].includes(nextType) && !nextPrimaryOrganizationId) {
      throw new BadRequestException('Primary organization is required for staff');
    }

    if (nextPrimaryOrganizationId) {
      const organizationExists = await this.db.client
        .select({ id: organization.id })
        .from(organization)
        .where(
          and(
            eq(organization.id, nextPrimaryOrganizationId),
            tenantId ? eq(organization.tenantId, tenantId) : undefined,
          ),
        )
        .limit(1);
      if (!organizationExists[0]) throw new BadRequestException('Organization not found');
      if (tenantId) {
        const isMapped = await this.organizationInTenant(tenantId, nextPrimaryOrganizationId);
        if (!isMapped) throw new BadRequestException('Organization does not belong to the active tenant');
      }
    }

    const updated = await this.db.client.transaction(async (tx) => {
      const [updated] = await tx.update(profile).set(data).where(eq(profile.id, id)).returning();

      if (orgInput !== undefined) {
        await tx
          .update(profileOrganization)
          .set({ isPrimary: false })
          .where(and(eq(profileOrganization.profileId, id), tenantId ? eq(profileOrganization.tenantId, tenantId) : undefined));
        if (nextPrimaryOrganizationId) {
          await tx
            .insert(profileOrganization)
            .values({
              profileId: id,
              organizationId: nextPrimaryOrganizationId,
              tenantId: tenantId,
              isPrimary: true,
              createdAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [profileOrganization.profileId, profileOrganization.organizationId],
              set: { isPrimary: true },
            });
        }
      }

      return updated;
    });

    const [user] = await this.hydrateUsers([updated], tenantId);
    return this.serializeUser(user);
  }

  async updateStatus(profileId: string, dto: UpdateUserStatusDto, tenant?: TenantContext) {
    const id = parseBigIntId(profileId, 'profile id');
    const tenantId = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    if (tenantId) {
      const isMember = await this.profileInTenant(tenantId, id);
      if (!isMember) throw new NotFoundException('Profile not found');
    }
    const [existing] = await this.db.client
      .select()
      .from(profile)
      .where(and(eq(profile.id, id), ...(await this.membershipCondition(tenantId))))
      .limit(1);
    if (!existing) throw new NotFoundException('Profile not found');

    const [user] = await this.db.client
      .update(profile)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(profile.id, id))
      .returning();

    const [hydrated] = await this.hydrateUsers([user], tenantId);
    return this.serializeUser(hydrated);
  }

  private serializeUser(user: any) {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      type: user.type,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      primary_organization_id: user.primaryOrganizationId ? user.primaryOrganizationId.toString() : null,
      roles: (user.roles ?? []).map((userRole: any) => ({
        id: userRole.role.id.toString(),
        name: userRole.role.name,
        slug: userRole.role.slug,
        is_primary_role: userRole.isPrimaryRole,
        organization: userRole.organization
          ? {
              id: userRole.organization.id.toString(),
              name: userRole.organization.name,
              code: userRole.organization.code,
            }
          : null,
      })),
      organizations: (user.organizations ?? []).map((membership: any) => ({
        id: membership.organization.id.toString(),
        name: membership.organization.name,
        code: membership.organization.code,
        type: membership.organization.organizationType,
        is_active: membership.organization.isActive,
      })),
    };
  }

  async createBulkUsers(users: CreateAdminUserDto[], tenant?: TenantContext) {
    let successCount = 0;
    let failedCount = 0;
    const results: { identifier: string; status: 'success' | 'failed'; error?: string }[] = [];

    for (const userDto of users) {
      const identifier = userDto.email || `${userDto.first_name || ''} ${userDto.last_name || ''}`.trim() || 'Unknown';
      try {
        await this.createUser(userDto, tenant);
        successCount++;
        results.push({ identifier, status: 'success' });
      } catch (err: any) {
        failedCount++;
        results.push({
          identifier,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      successCount,
      failedCount,
      results,
    };
  }
}
