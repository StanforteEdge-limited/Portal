import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNotNull, or, SQL } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import type { GroupUserRole } from '$app/db/enums';
import { organization } from '$modules/hrm/organizations/model';
import { profile } from '$modules/identity/users/model';
import { requestInstance } from '$modules/hrm/requests/model';
import { AddProjectMemberDto } from '$modules/hrm/projects/dto/add-project-member.dto';
import { CreateProjectDto } from '$modules/hrm/projects/dto/create-project.dto';
import { UpdateProjectDto } from '$modules/hrm/projects/dto/update-project.dto';
import { project, projectGovernance, projectMember } from './model';

@Injectable()
export class ProjectsService {
constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tenantCond(column: any): SQL | undefined {
    const tid = this.tenantContext.currentTenantId();
    return tid ? eq(column, tid) : undefined;
  }

  async list(query: Record<string, any>) {
    const conditions: SQL[] = [];
    conditions.push(this.tenantCond(project.tenantId)!);
    if (query.organization_id) conditions.push(eq(project.organizationId, parseBigIntId(String(query.organization_id), 'organization id')));
    if (query.active_only === 'true') conditions.push(eq(project.isActive, true));
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(project.name, search), ilike(project.description, search))!);
    }
    if (query.owner_user_id) {
      const ownerId = parseBigIntId(String(query.owner_user_id), 'owner user id');
      const ownerMemberships = await this.db.client
        .select({ projectId: projectMember.projectId })
        .from(projectMember)
        .where(and(eq(projectMember.userId, ownerId), eq(projectMember.role, 'admin')));
      if (ownerMemberships.length === 0) {
        return paginatedResponse([], { page: 1, per_page: 0, total: 0 });
      }
      conditions.push(inArray(project.id, ownerMemberships.map((membership) => membership.projectId)));
    }

    const baseRows = await this.db.client
      .select({ project })
      .from(project)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(project.createdAt));
    const rows = await Promise.all(baseRows.map((row) => this.findProjectWithDetails(row.project.id)));
    const items = rows.map((row) => this.serializeProject(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async get(id: string) {
    const projectId = parseBigIntId(id, 'project id');
    const project = await this.findProjectWithDetails(projectId);

    if (!project) throw new NotFoundException('Project not found');
    return this.serializeProject(project);
  }

  async create(createdBy: string, dto: CreateProjectDto) {
    const createdById = parseBigIntId(createdBy, 'creator id');
    const organizationId = dto.organization_id
      ? parseBigIntId(dto.organization_id, 'organization id')
      : null;

if (organizationId) {
      const [org] = await this.db.client.select({ id: organization.id }).from(organization)
        .where(and(eq(organization.id, organizationId), this.tenantCond(organization.tenantId)!))
        .limit(1);
      if (!org) throw new NotFoundException('Organization not found');
    }

    const ownerId = dto.owner_user_id ? parseBigIntId(dto.owner_user_id, 'owner user id') : createdById;

    const createdProject = await this.db.client.transaction(async (tx) => {
const [created] = await tx.insert(project)
        .values({
          name: dto.name,
          description: dto.description,
          createdBy: createdById,
          updatedBy: createdById,
          organizationId,
          tenantId: this.tenantContext.currentTenantId() ?? null,
          isActive: true,
        })
        .returning();

      await tx.insert(projectGovernance).values({
        projectId: created.id,
        projectCode: dto.project_code ?? null,
        ownerUserId: ownerId,
        startDate: dto.start_date ? new Date(dto.start_date) : null,
        endDate: dto.end_date ? new Date(dto.end_date) : null,
        governanceStatus: dto.governance_status ?? 'planned'
      });

      await tx.insert(projectMember).values({
        projectId: created.id,
        userId: ownerId,
        role: 'admin',
        addedBy: createdById
      });

      if (ownerId !== createdById) {
        await tx.insert(projectMember)
          .values({
            projectId: created.id,
            userId: createdById,
            role: 'admin',
            addedBy: createdById
          })
          .onConflictDoUpdate({
            target: [projectMember.projectId, projectMember.userId],
            set: { role: 'admin', addedBy: createdById },
          });
      }

      return created;
    });

    return this.serializeProject(await this.findProjectWithDetails(createdProject.id));
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const projectId = parseBigIntId(id, 'project id');
    const actorId = parseBigIntId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const existing = await this.findProjectWithDetails(projectId);
    if (!existing) throw new NotFoundException('Project not found');

    const projectData: Partial<typeof project.$inferInsert> = {
      updatedBy: actorId
    };
    if (dto.name !== undefined) projectData.name = dto.name;
    if (dto.description !== undefined) projectData.description = dto.description;
    if (dto.is_active !== undefined) projectData.isActive = dto.is_active;

    const governanceData: Record<string, any> = {};
    if (dto.project_code !== undefined) governanceData.projectCode = dto.project_code;
    if (dto.start_date !== undefined) governanceData.startDate = dto.start_date ? new Date(dto.start_date) : null;
    if (dto.end_date !== undefined) governanceData.endDate = dto.end_date ? new Date(dto.end_date) : null;
    if (dto.governance_status !== undefined) governanceData.governanceStatus = dto.governance_status;
    if (dto.owner_user_id !== undefined) governanceData.ownerUserId = parseBigIntId(dto.owner_user_id, 'owner user id');

    await this.db.client.transaction(async (tx) => {
      await tx.update(project).set(projectData).where(eq(project.id, projectId));

      if (Object.keys(governanceData).length > 0) {
        await tx.insert(projectGovernance)
          .values({ projectId, ...governanceData })
          .onConflictDoUpdate({ target: projectGovernance.projectId, set: governanceData });
      }
    });

    return this.get(id);
  }

  async archive(id: string, userId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const actorId = parseBigIntId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const existing = await this.findProjectWithDetails(projectId);
    if (!existing) throw new NotFoundException('Project not found');

    const usage = await this.getProjectUsage(id);
    if (usage.open_requests > 0) {
      throw new BadRequestException('Cannot archive project with open requests');
    }

    await this.db.client.transaction(async (tx) => {
      await tx.update(project)
        .set({
          isActive: false,
          updatedBy: actorId
        })
        .where(eq(project.id, projectId));

      await tx.insert(projectGovernance)
        .values({
          projectId,
          governanceStatus: 'archived'
        })
        .onConflictDoUpdate({ target: projectGovernance.projectId, set: { governanceStatus: 'archived' } });
    });

    return this.get(id);
  }

  async unarchive(id: string, userId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const actorId = parseBigIntId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const existing = await this.findProjectWithDetails(projectId);
    if (!existing) throw new NotFoundException('Project not found');

    await this.db.client.transaction(async (tx) => {
      await tx.update(project)
        .set({
          isActive: true,
          updatedBy: actorId
        })
        .where(eq(project.id, projectId));

      const gov = existing.governance;
      if (gov && gov.governanceStatus === 'archived') {
        await tx.update(projectGovernance)
          .set({ governanceStatus: 'active' })
          .where(eq(projectGovernance.projectId, projectId));
      }
    });

    return this.get(id);
  }

  async governance(id: string) {
    const project = await this.get(id);
    const usage = await this.getProjectUsage(id);
    return {
      project,
      usage
    };
  }

  async addMember(id: string, actorId: string, dto: AddProjectMemberDto) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);

    const userId = parseBigIntId(dto.user_id, 'user id');
    const [user] = await this.db.client.select({ id: profile.id }).from(profile).where(eq(profile.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');

    const role = (dto.role ?? 'member') as GroupUserRole;

    await this.db.client.insert(projectMember)
      .values({
        projectId,
        userId,
        role,
        addedBy: actor
      })
      .onConflictDoUpdate({
        target: [projectMember.projectId, projectMember.userId],
        set: { role, addedBy: actor },
      });

    return this.get(id);
  }

  async removeMember(id: string, actorId: string, userId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);

    await this.db.client.delete(projectMember)
      .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, parseBigIntId(userId, 'user id'))));

    return this.get(id);
  }

  private async ensureProjectAccess(projectId: bigint, actorId: bigint) {
    const [membership] = await this.db.client
      .select({ id: projectMember.id })
      .from(projectMember)
      .where(and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, actorId),
        inArray(projectMember.role, ['admin', 'moderator']),
      ))
      .limit(1);

    if (!membership) {
      throw new BadRequestException('Only project admins/moderators can perform this action');
    }
  }

  private serializeProject(project: any) {
    const gov = project.governance;
    return {
      ...project,
      governance: {
        project_code: gov?.projectCode ?? null,
        owner_user_id: gov?.ownerUserId ? String(gov.ownerUserId) : null,
        start_date: gov?.startDate ? gov.startDate.toISOString().split('T')[0] : null,
        end_date: gov?.endDate ? gov.endDate.toISOString().split('T')[0] : null,
        governance_status: gov?.governanceStatus ?? (project.isActive ? 'active' : 'archived')
      }
    };
  }

  private async getProjectUsage(id: string) {
    const projectId = parseBigIntId(id, 'project id');
const [projectRecord] = await this.db.client
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(and(eq(project.id, projectId), this.tenantCond(project.tenantId)!))
      .limit(1);
    if (!projectRecord) throw new NotFoundException('Project not found');

    const requests = await this.db.client
      .select({ id: requestInstance.id, status: requestInstance.status, data: requestInstance.data })
      .from(requestInstance)
      .where(and(isNotNull(requestInstance.data), this.tenantCond(requestInstance.tenantId)!));

    let total = 0;
    let open = 0;
    for (const row of requests) {
      if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) continue;
      const data = row.data as Record<string, unknown>;
      const projectIdInData = String(data.project_id ?? '');
      const projectNameInData = String(data.project ?? '');
      const matched = projectIdInData === id || projectNameInData.toLowerCase() === String(projectRecord.name).toLowerCase();
      if (!matched) continue;
      total += 1;
      if (!['completed', 'rejected', 'cancelled'].includes(String(row.status))) open += 1;
    }

    return {
      request_references: total,
      open_requests: open
    };
  }

  private async findProjectWithDetails(projectId: bigint) {
const [row] = await this.db.client
      .select({ project, organization, governance: projectGovernance })
      .from(project)
      .leftJoin(organization, eq(project.organizationId, organization.id))
      .leftJoin(projectGovernance, eq(projectGovernance.projectId, project.id))
      .where(and(eq(project.id, projectId), this.tenantCond(project.tenantId)!))
      .limit(1);
    if (!row) return null;

    const members = await this.db.client
      .select({
        member: projectMember,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
      })
      .from(projectMember)
      .leftJoin(profile, eq(projectMember.userId, profile.id))
      .where(eq(projectMember.projectId, projectId));

    return {
      ...row.project,
      organization: row.organization,
      governance: row.governance,
      members: members.map(({ member, user }) => ({ ...member, user })),
    };
  }
}

