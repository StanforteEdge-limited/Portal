import {
  AddProjectCardAttachment,
  AddProjectMember,
  CreateProjectCardUpdate,
  CreateProject,
  ProjectCardsListQuery,
  UpdateProjectCard,
  UpdateProject,
  UpsertProjectCard,
  type UserRef,
} from '@stanforte/contract';
import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql, SQL } from 'drizzle-orm';
import { DbService } from '$core/db';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { paginatedResponse } from '$core/pagination';
import { parseBigIntId, toBigInt } from '$core/utils';
import type { GroupUserRole } from '$apps/communication/groups/model';
import { organization } from '$apps/hr/organizations/model';
import { profile } from '$apps/identity/users/model';
import { requestInstance } from '$apps/hr/requests/model';
import { fileAsset } from '$apps/storage/model';



import {
  project,
  projectCard,
  projectCardAttachment,
  projectCardUpdate,
  projectCardUpdateMention,
  projectGovernance,
  projectMember,
} from './model';
import { BadRequestException, NotFoundException } from '$core/errors';

type ProfileRefRow = {
  id: bigint | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

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

  async create(createdBy: string, dto: CreateProject) {
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

  async update(id: string, userId: string, dto: UpdateProject) {
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

  async addMember(id: string, actorId: string, dto: AddProjectMember) {
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

  async listCards(id: string, query: ProjectCardsListQuery) {
    const projectId = parseBigIntId(id, 'project id');
    await this.ensureProjectExists(projectId);

    const conditions: SQL[] = [
      eq(projectCard.projectId, projectId),
      this.tenantCond(projectCard.tenantId)!,
    ];
    if (query.status) conditions.push(eq(projectCard.status, String(query.status)));
    if (query.assigned_to_id) {
      conditions.push(eq(projectCard.assignedToId, parseBigIntId(String(query.assigned_to_id), 'assigned user id')));
    }
    if (query.tag) conditions.push(sql`${projectCard.tags} ? ${String(query.tag)}`);
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(projectCard.title, search), ilike(projectCard.description, search))!);
    }

    const rows = await this.db.client
      .select({ card: projectCard, assignee: this.profileColumns() })
      .from(projectCard)
      .leftJoin(profile, eq(projectCard.assignedToId, profile.id))
      .where(and(...conditions))
      .orderBy(asc(projectCard.status), asc(projectCard.position), desc(projectCard.createdAt));

    const cards = await Promise.all(rows.map((row) => this.serializeCard(row.card, row.assignee)));
    return paginatedResponse(cards, { page: 1, per_page: cards.length, total: cards.length });
  }

  async getCard(id: string, cardId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const card = await this.findCard(projectId, cardId);
    if (!card) throw new NotFoundException('Project card not found');
    return this.serializeCard(card.card, card.assignee);
  }

  async createCard(id: string, actorId: string, dto: UpsertProjectCard) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);
    await this.assertProfileExists(dto.assigned_to_id, 'assigned user id');

    const [created] = await this.db.client
      .insert(projectCard)
      .values({
        tenantId: this.requireTenantId(),
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status?.trim() || 'todo',
        position: dto.position === undefined ? '0' : String(dto.position),
        color: dto.color?.trim() || null,
        tags: this.normalizeTags(dto.tags),
        assignedToId: dto.assigned_to_id ? parseBigIntId(dto.assigned_to_id, 'assigned user id') : null,
        dueDate: dto.due_date ? this.toDate(dto.due_date) : null,
        metadata: dto.metadata ?? null,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();

    return this.getCard(id, created.id);
  }

  async updateCard(id: string, cardId: string, actorId: string, dto: UpdateProjectCard) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);
    if (!(await this.findCard(projectId, cardId))) throw new NotFoundException('Project card not found');
    await this.assertProfileExists(dto.assigned_to_id, 'assigned user id');

    const changes: Record<string, unknown> = { updatedBy: actor };
    if (dto.title !== undefined) changes.title = dto.title.trim();
    if (dto.description !== undefined) changes.description = dto.description?.trim() || null;
    if (dto.status !== undefined) changes.status = dto.status.trim();
    if (dto.position !== undefined) changes.position = String(dto.position);
    if (dto.color !== undefined) changes.color = dto.color?.trim() || null;
    if (dto.tags !== undefined) changes.tags = this.normalizeTags(dto.tags);
    if (dto.assigned_to_id !== undefined) {
      changes.assignedToId = dto.assigned_to_id ? parseBigIntId(dto.assigned_to_id, 'assigned user id') : null;
    }
    if (dto.due_date !== undefined) changes.dueDate = dto.due_date ? this.toDate(dto.due_date) : null;
    if (dto.metadata !== undefined) changes.metadata = dto.metadata ?? null;

    await this.db.client
      .update(projectCard)
      .set(changes)
      .where(and(eq(projectCard.id, cardId), eq(projectCard.projectId, projectId), this.tenantCond(projectCard.tenantId)!));

    return this.getCard(id, cardId);
  }

  async deleteCard(id: string, cardId: string, actorId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);

    const [deleted] = await this.db.client
      .delete(projectCard)
      .where(and(eq(projectCard.id, cardId), eq(projectCard.projectId, projectId), this.tenantCond(projectCard.tenantId)!))
      .returning({ id: projectCard.id });

    if (!deleted) throw new NotFoundException('Project card not found');
    return { success: true };
  }

  async addCardAttachment(id: string, cardId: string, actorId: string, dto: AddProjectCardAttachment) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);
    if (!(await this.findCard(projectId, cardId))) throw new NotFoundException('Project card not found');

    const [file] = await this.db.client
      .select({ id: fileAsset.id })
      .from(fileAsset)
      .where(and(eq(fileAsset.id, dto.file_asset_id), this.tenantCond(fileAsset.tenantId)!))
      .limit(1);
    if (!file) throw new NotFoundException('File asset not found');

    await this.db.client
      .insert(projectCardAttachment)
      .values({
        tenantId: this.requireTenantId(),
        cardId,
        fileAssetId: dto.file_asset_id,
        label: dto.label?.trim() || null,
        createdBy: actor,
      })
      .onConflictDoUpdate({
        target: [projectCardAttachment.cardId, projectCardAttachment.fileAssetId],
        set: { label: dto.label?.trim() || null, createdBy: actor },
      });

    return this.getCard(id, cardId);
  }

  async removeCardAttachment(id: string, cardId: string, attachmentId: string, actorId: string) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);
    if (!(await this.findCard(projectId, cardId))) throw new NotFoundException('Project card not found');

    await this.db.client
      .delete(projectCardAttachment)
      .where(and(eq(projectCardAttachment.id, parseBigIntId(attachmentId, 'attachment id')), eq(projectCardAttachment.cardId, cardId)));

    return this.getCard(id, cardId);
  }

  async listCardUpdates(id: string, cardId: string) {
    const projectId = parseBigIntId(id, 'project id');
    if (!(await this.findCard(projectId, cardId))) throw new NotFoundException('Project card not found');
    return { success: true, data: await this.loadCardUpdates(cardId) };
  }

  async addCardUpdate(id: string, cardId: string, actorId: string, dto: CreateProjectCardUpdate) {
    const projectId = parseBigIntId(id, 'project id');
    const actor = parseBigIntId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);
    if (!(await this.findCard(projectId, cardId))) throw new NotFoundException('Project card not found');

    const taggedIds = Array.from(new Set((dto.tagged_user_ids ?? []).filter(Boolean).map((value) => parseBigIntId(value, 'tagged user id'))));
    await this.assertProfilesExist(taggedIds);

    const [created] = await this.db.client
      .insert(projectCardUpdate)
      .values({
        tenantId: this.requireTenantId(),
        cardId,
        body: dto.body.trim(),
        metadata: dto.metadata ?? null,
        createdBy: actor,
      })
      .returning();

    if (taggedIds.length) {
      await this.db.client.insert(projectCardUpdateMention).values(
        taggedIds.map((userId) => ({
          tenantId: this.requireTenantId(),
          updateId: created.id,
          userId,
        })),
      );
    }

    const updates = await this.loadCardUpdates(cardId);
    return updates.find((update) => update.id === created.id.toString());
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

  private async serializeCard(card: typeof projectCard.$inferSelect, assignee: ProfileRefRow | null) {
    const [attachments, updates] = await Promise.all([
      this.loadCardAttachments(card.id),
      this.loadCardUpdates(card.id),
    ]);

    return {
      id: card.id,
      project_id: card.projectId.toString(),
      title: card.title,
      description: card.description,
      status: card.status,
      position: Number(card.position ?? 0),
      color: card.color,
      tags: Array.isArray(card.tags) ? card.tags : [],
      assigned_to_id: card.assignedToId ? card.assignedToId.toString() : null,
      assignee: this.serializeProfile(assignee),
      due_date: card.dueDate ? card.dueDate.toISOString().split('T')[0] : null,
      metadata: card.metadata ?? {},
      attachments,
      updates_count: updates.length,
      latest_update: updates[0] ?? null,
      created_by: card.createdBy ? card.createdBy.toString() : null,
      updated_by: card.updatedBy ? card.updatedBy.toString() : null,
      created_at: card.createdAt,
      updated_at: card.updatedAt,
    };
  }

  private async loadCardAttachments(cardId: string) {
    const rows = await this.db.client
      .select({
        attachment: projectCardAttachment,
        file: {
          id: fileAsset.id,
          fileName: fileAsset.fileName,
          mimeType: fileAsset.mimeType,
          fileSize: fileAsset.fileSize,
          publicUrl: fileAsset.publicUrl,
          storagePath: fileAsset.storagePath,
        },
      })
      .from(projectCardAttachment)
      .leftJoin(fileAsset, eq(projectCardAttachment.fileAssetId, fileAsset.id))
      .where(eq(projectCardAttachment.cardId, cardId))
      .orderBy(desc(projectCardAttachment.createdAt));

    return rows.map(({ attachment, file }) => ({
      id: attachment.id.toString(),
      file_asset_id: attachment.fileAssetId,
      label: attachment.label,
      created_by: attachment.createdBy ? attachment.createdBy.toString() : null,
      created_at: attachment.createdAt,
      file: file?.id
        ? {
            id: file.id,
            file_name: file.fileName,
            mime_type: file.mimeType,
            file_size: file.fileSize ? file.fileSize.toString() : null,
            public_url: file.publicUrl,
            storage_path: file.storagePath,
          }
        : null,
    }));
  }

  private async loadCardUpdates(cardId: string) {
    const rows = await this.db.client
      .select({ update: projectCardUpdate, author: this.profileColumns() })
      .from(projectCardUpdate)
      .leftJoin(profile, eq(projectCardUpdate.createdBy, profile.id))
      .where(eq(projectCardUpdate.cardId, cardId))
      .orderBy(desc(projectCardUpdate.createdAt));

    const updateIds = rows.map((row) => row.update.id);
    const mentions = updateIds.length
      ? await this.db.client
          .select({ mention: projectCardUpdateMention, user: this.profileColumns() })
          .from(projectCardUpdateMention)
          .leftJoin(profile, eq(projectCardUpdateMention.userId, profile.id))
          .where(inArray(projectCardUpdateMention.updateId, updateIds))
      : [];

    const mentionsByUpdate = new Map<string, Array<{ id: string; user_id: string; user: UserRef | null }>>();
    for (const row of mentions) {
      const key = row.mention.updateId.toString();
      const list = mentionsByUpdate.get(key) ?? [];
      list.push({
        id: row.mention.id.toString(),
        user_id: row.mention.userId.toString(),
        user: this.serializeProfile(row.user),
      });
      mentionsByUpdate.set(key, list);
    }

    return rows.map(({ update, author }) => ({
      id: update.id.toString(),
      card_id: update.cardId,
      body: update.body,
      metadata: update.metadata ?? {},
      created_by: update.createdBy ? update.createdBy.toString() : null,
      author: this.serializeProfile(author),
      tagged_users: mentionsByUpdate.get(update.id.toString()) ?? [],
      created_at: update.createdAt,
      updated_at: update.updatedAt,
    }));
  }

  private serializeProfile(user: ProfileRefRow | null): UserRef | null {
    return user?.id
      ? {
          id: user.id.toString(),
          email: user.email ?? '',
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
        }
      : null;
  }

  private profileColumns() {
    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }

  private normalizeTags(tags?: string[] | null) {
    if (!tags) return [];
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  }

  private toDate(value: string) {
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date');
    return parsed;
  }

  private requireTenantId() {
    const tenantId = this.tenantContext.currentTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    return tenantId;
  }

  private async ensureProjectExists(projectId: bigint) {
    const [row] = await this.db.client
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, projectId), this.tenantCond(project.tenantId)!))
      .limit(1);
    if (!row) throw new NotFoundException('Project not found');
  }

  private async findCard(projectId: bigint, cardId: string) {
    const [row] = await this.db.client
      .select({ card: projectCard, assignee: this.profileColumns() })
      .from(projectCard)
      .leftJoin(profile, eq(projectCard.assignedToId, profile.id))
      .where(and(eq(projectCard.id, cardId), eq(projectCard.projectId, projectId), this.tenantCond(projectCard.tenantId)!))
      .limit(1);
    return row ?? null;
  }

  private async assertProfileExists(value?: string, label = 'user id') {
    if (!value) return;
    await this.assertProfilesExist([parseBigIntId(value, label)]);
  }

  private async assertProfilesExist(userIds: bigint[]) {
    if (!userIds.length) return;
    const users = await this.db.client
      .select({ id: profile.id })
      .from(profile)
      .where(inArray(profile.id, userIds));
    if (users.length !== userIds.length) throw new NotFoundException('One or more users not found');
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

