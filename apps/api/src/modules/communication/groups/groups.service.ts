import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, or, SQL } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import type { AppDb } from '$common/db/db.service';
import type { GroupUserRole } from '$app/db/enums';
import { organization } from '$modules/directory/organizations/model';
import { profile } from '$modules/identity/users/model';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { SetGroupMemberScopesDto } from './dto/set-group-member-scopes.dto';
import { SetGroupOrganizationsDto } from './dto/set-group-organizations.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { group, groupOrganization, groupUser, groupUserOrganizationScope } from './model';

@Injectable()
export class GroupsService {
  constructor(private readonly db: DbService) {}

  async list(query: Record<string, any>) {
    const groupType = query.group_type ? String(query.group_type) : undefined;
    const conditions: SQL[] = [
      groupType ? eq(group.type, groupType) : inArray(group.type, ['team', 'department'])
    ];
    if (query.organization_id) {
      const organizationId = parseBigIntId(String(query.organization_id), 'organization id');
      const mappings = await this.db.client
        .select({ groupId: groupOrganization.groupId })
        .from(groupOrganization)
        .where(eq(groupOrganization.organizationId, organizationId));
      conditions.push(or(
        eq(group.organizationId, organizationId),
        mappings.length ? inArray(group.id, mappings.map((mapping) => mapping.groupId)) : undefined,
      )!);
    }
    if (query.active_only === 'true') conditions.push(eq(group.isActive, true));
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(group.name, search), ilike(group.description, search))!);
    }

    const baseRows = await this.db.client
      .select({ id: group.id })
      .from(group)
      .where(and(...conditions))
      .orderBy(asc(group.name));
    const groups = await Promise.all(baseRows.map((row) => this.findGroupWithDetails(row.id)));

    const items = groups.map((group) => this.serializeGroup(group));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async create(createdBy: string, dto: CreateTeamDto) {
    const createdById = parseBigIntId(createdBy, 'creator id');
    const organizationIds = this.parseOrganizationIds(dto.organization_ids, dto.organization_id);
    const primaryOrganizationId = this.resolvePrimaryOrganizationId({
      explicitPrimary: dto.primary_organization_id,
      fallbackOrganizationId: dto.organization_id,
      organizationIds
    });

    await this.ensureOrganizationsExist(organizationIds);

    const team = await this.db.client.transaction(async (tx) => {
      const [created] = await tx.insert(group)
        .values({
          name: dto.name,
          description: dto.description,
          type: dto.group_type ?? 'team',
          organizationId: primaryOrganizationId,
          createdBy: createdById,
          updatedBy: createdById,
          isActive: dto.is_active ?? true
        })
        .returning();

      await tx.insert(groupUser).values({
          groupId: created.id,
          userId: createdById,
          role: 'admin',
          addedBy: createdById
      });

      await this.syncGroupOrganizationsTx(tx, created.id, organizationIds, primaryOrganizationId);
      return created;
    });

    return this.get(team.id.toString());
  }

  async get(id: string) {
    const team = await this.findGroupWithDetails(parseBigIntId(id, 'team id'));
    if (!team) throw new NotFoundException('Group not found');
    return this.serializeGroup(team);
  }

  async update(id: string, userId: string, dto: UpdateTeamDto) {
    const teamId = parseBigIntId(id, 'team id');
    const actor = parseBigIntId(userId, 'user id');

    const existing = await this.findGroup(teamId);
    if (!existing) throw new NotFoundException('Group not found');

    const organizationIds = dto.organization_ids
      ? this.parseOrganizationIds(dto.organization_ids, dto.organization_id)
      : null;
    const primaryOrganizationId = this.resolvePrimaryOrganizationId({
      explicitPrimary: dto.primary_organization_id,
      fallbackOrganizationId: dto.organization_id,
      organizationIds: organizationIds ?? [],
      existingPrimaryOrganizationId: existing.organizationId ?? undefined,
    });

    if (organizationIds) await this.ensureOrganizationsExist(organizationIds);

    await this.db.client.transaction(async (tx) => {
      await tx.update(group)
        .set({
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          type: dto.group_type ?? existing.type,
          organizationId: primaryOrganizationId,
          isActive: dto.is_active ?? existing.isActive,
          updatedBy: actor
        })
        .where(eq(group.id, teamId));

      if (organizationIds) {
        await this.syncGroupOrganizationsTx(tx, teamId, organizationIds, primaryOrganizationId);
      }
    });

    return this.get(id);
  }

  async addMember(id: string, actorId: string, dto: AddGroupMemberDto) {
    const groupId = parseBigIntId(id, 'group id');
    const actor = parseBigIntId(actorId, 'user id');
    const userId = parseBigIntId(dto.user_id, 'user id');

    const role = this.mapMemberRole(dto.role);

    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    await this.ensureOrganizationsBelongToGroup(groupId, organizationIds);

    await this.db.client.transaction(async (tx) => {
      const [membership] = await tx.insert(groupUser)
        .values({
          groupId,
          userId,
          role,
          addedBy: actor
        })
        .onConflictDoUpdate({
          target: [groupUser.groupId, groupUser.userId],
          set: { role, addedBy: actor },
        })
        .returning();

      if (dto.organization_ids) {
        await this.syncGroupMemberScopesTx(tx, membership.id, organizationIds, undefined);
      }
    });

    return this.get(id);
  }

  async removeMember(id: string, userId: string) {
    const groupId = parseBigIntId(id, 'group id');
    const memberId = parseBigIntId(userId, 'user id');

    await this.db.client.delete(groupUser).where(and(eq(groupUser.groupId, groupId), eq(groupUser.userId, memberId)));

    return this.get(id);
  }

  async setOrganizations(id: string, dto: SetGroupOrganizationsDto) {
    const groupId = parseBigIntId(id, 'group id');
    await this.ensureGroupExists(groupId);
    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    const primaryOrganizationId = this.resolvePrimaryOrganizationId({
      explicitPrimary: dto.primary_organization_id,
      organizationIds
    });

    await this.ensureOrganizationsExist(organizationIds);

    await this.db.client.transaction(async (tx) => {
      await this.syncGroupOrganizationsTx(tx, groupId, organizationIds, primaryOrganizationId);
      await tx.update(group)
        .set({
          organizationId: primaryOrganizationId,
          updatedAt: new Date()
        })
        .where(eq(group.id, groupId));
    });

    return this.get(id);
  }

  async forUser(userId: string, query: { organization_id?: string }) {
    const profileId = parseBigIntId(userId, 'user id');

    const memberships = await this.db.client
      .select()
      .from(groupUser)
      .where(eq(groupUser.userId, profileId))
      .orderBy(desc(groupUser.isPrimary));
    const orgId = query.organization_id ? parseBigIntId(query.organization_id, 'organization id') : null;

    const hydrated = (await Promise.all(memberships.map(async (membership) => {
      const item = await this.findGroupWithDetails(membership.groupId);
      if (!item) return null;
      if (orgId && item.organizationId !== orgId && !item.organizationMappings.some((mapping: any) => mapping.organizationId === orgId)) {
        return null;
      }
      return {
        membership,
        group: item,
      };
    }))).filter((item): item is { membership: typeof groupUser.$inferSelect; group: any } => item !== null);

    return hydrated.map(({ membership, group }) => ({
      ...this.serializeGroup(group),
      role: membership.role,
      is_primary: membership.isPrimary,
      joined_at: membership.joinedAt
    }));
  }

  async setMemberScopes(id: string, userId: string, dto: SetGroupMemberScopesDto) {
    const groupId = parseBigIntId(id, 'group id');
    const memberId = parseBigIntId(userId, 'user id');
    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    await this.ensureOrganizationsBelongToGroup(groupId, organizationIds);

    const [membership] = await this.db.client
      .select()
      .from(groupUser)
      .where(and(eq(groupUser.groupId, groupId), eq(groupUser.userId, memberId)))
      .limit(1);
    if (!membership) throw new NotFoundException('Group member not found');

    await this.db.client.transaction(async (tx) => {
      await this.syncGroupMemberScopesTx(tx, membership.id, organizationIds, dto.scope_role);
    });

    return this.get(id);
  }

  private mapMemberRole(role?: 'member' | 'lead' | 'manager'): GroupUserRole {
    if (role === 'lead') return 'moderator';
    if (role === 'manager') return 'admin';
    return 'member';
  }

  private serializeGroup(group: any) {
    return {
      ...group,
      organization_ids: (group.organizationMappings ?? []).map((mapping: any) => String(mapping.organizationId)),
      organization_mappings: (group.organizationMappings ?? []).map((mapping: any) => ({
        id: String(mapping.id),
        organization_id: String(mapping.organizationId),
        is_primary: Boolean(mapping.isPrimary),
        organization: mapping.organization
      })),
      members: (group.members ?? []).map((member: any) => ({
        ...member,
        scope_organization_ids: (member.organizationScopes ?? []).map((scope: any) => String(scope.organizationId)),
        organization_scopes: (member.organizationScopes ?? []).map((scope: any) => ({
          id: String(scope.id),
          organization_id: String(scope.organizationId),
          scope_role: scope.scopeRole ?? null,
          organization: scope.organization
        }))
      }))
    };
  }

  private parseOrganizationIds(values?: string[], singleValue?: string): bigint[] {
    const raw = values && values.length > 0 ? values : singleValue ? [singleValue] : [];
    const unique = Array.from(new Set(raw.filter(Boolean).map((value) => parseBigIntId(String(value), 'organization id').toString())));
    return unique.map((value) => BigInt(value));
  }

  private resolvePrimaryOrganizationId(params: {
    explicitPrimary?: string;
    fallbackOrganizationId?: string;
    organizationIds?: bigint[];
    existingPrimaryOrganizationId?: bigint;
  }): bigint | null {
    const parsedExplicit = params.explicitPrimary ? parseBigIntId(params.explicitPrimary, 'primary organization id') : null;
    if (parsedExplicit) return parsedExplicit;
    const parsedFallback = params.fallbackOrganizationId ? parseBigIntId(params.fallbackOrganizationId, 'organization id') : null;
    if (parsedFallback) return parsedFallback;
    if (params.organizationIds && params.organizationIds.length > 0) return params.organizationIds[0];
    return params.existingPrimaryOrganizationId ?? null;
  }

  private async ensureGroupExists(groupId: bigint) {
    const existing = await this.findGroup(groupId);
    if (!existing) throw new NotFoundException('Group not found');
  }

  private async ensureOrganizationsExist(organizationIds: bigint[]) {
    if (organizationIds.length === 0) return;
    const found = await this.db.client
      .select({ id: organization.id })
      .from(organization)
      .where(inArray(organization.id, organizationIds));
    if (found.length !== organizationIds.length) {
      throw new NotFoundException('One or more organizations were not found');
    }
  }

  private async ensureOrganizationsBelongToGroup(groupId: bigint, organizationIds: bigint[]) {
    if (organizationIds.length === 0) return;
    const mappings = await this.db.client
      .select({ organizationId: groupOrganization.organizationId })
      .from(groupOrganization)
      .where(and(eq(groupOrganization.groupId, groupId), inArray(groupOrganization.organizationId, organizationIds)));
    if (mappings.length !== organizationIds.length) {
      throw new BadRequestException('All selected organizations must already be linked to the group');
    }
  }

  private async syncGroupOrganizationsTx(
    tx: Parameters<Parameters<AppDb['transaction']>[0]>[0],
    groupId: bigint,
    organizationIds: bigint[],
    primaryOrganizationId: bigint | null
  ) {
    await tx.delete(groupOrganization).where(eq(groupOrganization.groupId, groupId));
    if (organizationIds.length === 0) return;
    await tx.insert(groupOrganization).values(
      organizationIds.map((organizationId) => ({
        groupId,
        organizationId,
        isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false
      })),
    );
  }

  private async syncGroupMemberScopesTx(
    tx: Parameters<Parameters<AppDb['transaction']>[0]>[0],
    groupUserId: bigint,
    organizationIds: bigint[],
    scopeRole?: string
  ) {
    await tx.delete(groupUserOrganizationScope).where(eq(groupUserOrganizationScope.groupUserId, groupUserId));
    if (organizationIds.length === 0) return;
    await tx.insert(groupUserOrganizationScope).values(
      organizationIds.map((organizationId) => ({
        groupUserId,
        organizationId,
        scopeRole: scopeRole ?? null
      })),
    );
  }

  private async findGroup(groupId: bigint) {
    const [existing] = await this.db.client.select().from(group).where(eq(group.id, groupId)).limit(1);
    return existing ?? null;
  }

  private async findGroupWithDetails(groupId: bigint) {
    const [base] = await this.db.client
      .select({ group, organization })
      .from(group)
      .leftJoin(organization, eq(group.organizationId, organization.id))
      .where(eq(group.id, groupId))
      .limit(1);
    if (!base) return null;

    const organizationMappings = await this.db.client
      .select({ mapping: groupOrganization, organization })
      .from(groupOrganization)
      .leftJoin(organization, eq(groupOrganization.organizationId, organization.id))
      .where(eq(groupOrganization.groupId, groupId))
      .orderBy(desc(groupOrganization.isPrimary), asc(organization.name));

    const members = await this.db.client
      .select({
        member: groupUser,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
      })
      .from(groupUser)
      .leftJoin(profile, eq(groupUser.userId, profile.id))
      .where(eq(groupUser.groupId, groupId))
      .orderBy(desc(groupUser.role), asc(profile.firstName));

    const scopedMembers = await Promise.all(members.map(async ({ member, user }) => {
      const organizationScopes = await this.db.client
        .select({ scope: groupUserOrganizationScope, organization })
        .from(groupUserOrganizationScope)
        .leftJoin(organization, eq(groupUserOrganizationScope.organizationId, organization.id))
        .where(eq(groupUserOrganizationScope.groupUserId, member.id))
        .orderBy(asc(organization.name));
      return {
        ...member,
        user,
        organizationScopes: organizationScopes.map(({ scope, organization }) => ({ ...scope, organization })),
      };
    }));

    return {
      ...base.group,
      organization: base.organization,
      organizationMappings: organizationMappings.map(({ mapping, organization }) => ({ ...mapping, organization })),
      members: scopedMembers,
    };
  }
}
