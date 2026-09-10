import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GroupUserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { toBigInt } from '../../common/utils/ids';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { SetGroupMemberScopesDto } from './dto/set-group-member-scopes.dto';
import { SetGroupOrganizationsDto } from './dto/set-group-organizations.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, any>) {
    const groupType = query.group_type ? String(query.group_type) : undefined;
    const where: Prisma.GroupWhereInput = groupType
      ? { type: groupType }
      : { type: { in: ['team', 'department'] } };
    if (query.organization_id) {
      const organizationId = this.parseId(String(query.organization_id), 'organization id');
      where.OR = [{ organizationId }, { organizationMappings: { some: { organizationId } } }];
    }
    if (query.active_only === 'true') where.isActive = true;
    if (query.search) {
      const searchConditions: Prisma.GroupWhereInput[] = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const groups = await this.prisma.group.findMany({
      where,
      include: this.groupInclude(),
      orderBy: { name: 'asc' }
    });

    const items = groups.map((group) => this.serializeGroup(group));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async create(createdBy: string, dto: CreateTeamDto) {
    const createdById = this.parseId(createdBy, 'creator id');
    const organizationIds = this.parseOrganizationIds(dto.organization_ids, dto.organization_id);
    const primaryOrganizationId = this.resolvePrimaryOrganizationId({
      explicitPrimary: dto.primary_organization_id,
      fallbackOrganizationId: dto.organization_id,
      organizationIds
    });

    await this.ensureOrganizationsExist(organizationIds);

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name: dto.name,
          description: dto.description,
          type: dto.group_type ?? 'team',
          organizationId: primaryOrganizationId,
          createdBy: createdById,
          updatedBy: createdById,
          isActive: dto.is_active ?? true
        }
      });

      await tx.groupUser.create({
        data: {
          groupId: created.id,
          userId: createdById,
          role: GroupUserRole.admin,
          addedBy: createdById
        }
      });

      await this.syncGroupOrganizationsTx(tx, created.id, organizationIds, primaryOrganizationId);
      return created;
    });

    return this.get(team.id.toString());
  }

  async get(id: string) {
    const team = await this.prisma.group.findUnique({
      where: { id: this.parseId(id, 'team id') },
      include: this.groupInclude()
    });
    if (!team) throw new NotFoundException('Group not found');
    return this.serializeGroup(team);
  }

  async update(id: string, userId: string, dto: UpdateTeamDto) {
    const teamId = this.parseId(id, 'team id');
    const actor = this.parseId(userId, 'user id');

    const existing = await this.prisma.group.findUnique({ where: { id: teamId } });
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

    await this.prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id: teamId },
        data: {
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          type: dto.group_type ?? existing.type,
          organizationId: primaryOrganizationId,
          isActive: dto.is_active ?? existing.isActive,
          updatedBy: actor
        }
      });

      if (organizationIds) {
        await this.syncGroupOrganizationsTx(tx, teamId, organizationIds, primaryOrganizationId);
      }
    });

    return this.get(id);
  }

  async addMember(id: string, actorId: string, dto: AddGroupMemberDto) {
    const groupId = this.parseId(id, 'group id');
    const actor = this.parseId(actorId, 'user id');
    const userId = this.parseId(dto.user_id, 'user id');

    const role = this.mapMemberRole(dto.role);

    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    await this.ensureOrganizationsBelongToGroup(groupId, organizationIds);

    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.groupUser.upsert({
        where: {
          unique_group_user: {
            groupId,
            userId
          }
        },
        update: { role, addedBy: actor },
        create: {
          groupId,
          userId,
          role,
          addedBy: actor
        }
      });

      if (dto.organization_ids) {
        await this.syncGroupMemberScopesTx(tx, membership.id, organizationIds, undefined);
      }
    });

    return this.get(id);
  }

  async removeMember(id: string, userId: string) {
    const groupId = this.parseId(id, 'group id');
    const memberId = this.parseId(userId, 'user id');

    await this.prisma.groupUser.delete({
      where: {
        unique_group_user: {
          groupId,
          userId: memberId
        }
      }
    });

    return this.get(id);
  }

  async setOrganizations(id: string, dto: SetGroupOrganizationsDto) {
    const groupId = this.parseId(id, 'group id');
    await this.ensureGroupExists(groupId);
    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    const primaryOrganizationId = this.resolvePrimaryOrganizationId({
      explicitPrimary: dto.primary_organization_id,
      organizationIds
    });

    await this.ensureOrganizationsExist(organizationIds);

    await this.prisma.$transaction(async (tx) => {
      await this.syncGroupOrganizationsTx(tx, groupId, organizationIds, primaryOrganizationId);
      await tx.group.update({
        where: { id: groupId },
        data: {
          organizationId: primaryOrganizationId,
          updatedAt: new Date()
        }
      });
    });

    return this.get(id);
  }

  async forUser(userId: string, query: { organization_id?: string }) {
    const profileId = this.parseId(userId, 'user id');

    const groupWhere: Prisma.GroupWhereInput = {};
    if (query.organization_id) {
      const orgId = this.parseId(query.organization_id, 'organization id');
      groupWhere.OR = [
        { organizationId: orgId },
        { organizationMappings: { some: { organizationId: orgId } } }
      ];
    }

    const memberships = await this.prisma.groupUser.findMany({
      where: {
        userId: profileId,
        group: groupWhere
      },
      include: {
        group: {
          include: this.groupInclude()
        }
      },
      orderBy: [{ isPrimary: 'desc' }, { group: { name: 'asc' } }]
    });

    return memberships.map((membership) => ({
      ...this.serializeGroup(membership.group),
      role: membership.role,
      is_primary: membership.isPrimary,
      joined_at: membership.joinedAt
    }));
  }

  async setMemberScopes(id: string, userId: string, dto: SetGroupMemberScopesDto) {
    const groupId = this.parseId(id, 'group id');
    const memberId = this.parseId(userId, 'user id');
    const organizationIds = this.parseOrganizationIds(dto.organization_ids);
    await this.ensureOrganizationsBelongToGroup(groupId, organizationIds);

    const membership = await this.prisma.groupUser.findUnique({
      where: { unique_group_user: { groupId, userId: memberId } }
    });
    if (!membership) throw new NotFoundException('Group member not found');

    await this.prisma.$transaction(async (tx) => {
      await this.syncGroupMemberScopesTx(tx, membership.id, organizationIds, dto.scope_role);
    });

    return this.get(id);
  }

  private mapMemberRole(role?: 'member' | 'lead' | 'manager'): GroupUserRole {
    if (role === 'lead') return GroupUserRole.moderator;
    if (role === 'manager') return GroupUserRole.admin;
    return GroupUserRole.member;
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private groupInclude() {
    return {
      organization: true,
      organizationMappings: {
        include: {
          organization: true
        },
        orderBy: [{ isPrimary: 'desc' as const }, { organization: { name: 'asc' as const } }]
      },
      members: {
        include: {
          user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } },
          organizationScopes: {
            include: {
              organization: true
            },
            orderBy: { organization: { name: 'asc' as const } }
          }
        },
        orderBy: [{ role: 'desc' as const }, { user: { firstName: 'asc' as const } }]
      }
    } satisfies Prisma.GroupInclude;
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
    const unique = Array.from(new Set(raw.filter(Boolean).map((value) => this.parseId(String(value), 'organization id').toString())));
    return unique.map((value) => BigInt(value));
  }

  private resolvePrimaryOrganizationId(params: {
    explicitPrimary?: string;
    fallbackOrganizationId?: string;
    organizationIds?: bigint[];
    existingPrimaryOrganizationId?: bigint;
  }): bigint | null {
    const parsedExplicit = params.explicitPrimary ? this.parseId(params.explicitPrimary, 'primary organization id') : null;
    if (parsedExplicit) return parsedExplicit;
    const parsedFallback = params.fallbackOrganizationId ? this.parseId(params.fallbackOrganizationId, 'organization id') : null;
    if (parsedFallback) return parsedFallback;
    if (params.organizationIds && params.organizationIds.length > 0) return params.organizationIds[0];
    return params.existingPrimaryOrganizationId ?? null;
  }

  private async ensureGroupExists(groupId: bigint) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) throw new NotFoundException('Group not found');
  }

  private async ensureOrganizationsExist(organizationIds: bigint[]) {
    if (organizationIds.length === 0) return;
    const found = await this.prisma.organization.findMany({
      where: { id: { in: organizationIds } },
      select: { id: true }
    });
    if (found.length !== organizationIds.length) {
      throw new NotFoundException('One or more organizations were not found');
    }
  }

  private async ensureOrganizationsBelongToGroup(groupId: bigint, organizationIds: bigint[]) {
    if (organizationIds.length === 0) return;
    const mappings = await this.prisma.groupOrganization.findMany({
      where: { groupId, organizationId: { in: organizationIds } },
      select: { organizationId: true }
    });
    if (mappings.length !== organizationIds.length) {
      throw new BadRequestException('All selected organizations must already be linked to the group');
    }
  }

  private async syncGroupOrganizationsTx(
    tx: Prisma.TransactionClient,
    groupId: bigint,
    organizationIds: bigint[],
    primaryOrganizationId: bigint | null
  ) {
    await tx.groupOrganization.deleteMany({ where: { groupId } });
    if (organizationIds.length === 0) return;
    await tx.groupOrganization.createMany({
      data: organizationIds.map((organizationId) => ({
        groupId,
        organizationId,
        isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false
      }))
    });
  }

  private async syncGroupMemberScopesTx(
    tx: Prisma.TransactionClient,
    groupUserId: bigint,
    organizationIds: bigint[],
    scopeRole?: string
  ) {
    await tx.groupUserOrganizationScope.deleteMany({ where: { groupUserId } });
    if (organizationIds.length === 0) return;
    await tx.groupUserOrganizationScope.createMany({
      data: organizationIds.map((organizationId) => ({
        groupUserId,
        organizationId,
        scopeRole: scopeRole ?? null
      }))
    });
  }
}
