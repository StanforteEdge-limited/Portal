import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { AuthService } from '$modules/identity/auth/auth.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { TenantContext } from '$common/auth/tenant-context';
import { AssignUserRolesDto } from '$modules/identity/rbac/dto/assign-user-roles.dto';
import { CreatePermissionDto } from '$modules/identity/rbac/dto/create-permission.dto';
import { CreateRoleDto } from '$modules/identity/rbac/dto/create-role.dto';
import { SetRolePermissionsDto } from '$modules/identity/rbac/dto/set-role-permissions.dto';
import { UpdatePermissionDto } from '$modules/identity/rbac/dto/update-permission.dto';
import { UpdateRoleDto } from '$modules/identity/rbac/dto/update-role.dto';
import { role as roleTable, permission as permissionTable, rolePermission, userRole as userRoleTable } from '$modules/identity/rbac/model';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/hrm/organizations/model';
import { tenantMembership } from '$modules/tenancy/model';

@Injectable()
export class RbacService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly auth: AuthService,
  ) {}

private templateScopeCondition(table: typeof roleTable | typeof permissionTable, tid?: bigint): SQL | undefined {
    if (!tid) return undefined;
    return or(eq(table.tenantId, tid), isNull(table.tenantId)) as SQL;
  }

  async getOverview(includeInactive = false, tenant?: TenantContext) {
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const permCond = this.templateScopeCondition(permissionTable, tid);
    const isActiveCond = includeInactive ? undefined : eq(roleTable.isActive, true);

    const [roleCount, permissionCount, userProfileIds] = await Promise.all([
      this.db.client.select({ value: count() }).from(roleTable).where(and(isActiveCond, roleCond)),
      this.db.client.select({ value: count() }).from(permissionTable).where(permCond),
      tid
        ? this.db.client
            .selectDistinct({ profileId: userRoleTable.profileId })
            .from(userRoleTable)
            .where(eq(userRoleTable.tenantId, tid))
        : ([] as any[]),
    ]);

    return {
      roles: Number(roleCount[0]?.value ?? 0),
      permissions: Number(permissionCount[0]?.value ?? 0),
      assigned_users: userProfileIds.length,
    };
  }

  async listRoles(includeInactive = false, tenant?: TenantContext) {
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const conditions: SQL[] = [];
    if (!includeInactive) conditions.push(eq(roleTable.isActive, true));
    const roleCond = this.templateScopeCondition(roleTable, tid);
    if (roleCond) conditions.push(roleCond);

    const roles = await this.db.client
      .select()
      .from(roleTable)
      .where(and(...conditions))
      .orderBy(asc(roleTable.name));
    const roleIds = roles.map((r) => r.id);

    const [permRows, userRoleRows] = await Promise.all([
      roleIds.length
        ? this.db.client
            .select({ roleId: rolePermission.roleId, perm: permissionTable })
            .from(rolePermission)
            .leftJoin(permissionTable, eq(rolePermission.permissionId, permissionTable.id))
            .where(inArray(rolePermission.roleId, roleIds))
        : ([] as any[]),
      roleIds.length
        ? this.db.client
            .select({ ur: userRoleTable, user: profile, org: organization })
            .from(userRoleTable)
            .leftJoin(profile, eq(userRoleTable.profileId, profile.id))
            .leftJoin(organization, eq(userRoleTable.organizationId, organization.id))
            .where(and(inArray(userRoleTable.roleId, roleIds), tid ? eq(userRoleTable.tenantId, tid) : undefined))
            .orderBy(asc(userRoleTable.profileId))
        : ([] as any[]),
    ]);

    const permByRole = new Map(
      roleIds.map((id) => [
        id,
        permRows
          .filter((p) => p.roleId === id)
          .map((p) => ({
            id: p.perm?.id?.toString() ?? '',
            name: p.perm?.name ?? '',
            slug: p.perm?.slug ?? '',
            module: p.perm?.module,
          })),
      ]),
    );
    const usersByRole = new Map(
      roleIds.map((id) => [
        id,
        userRoleRows
          .filter((u) => u.ur.roleId === id)
          .map((u) => ({
            profile_id: u.user?.id?.toString() ?? '',
            email: u.user?.email ?? '',
            username: u.user?.username,
            organization: u.org
              ? { id: u.org.id.toString(), name: u.org.name, code: u.org.code }
              : null,
            is_primary_role: u.ur.isPrimaryRole,
          })),
      ]),
    );

    const items = roles.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      slug: r.slug,
      description: r.description,
      is_active: r.isActive,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      permissions: permByRole.get(r.id) ?? [],
      users: usersByRole.get(r.id) ?? [],
    }));

    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createRole(dto: CreateRoleDto) {
    const slug = this.normalizeSlug(dto.slug ?? dto.name);
    await this.ensureRoleSlugAvailable(slug);

    const permissionIds = this.parseIds(dto.permission_ids ?? [], 'permission id');
    if (permissionIds.length > 0) {
      await this.ensurePermissionsExist(permissionIds);
    }

    const tid = this.tenantContext.currentTenantId();
    const now = new Date();
    const [created] = await this.db.client
      .insert(roleTable)
      .values({
        name: dto.name.trim(),
        slug,
        description: dto.description,
        isActive: dto.is_active ?? true,
        tenantId: tid ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (permissionIds.length > 0) {
      await this.db.client
        .insert(rolePermission)
        .values(permissionIds.map((permissionId) => ({ roleId: created.id, permissionId })))
        .onConflictDoNothing();
    }

    this.auth.clearRbacStateCache();
    return this.getRoleById(created.id, tid);
  }

  async updateRole(roleId: string, dto: UpdateRoleDto) {
    const id = parseBigIntId(roleId, 'role id');
    const tid = this.tenantContext.currentTenantId();
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const [existing] = await this.db.client
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), roleCond))
      .limit(1);
    if (!existing) throw new NotFoundException('Role not found');

    const slug = dto.slug ? this.normalizeSlug(dto.slug) : undefined;
    if (slug && slug !== existing.slug) {
      await this.ensureRoleSlugAvailable(slug);
    }

    const data: {
      name?: string;
      slug?: string;
      description?: string;
      isActive?: boolean;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (slug !== undefined) data.slug = slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    await this.db.client
      .update(roleTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roleTable.id, id));

    if (dto.permission_ids) {
      const permissionIds = this.parseIds(dto.permission_ids, 'permission id');
      await this.ensurePermissionsExist(permissionIds);
      await this.db.client.transaction(async (tx) => {
        await tx.delete(rolePermission).where(eq(rolePermission.roleId, id));
        await tx
          .insert(rolePermission)
          .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })))
          .onConflictDoNothing();
      });
    }

    this.auth.clearRbacStateCache();
    return this.getRoleById(id, tid);
  }

  async getRoleDeleteImpact(roleId: string, tenant?: TenantContext) {
    const id = parseBigIntId(roleId, 'role id');
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const [role] = await this.db.client
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), roleCond))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const assignments = await this.db.client
      .select({ ur: userRoleTable, user: profile, org: organization })
      .from(userRoleTable)
      .leftJoin(profile, eq(userRoleTable.profileId, profile.id))
      .leftJoin(organization, eq(userRoleTable.organizationId, organization.id))
      .where(and(eq(userRoleTable.roleId, id), tid ? eq(userRoleTable.tenantId, tid) : undefined))
      .orderBy(asc(userRoleTable.profileId));

    return {
      role: {
        id: role.id.toString(),
        name: role.name,
        slug: role.slug,
      },
      usage: {
        assignment_count: assignments.length,
        assignments: assignments.map((item) => ({
          id: item.ur.id.toString(),
          profile_id: item.ur.profileId.toString(),
          email: item.user?.email ?? '',
          username: item.user?.username,
          organization: item.org
            ? { id: item.org.id.toString(), name: item.org.name, code: item.org.code }
            : null,
        })),
      },
    };
  }

  async deleteRole(roleId: string, replacementRoleId?: string, tenant?: TenantContext) {
    const id = parseBigIntId(roleId, 'role id');
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const [role] = await this.db.client
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), roleCond))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const assignments = await this.db.client
      .select({ id: userRoleTable.id, profileId: userRoleTable.profileId, organizationId: userRoleTable.organizationId, isPrimaryRole: userRoleTable.isPrimaryRole })
      .from(userRoleTable)
      .where(and(eq(userRoleTable.roleId, id), tid ? eq(userRoleTable.tenantId, tid) : undefined));

    let replacementId: bigint | null = null;
    if (assignments.length > 0) {
      if (!replacementRoleId) {
        throw new BadRequestException(
          `Role is assigned to ${assignments.length} user-role record(s). Provide replacement_role_id to reassign before delete.`,
        );
      }
      replacementId = parseBigIntId(replacementRoleId, 'replacement role id');
      if (replacementId === id) {
        throw new BadRequestException('Replacement role must be different from role being deleted');
      }
      const replCond = this.templateScopeCondition(roleTable, tid);
      const [replacementRole] = await this.db.client
        .select({ id: roleTable.id })
        .from(roleTable)
        .where(and(eq(roleTable.id, replacementId), replCond))
        .limit(1);
      if (!replacementRole) throw new NotFoundException('Replacement role not found');
    }

    await this.db.client.transaction(async (tx) => {
      if (replacementId) {
        for (const assignment of assignments) {
          const [existingReplacement] = await tx
            .select()
            .from(userRoleTable)
            .where(
              and(
                eq(userRoleTable.profileId, assignment.profileId),
                eq(userRoleTable.roleId, replacementId),
                eq(userRoleTable.organizationId, assignment.organizationId),
                tid ? eq(userRoleTable.tenantId, tid) : undefined,
              ),
            )
            .limit(1);

          if (existingReplacement) {
            if (assignment.isPrimaryRole && !existingReplacement.isPrimaryRole) {
              await tx
                .update(userRoleTable)
                .set({ isPrimaryRole: true })
                .where(eq(userRoleTable.id, existingReplacement.id));
            }
            await tx.delete(userRoleTable).where(eq(userRoleTable.id, assignment.id));
            continue;
          }

          await tx
            .update(userRoleTable)
            .set({ roleId: replacementId, isPrimaryRole: assignment.isPrimaryRole })
            .where(eq(userRoleTable.id, assignment.id));
        }
      }

      await tx.delete(rolePermission).where(eq(rolePermission.roleId, id));
      await tx.delete(roleTable).where(eq(roleTable.id, id));
    });

    this.auth.clearRbacStateCache();
    return {
      success: true,
      reassigned_assignments: assignments.length,
    };
  }

  async setRolePermissions(roleId: string, dto: SetRolePermissionsDto) {
    const id = parseBigIntId(roleId, 'role id');
    const tid = this.tenantContext.currentTenantId();
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const [role] = await this.db.client
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), roleCond))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const permissionIds = this.parseIds(dto.permission_ids, 'permission id');
    await this.ensurePermissionsExist(permissionIds);

    await this.db.client.transaction(async (tx) => {
      await tx.delete(rolePermission).where(eq(rolePermission.roleId, id));
      await tx
        .insert(rolePermission)
        .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })))
        .onConflictDoNothing();
      await tx.update(roleTable).set({ updatedAt: new Date() }).where(eq(roleTable.id, id));
    });

    this.auth.clearRbacStateCache();
    return this.getRoleById(id, tid);
  }

  async listPermissions(filters: { module?: string; search?: string }) {
    const conditions: SQL[] = [];
    if (filters.module) conditions.push(eq(permissionTable.module, filters.module));
    if (filters.search) {
      const search = `%${filters.search}%`;
      const searchCond = or(ilike(permissionTable.name, search), ilike(permissionTable.slug, search));
      if (searchCond) conditions.push(searchCond as SQL);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const perms = await this.db.client
      .select()
      .from(permissionTable)
      .where(where)
      .orderBy(asc(permissionTable.module), asc(permissionTable.name));
    const permIds = perms.map((p) => p.id);

    const rolePermRows = permIds.length
      ? await this.db.client
          .select({ permissionId: rolePermission.permissionId, role: roleTable })
          .from(rolePermission)
          .leftJoin(roleTable, eq(rolePermission.roleId, roleTable.id))
          .where(inArray(rolePermission.permissionId, permIds))
      : ([] as any[]);

    const rolesByPerm = new Map(
      permIds.map((id) => [
        id,
        rolePermRows
          .filter((r) => r.permissionId === id)
          .map((r) => ({
            id: r.role?.id?.toString() ?? '',
            name: r.role?.name ?? '',
            slug: r.role?.slug ?? '',
          })),
      ]),
    );

    return perms.map((perm) => ({
      id: perm.id.toString(),
      name: perm.name,
      slug: perm.slug,
      description: perm.description,
      module: perm.module,
      created_at: perm.createdAt,
      updated_at: perm.updatedAt,
      roles: rolesByPerm.get(perm.id) ?? [],
    }));
  }

  async createPermission(dto: CreatePermissionDto) {
    const slug = this.normalizeSlug(dto.slug ?? dto.name);
    const tid = this.tenantContext.currentTenantId();
    const permCond = this.templateScopeCondition(permissionTable, tid);
    const [existingPerm] = await this.db.client
      .select()
      .from(permissionTable)
      .where(and(eq(permissionTable.slug, slug), permCond))
      .limit(1);
    if (existingPerm) throw new BadRequestException('Permission slug already exists');

    const now = new Date();
    const [created] = await this.db.client
      .insert(permissionTable)
      .values({
        name: dto.name.trim(),
        slug,
        description: dto.description,
        module: dto.module,
        tenantId: tid ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    this.auth.clearRbacStateCache();
    return {
      id: created.id.toString(),
      name: created.name,
      slug: created.slug,
      description: created.description,
      module: created.module,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    };
  }

  async getPermissionDeleteImpact(permissionId: string) {
    const id = parseBigIntId(permissionId, 'permission id');
    const [perm] = await this.db.client
      .select()
      .from(permissionTable)
      .where(eq(permissionTable.id, id))
      .limit(1);
    if (!perm) throw new NotFoundException('Permission not found');

    const roleRows = await this.db.client
      .select({ role: roleTable })
      .from(rolePermission)
      .leftJoin(roleTable, eq(rolePermission.roleId, roleTable.id))
      .where(eq(rolePermission.permissionId, id))
      .orderBy(asc(roleTable.name));

    return {
      permission: {
        id: perm.id.toString(),
        name: perm.name,
        slug: perm.slug,
        module: perm.module,
      },
      usage: {
        role_count: roleRows.length,
        roles: roleRows.map((item) => ({
          id: item.role?.id?.toString() ?? '',
          name: item.role?.name ?? '',
          slug: item.role?.slug ?? '',
        })),
      },
    };
  }

  async updatePermission(permissionId: string, dto: UpdatePermissionDto) {
    const id = parseBigIntId(permissionId, 'permission id');
    const tid = this.tenantContext.currentTenantId();
    const permCond = this.templateScopeCondition(permissionTable, tid);
    const [existing] = await this.db.client
      .select()
      .from(permissionTable)
      .where(and(eq(permissionTable.id, id), permCond))
      .limit(1);
    if (!existing) throw new NotFoundException('Permission not found');

    const slug = dto.slug ? this.normalizeSlug(dto.slug) : undefined;
    if (slug && slug !== existing.slug) {
      const [slugExists] = await this.db.client
        .select()
        .from(permissionTable)
        .where(and(eq(permissionTable.slug, slug), permCond))
        .limit(1);
      if (slugExists) throw new BadRequestException('Permission slug already exists');
    }

    const data: { name?: string; slug?: string; description?: string; module?: string } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (slug !== undefined) data.slug = slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.module !== undefined) data.module = dto.module;

    const [updated] = await this.db.client
      .update(permissionTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(permissionTable.id, id))
      .returning();

    this.auth.clearRbacStateCache();
    return {
      id: updated.id.toString(),
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      module: updated.module,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  async deletePermission(permissionId: string, replacementPermissionId?: string) {
    const id = parseBigIntId(permissionId, 'permission id');
    const tid = this.tenantContext.currentTenantId();
    const permCond = this.templateScopeCondition(permissionTable, tid);
    const [existing] = await this.db.client
      .select()
      .from(permissionTable)
      .where(and(eq(permissionTable.id, id), permCond))
      .limit(1);
    if (!existing) throw new NotFoundException('Permission not found');

    const assignments = await this.db.client
      .select({ roleId: rolePermission.roleId })
      .from(rolePermission)
      .where(eq(rolePermission.permissionId, id));
    const affectedRoleIds = Array.from(new Set(assignments.map((item) => item.roleId)));

    let replacementId: bigint | null = null;
    if (affectedRoleIds.length > 0) {
      if (!replacementPermissionId) {
        throw new BadRequestException(
          `Permission is assigned to ${affectedRoleIds.length} role(s). Provide replacement_permission_id to preserve role capabilities before delete.`,
        );
      }
      replacementId = parseBigIntId(replacementPermissionId, 'replacement permission id');
      if (replacementId === id) {
        throw new BadRequestException('Replacement permission must be different from permission being deleted');
      }
      const [replacement] = await this.db.client
        .select()
        .from(permissionTable)
        .where(and(eq(permissionTable.id, replacementId), permCond))
        .limit(1);
      if (!replacement) throw new NotFoundException('Replacement permission not found');
    }

    await this.db.client.transaction(async (tx) => {
      if (replacementId && affectedRoleIds.length > 0) {
        await tx
          .insert(rolePermission)
          .values(
            affectedRoleIds.map((roleId) => ({
              roleId,
              permissionId: replacementId as bigint,
            })),
          )
          .onConflictDoNothing();
      }

      await tx.delete(rolePermission).where(eq(rolePermission.permissionId, id));
      await tx.delete(permissionTable).where(eq(permissionTable.id, id));
    });

    this.auth.clearRbacStateCache();
    return {
      success: true,
      affected_roles: affectedRoleIds.length,
    };
  }

  async getUserRoles(profileId: string, tenant?: TenantContext) {
    const id = parseBigIntId(profileId, 'profile id');
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();

    if (tid) {
      const [membership] = await this.db.client
        .select()
        .from(tenantMembership)
        .where(and(eq(tenantMembership.tenantId, tid), eq(tenantMembership.profileId, id), eq(tenantMembership.status, 'active')))
        .limit(1);
      if (!membership) throw new NotFoundException('Profile not found');
    }

    const [prof] = await this.db.client
      .select()
      .from(profile)
      .where(eq(profile.id, id))
      .limit(1);
    if (!prof) throw new NotFoundException('Profile not found');

    const urRows = await this.db.client
      .select({ ur: userRoleTable, role: roleTable, org: organization })
      .from(userRoleTable)
      .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .leftJoin(organization, eq(userRoleTable.organizationId, organization.id))
      .where(and(eq(userRoleTable.profileId, id), tid ? eq(userRoleTable.tenantId, tid) : undefined))
      .orderBy(asc(userRoleTable.roleId));

    const roleIds = Array.from(new Set(urRows.map((r) => r.role?.id).filter(Boolean) as bigint[]));
    const permRows = roleIds.length
      ? await this.db.client
          .select({ roleId: rolePermission.roleId, perm: permissionTable })
          .from(rolePermission)
          .leftJoin(permissionTable, eq(rolePermission.permissionId, permissionTable.id))
          .where(inArray(rolePermission.roleId, roleIds))
      : ([] as any[]);

    const permByRole = new Map(
      roleIds.map((id) => [
        id,
        permRows
          .filter((p) => p.roleId === id)
          .map((p) => ({
            id: p.perm?.id?.toString() ?? '',
            slug: p.perm?.slug ?? '',
            name: p.perm?.name ?? '',
          })),
      ]),
    );

    return {
      profile: {
        id: prof.id.toString(),
        email: prof.email,
        username: prof.username,
        first_name: prof.firstName,
        last_name: prof.lastName,
      },
      roles: urRows.map((ur) => ({
        role_id: ur.role?.id?.toString() ?? '',
        name: ur.role?.name ?? '',
        slug: ur.role?.slug ?? '',
        organization: ur.org
          ? { id: ur.org.id.toString(), name: ur.org.name, code: ur.org.code }
          : null,
        is_primary_role: ur.ur.isPrimaryRole,
        permissions: permByRole.get(ur.ur.roleId) ?? [],
      })),
    };
  }

  async assignUserRoles(profileId: string, dto: AssignUserRolesDto, tenant?: TenantContext) {
    const id = parseBigIntId(profileId, 'profile id');
    const tid = tenant?.tenantId ?? this.tenantContext.currentTenantId();
    const [prof] = await this.db.client
      .select()
      .from(profile)
      .where(eq(profile.id, id))
      .limit(1);
    if (!prof) throw new NotFoundException('Profile not found');
    if (tid) {
      const [membership] = await this.db.client
        .select()
        .from(tenantMembership)
        .where(and(eq(tenantMembership.tenantId, tid), eq(tenantMembership.profileId, id), eq(tenantMembership.status, 'active')))
        .limit(1);
      if (!membership) throw new NotFoundException('Profile not found');
    }

    const roleIds = Array.from(new Set(this.parseIds(dto.role_ids, 'role id')));
    if (roleIds.length === 0) {
      throw new BadRequestException('At least one role must be provided');
    }

    const organizationId = dto.organization_id ? parseBigIntId(dto.organization_id, 'organization id') : null;
    if (organizationId) {
      const [org] = await this.db.client
        .select()
        .from(organization)
        .where(and(eq(organization.id, organizationId), tid ? eq(organization.tenantId, tid) : undefined))
        .limit(1);
      if (!org) throw new NotFoundException('Organization not found');
    }

    await this.ensureRolesExist(roleIds);

    let primaryRoleId: bigint | null = null;
    if (dto.primary_role_id) {
      primaryRoleId = parseBigIntId(dto.primary_role_id, 'primary role id');
      if (!roleIds.some((roleId) => roleId === primaryRoleId)) {
        throw new BadRequestException('Primary role must be included in role_ids');
      }
    }

    await this.db.client.transaction(async (tx) => {
      if (dto.replace_existing) {
        const replaceWhere: SQL[] = [eq(userRoleTable.profileId, id)];
        if (tid) replaceWhere.push(eq(userRoleTable.tenantId, tid));
        if (organizationId) replaceWhere.push(eq(userRoleTable.organizationId, organizationId));
        await tx.delete(userRoleTable).where(and(...replaceWhere));
      }

      if (primaryRoleId) {
        const clearWhere: SQL[] = [eq(userRoleTable.profileId, id)];
        if (tid) clearWhere.push(eq(userRoleTable.tenantId, tid));
        if (organizationId) clearWhere.push(eq(userRoleTable.organizationId, organizationId));
        clearWhere.push(eq(userRoleTable.isPrimaryRole, true));
        await tx
          .update(userRoleTable)
          .set({ isPrimaryRole: false })
          .where(and(...clearWhere));
      }

      for (const roleId of roleIds) {
        const findWhere: SQL[] = [eq(userRoleTable.profileId, id), eq(userRoleTable.roleId, roleId)];
        if (tid) findWhere.push(eq(userRoleTable.tenantId, tid));
        if (organizationId) findWhere.push(eq(userRoleTable.organizationId, organizationId));
        const [existing] = await tx
          .select()
          .from(userRoleTable)
          .where(and(...findWhere))
          .limit(1);

        if (existing) {
          if (primaryRoleId && existing.roleId === primaryRoleId && !existing.isPrimaryRole) {
            await tx
              .update(userRoleTable)
              .set({ isPrimaryRole: true })
              .where(eq(userRoleTable.id, existing.id));
          }
          continue;
        }

        await tx.insert(userRoleTable).values({
          profileId: id,
          roleId,
          tenantId: tid as bigint,
          organizationId: organizationId ?? null,
          isPrimaryRole: primaryRoleId ? roleId === primaryRoleId : false,
        });
      }
    });

    this.auth.invalidateRbacState(id, tid);
    return this.getUserRoles(profileId, tenant);
  }

  private async getRoleById(id: bigint, tid?: bigint) {
    const roleCond = this.templateScopeCondition(roleTable, tid);
    const [role] = await this.db.client
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), roleCond))
      .limit(1);
    if (!role) throw new NotFoundException('Role not found');

    const perms = await this.db.client
      .select({ perm: permissionTable })
      .from(rolePermission)
      .leftJoin(permissionTable, eq(rolePermission.permissionId, permissionTable.id))
      .where(eq(rolePermission.roleId, id));

    return {
      id: role.id.toString(),
      name: role.name,
      slug: role.slug,
      description: role.description,
      is_active: role.isActive,
      created_at: role.createdAt,
      updated_at: role.updatedAt,
      permissions: perms.map((permission) => ({
        id: permission.perm?.id?.toString() ?? '',
        name: permission.perm?.name ?? '',
        slug: permission.perm?.slug ?? '',
        module: permission.perm?.module,
      })),
    };
  }

  private parseIds(values: string[], label: string): bigint[] {
    return values.map((value) => parseBigIntId(value, label));
  }

  private normalizeSlug(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug) throw new BadRequestException('Slug is required');
    return slug;
  }

  private async ensureRoleSlugAvailable(slug: string) {
    const [existing] = await this.db.client
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(eq(roleTable.slug, slug))
      .limit(1);
    if (existing) throw new BadRequestException('Role slug already exists');
  }

  private async ensurePermissionsExist(permissionIds: bigint[]) {
    if (permissionIds.length === 0) return;
    const found = await this.db.client
      .select({ id: permissionTable.id })
      .from(permissionTable)
      .where(inArray(permissionTable.id, permissionIds));
    if (found.length !== permissionIds.length) {
      throw new NotFoundException('One or more permissions were not found');
    }
  }

  private async ensureRolesExist(roleIds: bigint[]) {
    const found = await this.db.client
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(inArray(roleTable.id, roleIds));
    if (found.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found');
    }
  }
}
