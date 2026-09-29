import {
  AddWorkItemAttachment,
  CreateWorkItemComment,
  UpsertTeamGoal,
  UpsertTeamKpi,
  UpsertTeamObjective,
  UpsertSprint,
  UpsertWorkItem,
  UpsertWorkLog,
  type UserRef,
} from '@stanforte/contract';
import { SQL, and, asc, desc, eq, gte, ilike, inArray, lte, notInArray, or, sql } from 'drizzle-orm';
import { DbService } from '$core/db';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { paginatedResponse } from '$core/pagination';

import { NewPayrollRunTimesheetAllocation, payrollRun, payrollRunTimesheetAllocation, payrollWorker } from '$apps/hr/payroll/model';
import {
  NewWorkItem,
  NewWorkLog,
  projectTimesheetEntry,
  sprint,
  teamGoal,
  teamKpi,
  teamObjective,
  workItem,
  workItemAttachment,
  workItemComment,
  workItemCommentMention,
  workLog,
} from './model';
import { profile } from '$apps/identity/users/model';
import { organization } from '$apps/hr/organizations/model';
import { group, groupUser } from '$apps/communication/groups/model';
import { project } from '$apps/hr/projects/model';
import { employeeProfile } from '$apps/hr/employees/model';
import { financeFund, financeGrant } from '$apps/finance/accounting/model';
import { fileAsset } from '$apps/storage/model';
import { BadRequestException, NotFoundException } from '$core/errors';
import {
  normalizeTags,
  optionalBigInt,
  optionalString,
  parseWorkBigInt,
  profileRefColumns,
  serializeFileAsset,
  serializeProfile,
  serializeProfileRef,
} from './utils';


/**
 * Owns everything work-item related: the task board, sprints, team OKRs, task
 * comments and mentions, attachments, and the daily work logs that feed
 * payroll. Project metadata and membership live in `$apps/hr/projects`.
 */
export class TasksService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}


  private tenantOrgTeamScope(orgCol: any, teamCol: any, tid: bigint): SQL {
    return or(
      inArray(orgCol, this.db.client.select({ id: organization.id }).from(organization).where(eq(organization.tenantId, tid)) as any),
      inArray(teamCol, this.db.client.select({ id: group.id }).from(group).where(eq(group.tenantId, tid)) as any),
    ) as SQL;
  }

  private itemTenantScope(tid: bigint, actorId?: bigint): SQL {
    return or(
      inArray(workItem.projectId, this.db.client.select({ id: project.id }).from(project).where(eq(project.tenantId, tid)) as any),
      inArray(workItem.organizationId, this.db.client.select({ id: organization.id }).from(organization).where(eq(organization.tenantId, tid)) as any),
      inArray(workItem.ownerTeamId, this.db.client.select({ id: group.id }).from(group).where(eq(group.tenantId, tid)) as any),
      inArray(workItem.sprintId, this.db.client.select({ id: sprint.id }).from(sprint).where(eq(sprint.tenantId, tid)) as any),
      ...(actorId !== undefined
        ? [eq(workItem.assignedToId, actorId), eq(workItem.assignedById, actorId), eq(workItem.createdById, actorId)]
        : []),
    ) as SQL;
  }

async listGoals(query: Record<string, any>) {
    const tid = this.tenantContext.requireTenantId();
    const conditions: SQL[] = [this.tenantOrgTeamScope(teamGoal.organizationId, teamGoal.teamId, tid)];
    if (query.team_id) conditions.push(eq(teamGoal.teamId, parseWorkBigInt(String(query.team_id), 'team id')));
    if (query.organization_id) conditions.push(eq(teamGoal.organizationId, parseWorkBigInt(String(query.organization_id), 'organization id')));
    if (query.period_year) conditions.push(eq(teamGoal.periodYear, Number(query.period_year)));
    const rows = await this.db.client
      .select()
      .from(teamGoal)
      .where(and(...conditions))
      .orderBy(desc(teamGoal.periodYear), desc(teamGoal.createdAt));
    const enriched = await this.enrichGoals(rows);
    const items = enriched.map((row) => this.serializeGoal(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertGoal(actorId: string, dto: UpsertTeamGoal, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const payload = {
      title: dto.title,
      description: dto.description ?? null,
      organizationId: optionalBigInt(dto.organization_id, 'organization id'),
      teamId: optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      periodYear: dto.period_year,
      periodType: dto.period_type ?? 'annual',
      periodLabel: dto.period_label ?? null,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? String(dto.weight) : null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
    };
if (id) {
      await this.db.client.update(teamGoal).set(payload).where(eq(teamGoal.id, id));
      return this.getGoal(actorId, id);
    }
    const [row] = await this.db.client.insert(teamGoal).values(payload).returning();
    return this.getGoal(actorId, row.id);
  }

  async getGoal(actorId: string, id: string) {
    const tid = this.tenantContext.requireTenantId();
    const allowActorId = parseWorkBigInt(actorId, 'user id');
    const [row] = await this.db.client.select().from(teamGoal)
      .where(and(
        eq(teamGoal.id, id),
        or(this.tenantOrgTeamScope(teamGoal.organizationId, teamGoal.teamId, tid), allowActorId ? eq(teamGoal.createdById, allowActorId) : undefined) as SQL,
      ))
      .limit(1);
    if (!row) throw new NotFoundException('Goal not found');
    const [objectives, kpis] = await Promise.all([
      this.db.client.select().from(teamObjective).where(eq(teamObjective.goalId, id)),
      this.db.client.select().from(teamKpi).where(eq(teamKpi.goalId, id)),
    ]);
    const enriched = await this.enrichGoals([row]);
    enriched[0].objectives = objectives;
    enriched[0].kpis = kpis;
    return this.serializeGoal(enriched[0]);
  }

async listObjectives(query: Record<string, any>) {
    const tid = this.tenantContext.requireTenantId();
    const conditions: SQL[] = [this.tenantOrgTeamScope(teamObjective.organizationId, teamObjective.teamId, tid)];
    if (query.goal_id) conditions.push(eq(teamObjective.goalId, String(query.goal_id)));
    if (query.team_id) conditions.push(eq(teamObjective.teamId, parseWorkBigInt(String(query.team_id), 'team id')));
    const rows = await this.db.client
      .select()
      .from(teamObjective)
      .where(and(...conditions))
      .orderBy(desc(teamObjective.createdAt));
    const enriched = await this.enrichObjectives(rows);
    const items = enriched.map((row) => this.serializeObjective(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertObjective(actorId: string, dto: UpsertTeamObjective, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const payload = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: optionalString(dto.goal_id),
      organizationId: optionalBigInt(dto.organization_id, 'organization id'),
      teamId: optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? String(dto.weight) : null,
      dueDate: dto.due_date ? new Date(dto.due_date) : null,
    };
if (id) {
      await this.db.client.update(teamObjective).set(payload).where(eq(teamObjective.id, id));
      return this.getObjective(actorId, id);
    }
    const [row] = await this.db.client.insert(teamObjective).values(payload).returning();
    return this.getObjective(actorId, row.id);
  }

  async getObjective(actorId: string, id: string) {
    const tid = this.tenantContext.requireTenantId();
    const allowActorId = parseWorkBigInt(actorId, 'user id');
    const [row] = await this.db.client.select().from(teamObjective)
      .where(and(
        eq(teamObjective.id, id),
        or(this.tenantOrgTeamScope(teamObjective.organizationId, teamObjective.teamId, tid), allowActorId ? eq(teamObjective.createdById, allowActorId) : undefined) as SQL,
      ))
      .limit(1);
    if (!row) throw new NotFoundException('Objective not found');
    const kpis = await this.db.client.select().from(teamKpi).where(eq(teamKpi.objectiveId, id));
    const enriched = await this.enrichObjectives([row]);
    enriched[0].kpis = kpis;
    return this.serializeObjective(enriched[0]);
  }

async listKpis(query: Record<string, any>) {
    const tid = this.tenantContext.requireTenantId();
    const conditions: SQL[] = [this.tenantOrgTeamScope(teamKpi.organizationId, teamKpi.teamId, tid)];
    if (query.goal_id) conditions.push(eq(teamKpi.goalId, String(query.goal_id)));
    if (query.objective_id) conditions.push(eq(teamKpi.objectiveId, String(query.objective_id)));
    if (query.team_id) conditions.push(eq(teamKpi.teamId, parseWorkBigInt(String(query.team_id), 'team id')));
    if (query.period_year) conditions.push(eq(teamKpi.periodYear, Number(query.period_year)));
    const rows = await this.db.client
      .select()
      .from(teamKpi)
      .where(and(...conditions))
      .orderBy(desc(teamKpi.periodYear), desc(teamKpi.createdAt));
    const enriched = await this.enrichKpis(rows);
    const items = enriched.map((row) => this.serializeKpi(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertKpi(actorId: string, dto: UpsertTeamKpi, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const payload = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: optionalString(dto.goal_id),
      objectiveId: optionalString(dto.objective_id),
      organizationId: optionalBigInt(dto.organization_id, 'organization id'),
      teamId: optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      targetType: dto.target_type ?? null,
      targetValue: dto.target_value != null ? String(dto.target_value) : null,
      unitLabel: dto.unit_label ?? null,
      periodYear: dto.period_year ?? null,
      quarter: dto.quarter ?? null,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? String(dto.weight) : null,
    };
if (id) {
      await this.db.client.update(teamKpi).set(payload).where(eq(teamKpi.id, id));
      return this.getKpi(actorId, id);
    }
    const [row] = await this.db.client.insert(teamKpi).values(payload).returning();
    return this.getKpi(actorId, row.id);
  }

  async getKpi(actorId: string, id: string) {
    const tid = this.tenantContext.requireTenantId();
    const allowActorId = parseWorkBigInt(actorId, 'user id');
    const [row] = await this.db.client.select().from(teamKpi)
      .where(and(
        eq(teamKpi.id, id),
        or(this.tenantOrgTeamScope(teamKpi.organizationId, teamKpi.teamId, tid), allowActorId ? eq(teamKpi.createdById, allowActorId) : undefined) as SQL,
      ))
      .limit(1);
    if (!row) throw new NotFoundException('KPI not found');
    const enriched = await this.enrichKpis([row]);
    return this.serializeKpi(enriched[0]);
  }

  async listMyItems(actorId: string, query: Record<string, any>) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const conditions: SQL[] = [
      or(eq(workItem.assignedToId, userId), eq(workItem.createdById, userId), eq(workItem.assignedById, userId)) as SQL,
    ];
    if (query.status) conditions.push(eq(workItem.status, query.status));
    if (query.project_id) conditions.push(eq(workItem.projectId, parseWorkBigInt(String(query.project_id), 'project id')));
    if (query.sprint_id) conditions.push(eq(workItem.sprintId, parseWorkBigInt(String(query.sprint_id), 'sprint id')));
    if (query.parent_id) conditions.push(eq(workItem.parentId, String(query.parent_id)));
    if (query.tag) conditions.push(sql`${workItem.tags} ? ${String(query.tag)}` as SQL);
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(workItem.title, search), ilike(workItem.description, search)) as SQL);
    }

    const rows = await this.db.client
      .select()
      .from(workItem)
      .where(and(...conditions))
      .orderBy(asc(workItem.dueDate), desc(workItem.createdAt));
    const enriched = await this.enrichItems(rows);
    const items = enriched.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamItems(actorId: string, query: Record<string, any>) {
    const managerId = parseWorkBigInt(actorId, 'user id');
    const tid = this.tenantContext.requireTenantId();
    const directReports = await this.db.client
      .select({ userId: employeeProfile.userId })
      .from(employeeProfile)
      .where(and(eq(employeeProfile.managerUserId, managerId), eq(employeeProfile.tenantId, tid)));
    const reportIds = directReports.map((row) => row.userId);
    const primaryTeams = reportIds.length > 0
      ? await this.db.client
          .select({ groupId: groupUser.groupId })
          .from(groupUser)
          .where(and(inArray(groupUser.userId, reportIds), eq(groupUser.isPrimary, true)))
      : [];
const teamIds = [...new Set(primaryTeams.map((row) => row.groupId))] as bigint[];
    const conditions: SQL[] = [
      this.itemTenantScope(tid, managerId),
      or(
        eq(workItem.assignedById, managerId),
        reportIds.length ? inArray(workItem.assignedToId, reportIds) : undefined,
        teamIds.length ? inArray(workItem.ownerTeamId, teamIds) : undefined,
      ) as SQL,
    ];
    if (query.week_start_date) conditions.push(eq(workItem.weekStartDate, new Date(String(query.week_start_date))));
    if (query.team_id) conditions.push(eq(workItem.ownerTeamId, parseWorkBigInt(String(query.team_id), 'team id')));
    if (query.assigned_to_id) conditions.push(eq(workItem.assignedToId, parseWorkBigInt(String(query.assigned_to_id), 'assigned to id')));
    if (query.status) conditions.push(eq(workItem.status, query.status));
    if (query.project_id) conditions.push(eq(workItem.projectId, parseWorkBigInt(String(query.project_id), 'project id')));
    if (query.sprint_id) conditions.push(eq(workItem.sprintId, parseWorkBigInt(String(query.sprint_id), 'sprint id')));
    if (query.parent_id) conditions.push(eq(workItem.parentId, String(query.parent_id)));
    if (query.tag) conditions.push(sql`${workItem.tags} ? ${String(query.tag)}` as SQL);
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(workItem.title, search), ilike(workItem.description, search)) as SQL);
    }
    const rows = await this.db.client
      .select()
      .from(workItem)
      .where(and(...conditions))
      .orderBy(desc(workItem.weekStartDate), asc(workItem.dueDate), desc(workItem.createdAt));

    const enriched = await this.enrichItems(rows);
    const items = enriched.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertItem(actorId: string, dto: UpsertWorkItem, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const targetProjectId = dto.project_id ? parseWorkBigInt(dto.project_id, 'project id') : null;
    const parentId: string | null = optionalString(dto.parent_id);
    const sprintId: bigint | null = dto.sprint_id ? parseWorkBigInt(dto.sprint_id, 'sprint id') : null;
    if (id) {
      const existing = await this.requireItem(id, userId);
      if (![existing.createdById?.toString(), existing.assignedById?.toString(), existing.assignedToId?.toString()].includes(userId.toString())) {
        throw new BadRequestException('You cannot update this work item');
      }
      if (parentId === id) throw new BadRequestException('A work item cannot be its own parent');
      const projectId = targetProjectId ?? existing.projectId ?? null;
      await this.validateItemLinks(parentId, sprintId, projectId);
      await this.db.client.update(workItem).set(this.mapItemDto(dto, userId, existing)).where(eq(workItem.id, id));
      return this.getItem(actorId, id);
    }

    const projectId = targetProjectId ?? null;
    await this.validateItemLinks(parentId, sprintId, projectId);
    const [created] = await this.db.client.insert(workItem).values(this.mapItemDto(dto, userId)).returning({ id: workItem.id });
    return this.getItem(actorId, created.id);
  }

  /**
   * Work items carry no `tenant_id` column, so access is proven through the
   * project, sprint, organization or team that owns them — or through the actor
   * being the assignee, assigner or creator.
   */
  private async findAccessibleItem(id: string, actorId: bigint) {
    const tid = this.tenantContext.requireTenantId();
    const [row] = await this.db.client
      .select()
      .from(workItem)
      .where(and(eq(workItem.id, id), this.itemTenantScope(tid, actorId)))
      .limit(1);
    return row ?? null;
  }

  private async requireItem(id: string, actorId: bigint) {
    const row = await this.findAccessibleItem(id, actorId);
    if (!row) throw new NotFoundException('Work item not found');
    return row;
  }


  private async validateItemLinks(parentId: string | null, sprintId: bigint | null, projectId: bigint | null) {
    if (parentId) {
      const [parent] = await this.db.client
        .select({ id: workItem.id, projectId: workItem.projectId })
        .from(workItem)
        .where(eq(workItem.id, parentId))
        .limit(1);
      if (!parent) throw new BadRequestException('Parent work item not found');
      if (projectId != null && parent.projectId != null && projectId !== parent.projectId) {
        throw new BadRequestException('Parent work item belongs to a different project');
      }
    }
    if (projectId != null) {
      const tid = this.tenantContext.requireTenantId();
      const [projectRow] = await this.db.client
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.id, projectId), eq(project.tenantId, tid)))
        .limit(1);
      if (!projectRow) throw new BadRequestException('Project not found');
    }
    if (sprintId != null) {
      const tid = this.tenantContext.requireTenantId();
      const [sprintRow] = await this.db.client
        .select()
        .from(sprint)
        .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)))
        .limit(1);
      if (!sprintRow) throw new BadRequestException('Sprint not found');
      if (projectId != null && sprintRow.projectId !== projectId) {
        throw new BadRequestException('Sprint belongs to a different project');
      }
    }
  }


  async getItem(actorId: string, id: string) {
    const row = await this.requireItem(id, parseWorkBigInt(actorId, 'user id'));
    const enriched = await this.enrichItems([row]);
    return this.serializeWorkItem(enriched[0]);
  }

  /** Deletes a work item, cascading its comments, mentions, attachments and logs. */
  async deleteItem(actorId: string, id: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const existing = await this.requireItem(id, userId);
    if (![existing.createdById?.toString(), existing.assignedById?.toString()].includes(userId.toString())) {
      throw new BadRequestException('You cannot delete this work item');
    }
    await this.db.client.delete(workItem).where(eq(workItem.id, id));
    return { success: true };
  }

  /* ---------------------------------------------------------------------- */
  /* Comments, mentions and attachments                                     */
  /* ---------------------------------------------------------------------- */

  async listComments(actorId: string, itemId: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    await this.requireItem(itemId, userId);
    return { success: true, data: await this.loadComments(itemId) };
  }

  async addComment(actorId: string, itemId: string, dto: CreateWorkItemComment) {
    const userId = parseWorkBigInt(actorId, 'user id');
    await this.requireItem(itemId, userId);
    const tenantId = this.tenantContext.requireTenantId();

    const taggedIds = Array.from(new Set(
      (dto.tagged_user_ids ?? []).filter(Boolean).map((value) => parseWorkBigInt(value, 'tagged user id')),
    ));
    await this.assertProfilesExist(taggedIds);

    const [created] = await this.db.client.transaction(async (tx) => {
      const [comment] = await tx
        .insert(workItemComment)
        .values({
          tenantId,
          workItemId: itemId,
          body: dto.body.trim(),
          metadata: dto.metadata ?? null,
          createdBy: userId,
        })
        .returning();

      if (taggedIds.length) {
        await tx.insert(workItemCommentMention).values(
          taggedIds.map((userId) => ({ tenantId, commentId: comment.id, userId })),
        );
      }

      return [comment];
    });

    const comments = await this.loadComments(itemId);
    return comments.find((comment) => comment.id === created.id.toString());
  }

  async listAttachments(actorId: string, itemId: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    await this.requireItem(itemId, userId);
    return { success: true, data: await this.loadAttachments(itemId) };
  }

  async addAttachment(actorId: string, itemId: string, dto: AddWorkItemAttachment) {
    const userId = parseWorkBigInt(actorId, 'user id');
    await this.requireItem(itemId, userId);
    const tenantId = this.tenantContext.requireTenantId();

    const [file] = await this.db.client
      .select({ id: fileAsset.id })
      .from(fileAsset)
      .where(and(eq(fileAsset.id, dto.file_asset_id), eq(fileAsset.tenantId, tenantId)))
      .limit(1);
    if (!file) throw new NotFoundException('File asset not found');

    await this.db.client
      .insert(workItemAttachment)
      .values({
        tenantId,
        workItemId: itemId,
        fileAssetId: dto.file_asset_id,
        label: dto.label?.trim() || null,
        createdBy: userId,
      })
      .onConflictDoUpdate({
        target: [workItemAttachment.workItemId, workItemAttachment.fileAssetId],
        set: { label: dto.label?.trim() || null, createdBy: userId },
      });

    return { success: true, data: await this.loadAttachments(itemId) };
  }

  async removeAttachment(actorId: string, itemId: string, attachmentId: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    await this.requireItem(itemId, userId);

    await this.db.client
      .delete(workItemAttachment)
      .where(and(
        eq(workItemAttachment.id, parseWorkBigInt(attachmentId, 'attachment id')),
        eq(workItemAttachment.workItemId, itemId),
      ));

    return { success: true, data: await this.loadAttachments(itemId) };
  }

  private async assertProfilesExist(userIds: bigint[]) {
    if (!userIds.length) return;
    const users = await this.db.client
      .select({ id: profile.id })
      .from(profile)
      .where(inArray(profile.id, userIds));
    if (users.length !== userIds.length) throw new NotFoundException('One or more users not found');
  }

  private async loadComments(itemId: string) {
    const rows = await this.db.client
      .select({ comment: workItemComment, author: profileRefColumns() })
      .from(workItemComment)
      .leftJoin(profile, eq(workItemComment.createdBy, profile.id))
      .where(eq(workItemComment.workItemId, itemId))
      .orderBy(desc(workItemComment.createdAt));

    const commentIds = rows.map((row) => row.comment.id);
    const mentions = commentIds.length
      ? await this.db.client
          .select({ mention: workItemCommentMention, user: profileRefColumns() })
          .from(workItemCommentMention)
          .leftJoin(profile, eq(workItemCommentMention.userId, profile.id))
          .where(inArray(workItemCommentMention.commentId, commentIds))
      : [];

    const mentionsByComment = new Map<string, Array<{ id: string; user_id: string; user: UserRef | null }>>();
    for (const row of mentions) {
      const key = row.mention.commentId.toString();
      const list = mentionsByComment.get(key) ?? [];
      list.push({
        id: row.mention.id.toString(),
        user_id: row.mention.userId.toString(),
        user: serializeProfileRef(row.user),
      });
      mentionsByComment.set(key, list);
    }

    return rows.map(({ comment, author }) => ({
      id: comment.id.toString(),
      work_item_id: comment.workItemId,
      body: comment.body,
      metadata: comment.metadata ?? {},
      created_by: comment.createdBy ? comment.createdBy.toString() : null,
      author: serializeProfileRef(author),
      tagged_users: mentionsByComment.get(comment.id.toString()) ?? [],
      created_at: comment.createdAt,
      updated_at: comment.updatedAt,
    }));
  }

  private async loadAttachments(itemId: string) {
    const rows = await this.db.client
      .select({
        attachment: workItemAttachment,
        file: {
          id: fileAsset.id,
          fileName: fileAsset.fileName,
          mimeType: fileAsset.mimeType,
          fileSize: fileAsset.fileSize,
          publicUrl: fileAsset.publicUrl,
          storagePath: fileAsset.storagePath,
        },
      })
      .from(workItemAttachment)
      .leftJoin(fileAsset, eq(workItemAttachment.fileAssetId, fileAsset.id))
      .where(eq(workItemAttachment.workItemId, itemId))
      .orderBy(desc(workItemAttachment.createdAt));

    return rows.map(({ attachment, file }) => ({
      id: attachment.id.toString(),
      work_item_id: attachment.workItemId,
      file_asset_id: attachment.fileAssetId,
      label: attachment.label,
      created_by: attachment.createdBy ? attachment.createdBy.toString() : null,
      created_at: attachment.createdAt,
      file: serializeFileAsset(file),
    }));
  }


async board(actorId: string, query: Record<string, any>) {
    const tid = this.tenantContext.requireTenantId();
    const conditions: SQL[] = [this.itemTenantScope(tid, parseWorkBigInt(actorId, 'user id'))];
    if (query.project_id) conditions.push(eq(workItem.projectId, parseWorkBigInt(String(query.project_id), 'project id')));
    if (query.sprint_id) conditions.push(eq(workItem.sprintId, parseWorkBigInt(String(query.sprint_id), 'sprint id')));
    if (query.assigned_to_id) conditions.push(eq(workItem.assignedToId, parseWorkBigInt(String(query.assigned_to_id), 'assigned to id')));
    if (query.status) conditions.push(eq(workItem.status, query.status));
    if (query.tag) conditions.push(sql`${workItem.tags} ? ${String(query.tag)}` as SQL);
    const rows = await this.db.client
      .select()
      .from(workItem)
      .where(and(...conditions))
      .orderBy(asc(workItem.sortOrder), asc(workItem.dueDate), asc(workItem.createdAt));

    const enriched = await this.enrichItems(rows);
    const items = enriched.map((row) => this.serializeWorkItem(row));
    const order = ['planned', 'in_progress', 'blocked', 'completed', 'carried_over', 'cancelled'];
    const columns = new Map<string, any[]>();
    for (const status of order) columns.set(status, []);
    for (const item of items) {
      const list = columns.get(item.status) ?? [];
      list.push(item);
      columns.set(item.status, list);
    }
    return order.map((status) => ({
      status,
      total: columns.get(status)?.length ?? 0,
      items: columns.get(status) ?? []
    }));
  }

  async listSprints(query: Record<string, any>) {
    const tid = this.tenantContext.requireTenantId();
    const conditions: SQL[] = [eq(sprint.tenantId, tid)];
    if (query.project_id) conditions.push(eq(sprint.projectId, parseWorkBigInt(String(query.project_id), 'project id')));
    if (query.status) conditions.push(eq(sprint.status, String(query.status)));
    if (query.is_active != null) conditions.push(eq(sprint.isActive, query.is_active === 'true' || query.is_active === true));
    const rows = await this.db.client
      .select()
      .from(sprint)
      .where(and(...conditions))
      .orderBy(desc(sprint.createdAt));
    const enriched = await this.enrichSprints(rows);
    const items = enriched.map((row) => this.serializeSprint(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getSprint(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const sprintId = parseWorkBigInt(id, 'sprint id');
    const [row] = await this.db.client
      .select()
      .from(sprint)
      .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)))
      .limit(1);
    if (!row) throw new NotFoundException('Sprint not found');
    const enriched = await this.enrichSprints([row]);
    const items = await this.db.client
      .select()
      .from(workItem)
      .where(eq(workItem.sprintId, row.id))
      .orderBy(asc(workItem.sortOrder), asc(workItem.dueDate), asc(workItem.createdAt));
    const enrichedItems = await this.enrichItems(items);
    enriched[0].items = enrichedItems.map((item) => this.serializeWorkItem(item));
    return this.serializeSprint(enriched[0]);
  }

  async upsertSprint(actorId: string, dto: UpsertSprint, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const tid = this.tenantContext.requireTenantId();
    let projectId: bigint | null = null;
    if (dto.project_id) {
      projectId = parseWorkBigInt(dto.project_id, 'project id');
      const [projectRow] = await this.db.client
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.id, projectId), eq(project.tenantId, tid)))
        .limit(1);
      if (!projectRow) throw new BadRequestException('Project not found');
    }
    if (id) {
      const sprintId = parseWorkBigInt(id, 'sprint id');
      const [existing] = await this.db.client
        .select()
        .from(sprint)
        .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)))
        .limit(1);
      if (!existing) throw new NotFoundException('Sprint not found');
      if (projectId == null) projectId = existing.projectId;
      const data = {
        projectId,
        name: dto.name ?? existing.name,
        goal: dto.goal != null ? dto.goal : existing.goal,
        startDate: dto.start_date ? new Date(dto.start_date) : existing.startDate,
        endDate: dto.end_date ? new Date(dto.end_date) : existing.endDate,
        isActive: dto.is_active ?? existing.isActive
      };
      await this.db.client.update(sprint).set(data).where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)));
      return this.getSprint(id);
    }
    if (projectId == null) throw new BadRequestException('project_id is required');
    const data = {
      tenantId: tid,
      projectId,
      name: dto.name,
      goal: dto.goal ?? null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
      status: dto.status ?? 'planned',
      isActive: dto.is_active ?? true,
      createdBy: userId
    };
    const [row] = await this.db.client.insert(sprint).values(data).returning();
    return this.getSprint(row.id.toString());
  }

  async startSprint(actorId: string, id: string) {
    const tid = this.tenantContext.requireTenantId();
    const sprintId = parseWorkBigInt(id, 'sprint id');
    const [existing] = await this.db.client
      .select()
      .from(sprint)
      .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Sprint not found');
    await this.db.client
      .update(sprint)
      .set({ isActive: false })
      .where(and(eq(sprint.projectId, existing.projectId), eq(sprint.isActive, true), eq(sprint.tenantId, tid)));
    await this.db.client
      .update(sprint)
      .set({ status: 'active', isActive: true })
      .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)));
    return this.getSprint(id);
  }

  async completeSprint(actorId: string, id: string) {
    const tid = this.tenantContext.requireTenantId();
    const sprintId = parseWorkBigInt(id, 'sprint id');
    const [existing] = await this.db.client
      .select()
      .from(sprint)
      .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Sprint not found');
    await this.db.client
      .update(sprint)
      .set({ status: 'completed', isActive: false })
      .where(and(eq(sprint.id, sprintId), eq(sprint.tenantId, tid)));
    await this.db.client
      .update(workItem)
      .set({ sprintId: null })
      .where(and(eq(workItem.sprintId, existing.id), notInArray(workItem.status, ['completed', 'cancelled'] as any)));
    return this.getSprint(id);
  }

  async listMyLogs(actorId: string, query: Record<string, any>) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const conditions: SQL[] = [eq(workLog.staffId, userId)];
    if (query.approval_status) conditions.push(eq(workLog.approvalStatus, query.approval_status));
    if (query.from) conditions.push(gte(workLog.logDate, new Date(String(query.from))));
    if (query.to) conditions.push(lte(workLog.logDate, new Date(String(query.to))));
    const rows = await this.db.client
      .select()
      .from(workLog)
      .where(and(...conditions))
      .orderBy(desc(workLog.logDate), desc(workLog.createdAt));
    const hydrated = await this.hydrateWorkLogs(rows);
    const items = hydrated.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamLogs(actorId: string, query: Record<string, any>) {
    const managerId = parseWorkBigInt(actorId, 'user id');
    const tid = this.tenantContext.requireTenantId();
    const reportIds = (await this.db.client
      .select({ userId: employeeProfile.userId })
      .from(employeeProfile)
      .where(and(eq(employeeProfile.managerUserId, managerId), eq(employeeProfile.tenantId, tid)))).map((row) => row.userId);

    const conditions: SQL[] = [
or(
        inArray(
          workLog.workItemId,
          this.db.client.select({ id: workItem.id }).from(workItem).where(and(eq(workItem.assignedById, managerId), this.itemTenantScope(tid, managerId))) as any,
        ),
        reportIds.length ? inArray(workLog.staffId, reportIds) : undefined,
      ) as SQL,
    ];
    if (query.approval_status) conditions.push(eq(workLog.approvalStatus, query.approval_status));
    if (query.team_id) conditions.push(eq(workLog.teamId, parseWorkBigInt(String(query.team_id), 'team id')));
    if (query.staff_id) conditions.push(eq(workLog.staffId, parseWorkBigInt(String(query.staff_id), 'staff id')));
    if (query.week_start_date) {
      const weekStart = new Date(String(query.week_start_date));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      conditions.push(and(gte(workLog.logDate, weekStart), lte(workLog.logDate, weekEnd)) as SQL);
    }
    const rows = await this.db.client
      .select()
      .from(workLog)
      .where(and(...conditions))
      .orderBy(desc(workLog.logDate), desc(workLog.createdAt));
    const hydrated = await this.hydrateWorkLogs(rows);
    const items = hydrated.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertLog(actorId: string, dto: UpsertWorkLog, id?: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const workItemRow = await this.requireItem(dto.work_item_id, userId);

    if (id) {
      const existing = await this.requireOwnLog(id, userId);
      if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be edited');
      await this.db.client.update(workLog).set(this.mapLogDto(dto, userId, workItemRow, existing)).where(eq(workLog.id, id));
      return this.getLog(actorId, id);
    }

    const [created] = await this.db.client.insert(workLog).values(this.mapLogDto(dto, userId, workItemRow)).returning();
    return this.getLog(actorId, created.id);
  }

  /** Resolves a log the actor is entitled to see, via its parent work item. */
  private async findAccessibleLog(id: string, actorId: bigint) {
    const [row] = await this.db.client.select().from(workLog).where(eq(workLog.id, id)).limit(1);
    if (!row) return null;
    return (await this.findAccessibleItem(row.workItemId, actorId)) ? row : null;
  }

  private async requireAccessibleLog(id: string, actorId: bigint) {
    const row = await this.findAccessibleLog(id, actorId);
    if (!row) throw new NotFoundException('Work log not found');
    return row;
  }

  private async requireOwnLog(id: string, actorId: bigint) {
    const row = await this.requireAccessibleLog(id, actorId);
    if (row.staffId !== actorId) throw new NotFoundException('Work log not found');
    return row;
  }

  async getLog(actorId: string, id: string) {
    const row = await this.requireAccessibleLog(id, parseWorkBigInt(actorId, 'user id'));
    const hydrated = await this.hydrateWorkLogs([row]);
    return this.serializeWorkLog(hydrated[0]);
  }

  async submitLog(actorId: string, id: string) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const existing = await this.requireOwnLog(id, userId);
    if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be submitted');
    await this.db.client.update(workLog).set({ approvalStatus: 'submitted' }).where(eq(workLog.id, id));
    await this.syncWorkLogToProjectTimesheet(id, 'submitted');
    return this.getLog(actorId, id);
  }

  async approveLog(actorId: string, id: string, approve: boolean) {
    const managerId = parseWorkBigInt(actorId, 'user id');
    const tid = this.tenantContext.requireTenantId();
    const row = await this.requireAccessibleLog(id, managerId);
    const [workItemRow] = await this.db.client.select().from(workItem).where(eq(workItem.id, row.workItemId)).limit(1);
    const [staff] = await this.db.client.select().from(profile).where(eq(profile.id, row.staffId)).limit(1);
    const [employee] = staff
      ? await this.db.client.select().from(employeeProfile).where(and(eq(employeeProfile.userId, staff.id), eq(employeeProfile.tenantId, tid))).limit(1)
      : [];
    const managerUserId = employee?.managerUserId?.toString();
    if (row.staffId !== managerId && managerUserId !== managerId.toString()) {
      if (workItemRow?.assignedById !== managerId && workItemRow?.createdById !== managerId) {
        throw new BadRequestException('You cannot review this work log');
      }
    }
    await this.db.client
      .update(workLog)
      .set({
        approvalStatus: approve ? 'approved' : 'rejected',
        approvedById: managerId,
        approvedAt: approve ? new Date() : null,
      })
      .where(eq(workLog.id, id));
    await this.syncWorkLogToProjectTimesheet(id, approve ? 'approved' : 'rejected', managerId);
    return this.getLog(actorId, id);
  }


  async myTimesheetSummary(actorId: string, query: Record<string, any>) {
    const userId = parseWorkBigInt(actorId, 'user id');
    const conditions: SQL[] = [
      eq(workLog.staffId, userId),
      inArray(workLog.approvalStatus, ['submitted', 'approved']),
    ];
    if (query.from) conditions.push(gte(workLog.logDate, new Date(String(query.from))));
    if (query.to) conditions.push(lte(workLog.logDate, new Date(String(query.to))));
    const rows = await this.db.client
      .select()
      .from(workLog)
      .where(and(...conditions))
      .orderBy(asc(workLog.logDate));
    const hydrated = await this.hydrateWorkLogs(rows);
    const summary = new Map<string, any>();
    for (const row of hydrated) {
      const key = [
        row.organizationId || '-',
        row.teamId || '-',
        row.projectId || '-',
        row.fundId || '-',
        row.grantId || '-'
      ].join(':');
      const current = summary.get(key) || {
        organization_id: row.organizationId?.toString() || '',
        organization_name: row.organization?.name || 'No organization',
        team_id: row.teamId?.toString() || '',
        team_name: row.team?.name || 'No team',
        project_id: row.projectId?.toString() || '',
        project_name: row.project?.name || 'No project',
        fund_id: row.fundId || '',
        fund_name: row.fund?.name || 'No fund',
        grant_id: row.grantId || '',
        grant_name: row.grant?.name || 'No grant',
        hours: 0,
        entries: 0
      };
      current.hours += Number(row.hoursSpent || 0);
      current.entries += 1;
      summary.set(key, current);
    }
    return Array.from(summary.values()).sort((a, b) => b.hours - a.hours);
  }

  private mapItemDto(dto: UpsertWorkItem, actorId: bigint, existing?: any): NewWorkItem {
    return {
      title: (dto.title ?? existing?.title) as string,
      description: dto.description ?? existing?.description ?? null,
      itemType: (dto.item_type as any) ?? existing?.itemType ?? 'weekly_task',
      status: (dto.status as any) ?? existing?.status ?? 'planned',
      priority: (dto.priority as any) ?? existing?.priority ?? 'medium',
      color: dto.color !== undefined ? dto.color?.trim() || null : existing?.color ?? null,
      tags: dto.tags !== undefined ? normalizeTags(dto.tags) : existing?.tags ?? null,
      organizationId: optionalBigInt(dto.organization_id, 'organization id') ?? existing?.organizationId ?? null,

      ownerTeamId: optionalBigInt(dto.owner_team_id, 'owner team id') ?? existing?.ownerTeamId ?? null,
      secondaryTeamId: optionalBigInt(dto.secondary_team_id, 'secondary team id') ?? existing?.secondaryTeamId ?? null,
      projectId: optionalBigInt(dto.project_id, 'project id') ?? existing?.projectId ?? null,
      sprintId: optionalBigInt(dto.sprint_id, 'sprint id') ?? existing?.sprintId ?? null,
      parentId: optionalString(dto.parent_id) ?? existing?.parentId ?? null,
      estimatePoints: dto.estimate_points != null ? Number(dto.estimate_points) : existing?.estimatePoints ?? null,
      sortOrder: dto.sort_order != null ? Number(dto.sort_order) : existing?.sortOrder ?? 0,
      fundId: optionalString(dto.fund_id) ?? existing?.fundId ?? null,
      grantId: optionalString(dto.grant_id) ?? existing?.grantId ?? null,
      goalId: optionalString(dto.goal_id) ?? existing?.goalId ?? null,
      objectiveId: optionalString(dto.objective_id) ?? existing?.objectiveId ?? null,
      kpiId: optionalString(dto.kpi_id) ?? existing?.kpiId ?? null,
      assignedToId: optionalBigInt(dto.assigned_to_id, 'assigned to id') ?? existing?.assignedToId ?? actorId,
      assignedById: existing?.assignedById ?? actorId,
      createdById: existing?.createdById ?? actorId,
      plannedStartDate: dto.planned_start_date ? new Date(dto.planned_start_date) : existing?.plannedStartDate ?? null,
      dueDate: dto.due_date ? new Date(dto.due_date) : existing?.dueDate ?? null,
      weekStartDate: dto.week_start_date ? new Date(dto.week_start_date) : existing?.weekStartDate ?? null,
      expectedHours: dto.expected_hours != null ? String(dto.expected_hours) : existing?.expectedHours ?? null,
      isStaffAdded: dto.is_staff_added ?? existing?.isStaffAdded ?? false,
      requiresManagerAck: dto.requires_manager_ack ?? existing?.requiresManagerAck ?? false
    };
  }

  private mapLogDto(dto: UpsertWorkLog, actorId: bigint, item: any, existing?: any): NewWorkLog {
    return {
      workItemId: item.id,
      staffId: existing?.staffId ?? actorId,
      organizationId: optionalBigInt(dto.organization_id, 'organization id') ?? existing?.organizationId ?? item.organizationId ?? null,
      teamId: optionalBigInt(dto.team_id, 'team id') ?? existing?.teamId ?? item.ownerTeamId ?? null,
      projectId: optionalBigInt(dto.project_id, 'project id') ?? existing?.projectId ?? item.projectId ?? null,
      fundId: optionalString(dto.fund_id) ?? existing?.fundId ?? item.fundId ?? null,
      grantId: optionalString(dto.grant_id) ?? existing?.grantId ?? item.grantId ?? null,
      logDate: new Date(dto.log_date),
      hoursSpent: String(dto.hours_spent ?? 0),
      status: (dto.status as any) ?? existing?.status ?? 'in_progress',
      progressPercent: dto.progress_percent != null ? String(dto.progress_percent) : existing?.progressPercent ?? null,
      note: dto.note ?? existing?.note ?? null,
      blockerNote: dto.blocker_note ?? existing?.blockerNote ?? null,
      carriedOver: dto.carried_over ?? existing?.carriedOver ?? false,
      carryOverToDate: dto.carry_over_to_date ? new Date(dto.carry_over_to_date) : existing?.carryOverToDate ?? null,
      approvalStatus: existing?.approvalStatus ?? 'draft',
      approvedById: existing?.approvedById ?? null,
      approvedAt: existing?.approvedAt ?? null
    };
  }

  private serializeWorkItem(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      item_type: row.itemType,
      status: row.status,
      priority: row.priority,
      color: row.color ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      organization_id: row.organizationId?.toString() || '',

      owner_team_id: row.ownerTeamId?.toString() || '',
      secondary_team_id: row.secondaryTeamId?.toString() || '',
      project_id: row.projectId?.toString() || '',
      sprint_id: row.sprintId?.toString() || '',
      parent_id: row.parentId || '',
      estimate_points: row.estimatePoints ?? null,
      sort_order: row.sortOrder ?? 0,
      fund_id: row.fundId || '',
      grant_id: row.grantId || '',
      goal_id: row.goalId || '',
      objective_id: row.objectiveId || '',
      kpi_id: row.kpiId || '',
      assigned_to_id: row.assignedToId?.toString() || '',
      assigned_by_id: row.assignedById?.toString() || '',
      created_by_id: row.createdById?.toString() || '',
      planned_start_date: row.plannedStartDate,
      due_date: row.dueDate,
      week_start_date: row.weekStartDate,
      expected_hours: row.expectedHours ? Number(row.expectedHours) : 0,
      is_staff_added: row.isStaffAdded,
      requires_manager_ack: row.requiresManagerAck,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      owner_team: row.ownerTeam ? { id: row.ownerTeam.id.toString(), name: row.ownerTeam.name } : null,
      secondary_team: row.secondaryTeam ? { id: row.secondaryTeam.id.toString(), name: row.secondaryTeam.name } : null,
      project: row.project ? { id: row.project.id.toString(), name: row.project.name } : null,
      fund: row.fund ? { id: row.fund.id, name: row.fund.name } : null,
      grant: row.grant ? { id: row.grant.id, name: row.grant.name } : null,
      goal: row.goal ? this.serializeGoal(row.goal) : null,
      objective: row.objective ? this.serializeObjective(row.objective) : null,
      kpi: row.kpi ? this.serializeKpi(row.kpi) : null,
      assigned_to: row.assignedTo ? serializeProfile(row.assignedTo) : null,
      assigned_by: row.assignedBy ? serializeProfile(row.assignedBy) : null,
      created_by: row.createdBy ? serializeProfile(row.createdBy) : null,
      parent: row.parent ? this.serializeWorkItemRef(row.parent) : null,
      subtasks: (row.subtasks || []).map((child: any) => this.serializeWorkItemRef(child)),
      sprint: row.sprint ? this.serializeSprintRef(row.sprint) : null,
      recent_logs: (row.logs || []).map((log: any) => ({
        id: log.id,
        log_date: log.logDate,
        hours_spent: Number(log.hoursSpent || 0),
        status: log.status,
        approval_status: log.approvalStatus,
        note: log.note || '',
      })),
      attachments: row.attachments ?? [],
      comments_count: (row.comments || []).length,
      latest_comment: row.comments?.[0] ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }


  private serializeWorkLog(row: any) {
    return {
      id: row.id,
      work_item_id: row.workItemId,
      staff_id: row.staffId?.toString() || '',
      organization_id: row.organizationId?.toString() || '',
      team_id: row.teamId?.toString() || '',
      project_id: row.projectId?.toString() || '',
      fund_id: row.fundId || '',
      grant_id: row.grantId || '',
      log_date: row.logDate,
      hours_spent: Number(row.hoursSpent || 0),
      status: row.status,
      progress_percent: row.progressPercent ? Number(row.progressPercent) : null,
      note: row.note || '',
      blocker_note: row.blockerNote || '',
      carried_over: row.carriedOver,
      carry_over_to_date: row.carryOverToDate,
      approval_status: row.approvalStatus,
      approved_at: row.approvedAt,
      work_item: row.workItem ? this.serializeWorkItem({ ...row.workItem, logs: [] }) : null,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      team: row.team ? { id: row.team.id.toString(), name: row.team.name } : null,
      project: row.project ? { id: row.project.id.toString(), name: row.project.name } : null,
      fund: row.fund ? { id: row.fund.id, name: row.fund.name } : null,
      grant: row.grant ? { id: row.grant.id, name: row.grant.name } : null,
      staff: row.staff ? serializeProfile(row.staff) : null,
      approved_by: row.approvedBy ? serializeProfile(row.approvedBy) : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private async enrichItems(rows: any[]) {
    if (!rows.length) return rows;
    const ids = rows.map((row) => row.id);
    const parentIds = [...new Set(rows.map((row) => row.parentId).filter(Boolean))] as string[];
    const organizationIds = [...new Set(rows.map((row) => row.organizationId).filter((x): x is bigint => x != null))];
    const ownerTeamIds = [...new Set(rows.map((row) => row.ownerTeamId).filter((x): x is bigint => x != null))];
    const secondaryTeamIds = [...new Set(rows.map((row) => row.secondaryTeamId).filter((x): x is bigint => x != null))];
    const projectIds = [...new Set(rows.map((row) => row.projectId).filter((x): x is bigint => x != null))];
    const fundIds = [...new Set(rows.map((row) => row.fundId).filter((x): x is string => x != null))];
    const grantIds = [...new Set(rows.map((row) => row.grantId).filter((x): x is string => x != null))];
    const goalIds = [...new Set(rows.map((row) => row.goalId).filter((x): x is string => x != null))];
    const objectiveIds = [...new Set(rows.map((row) => row.objectiveId).filter((x): x is string => x != null))];
    const kpiIds = [...new Set(rows.map((row) => row.kpiId).filter((x): x is string => x != null))];
    const assignedToIds = [...new Set(rows.map((row) => row.assignedToId).filter((x): x is bigint => x != null))];
    const assignedByIds = [...new Set(rows.map((row) => row.assignedById).filter((x): x is bigint => x != null))];
    const createdByIds = [...new Set(rows.map((row) => row.createdById).filter((x): x is bigint => x != null))];
    const sprintIds = [...new Set(rows.map((row) => row.sprintId).filter((x): x is bigint => x != null))];


    const [parents, subtasks, organizations, ownerTeams, secondaryTeams, projects, funds, grants, goals, objectives, kpis, assignedTo, assignedBy, createdBy, logs, comments, attachments, sprints] = await Promise.all([
      parentIds.length ? this.db.client.select().from(workItem).where(inArray(workItem.id, parentIds)) : Promise.resolve([] as any[]),
      this.db.client.select().from(workItem).where(inArray(workItem.parentId, ids)),
      organizationIds.length ? this.db.client.select().from(organization).where(inArray(organization.id, organizationIds)) : Promise.resolve([] as any[]),
      ownerTeamIds.length ? this.db.client.select().from(group).where(inArray(group.id, ownerTeamIds)) : Promise.resolve([] as any[]),
      secondaryTeamIds.length ? this.db.client.select().from(group).where(inArray(group.id, secondaryTeamIds)) : Promise.resolve([] as any[]),
      projectIds.length ? this.db.client.select().from(project).where(inArray(project.id, projectIds)) : Promise.resolve([] as any[]),
      fundIds.length ? this.db.client.select().from(financeFund).where(inArray(financeFund.id, fundIds)) : Promise.resolve([] as any[]),
      grantIds.length ? this.db.client.select().from(financeGrant).where(inArray(financeGrant.id, grantIds)) : Promise.resolve([] as any[]),
      goalIds.length ? this.db.client.select().from(teamGoal).where(inArray(teamGoal.id, goalIds)) : Promise.resolve([] as any[]),
      objectiveIds.length ? this.db.client.select().from(teamObjective).where(inArray(teamObjective.id, objectiveIds)) : Promise.resolve([] as any[]),
      kpiIds.length ? this.db.client.select().from(teamKpi).where(inArray(teamKpi.id, kpiIds)) : Promise.resolve([] as any[]),
      assignedToIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, assignedToIds)) : Promise.resolve([] as any[]),
      assignedByIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, assignedByIds)) : Promise.resolve([] as any[]),
      createdByIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, createdByIds)) : Promise.resolve([] as any[]),
      this.db.client.select().from(workLog).where(inArray(workLog.workItemId, ids)).orderBy(desc(workLog.logDate), desc(workLog.createdAt)),
      this.db.client.select({ comment: workItemComment, author: profileRefColumns() })
        .from(workItemComment)
        .leftJoin(profile, eq(workItemComment.createdBy, profile.id))
        .where(inArray(workItemComment.workItemId, ids))
        .orderBy(desc(workItemComment.createdAt)),
      this.db.client
        .select({
          attachment: workItemAttachment,
          file: {
            id: fileAsset.id,
            fileName: fileAsset.fileName,
            mimeType: fileAsset.mimeType,
            fileSize: fileAsset.fileSize,
            publicUrl: fileAsset.publicUrl,
            storagePath: fileAsset.storagePath,
          },
        })
        .from(workItemAttachment)
        .leftJoin(fileAsset, eq(workItemAttachment.fileAssetId, fileAsset.id))
        .where(inArray(workItemAttachment.workItemId, ids))
        .orderBy(desc(workItemAttachment.createdAt)),
      sprintIds.length ? this.db.client.select().from(sprint).where(inArray(sprint.id, sprintIds)) : Promise.resolve([] as any[]),
    ]);

    const parentMap = new Map(parents.map((parent) => [parent.id, parent]));
    const subtaskMap = new Map<string, any[]>();
    for (const child of subtasks) {
      const list = subtaskMap.get(child.parentId) ?? [];
      list.push(child);
      subtaskMap.set(child.parentId, list);
    }
    const organizationMap = new Map(organizations.map((org) => [org.id.toString(), org]));
    const ownerTeamMap = new Map(ownerTeams.map((team) => [team.id.toString(), team]));
    const secondaryTeamMap = new Map(secondaryTeams.map((team) => [team.id.toString(), team]));
    const projectMap = new Map(projects.map((item) => [item.id.toString(), item]));
    const fundMap = new Map(funds.map((fund) => [fund.id, fund]));
    const grantMap = new Map(grants.map((grant) => [grant.id, grant]));
    const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
    const objectiveMap = new Map(objectives.map((objective) => [objective.id, objective]));
    const kpiMap = new Map(kpis.map((kpi) => [kpi.id, kpi]));
    const assignedToMap = new Map(assignedTo.map((worker) => [worker.id.toString(), worker]));
    const assignedByMap = new Map(assignedBy.map((worker) => [worker.id.toString(), worker]));
    const createdByMap = new Map(createdBy.map((worker) => [worker.id.toString(), worker]));
    const sprintMap = new Map(sprints.map((row) => [row.id.toString(), row]));

    const logsByItem = new Map<string, any[]>();
    for (const log of logs) {
      const list = logsByItem.get(log.workItemId) ?? [];
      if (list.length < 5) list.push(log);
      logsByItem.set(log.workItemId, list);
    }
    const commentsByItem = new Map<string, any[]>();
    for (const { comment, author } of comments) {
      const list = commentsByItem.get(comment.workItemId) ?? [];
      list.push({
        id: comment.id.toString(),
        work_item_id: comment.workItemId,
        body: comment.body,
        metadata: comment.metadata ?? {},
        created_by: comment.createdBy ? comment.createdBy.toString() : null,
        author: serializeProfileRef(author),
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
      });
      commentsByItem.set(comment.workItemId, list);
    }
    const attachmentsByItem = new Map<string, any[]>();
    for (const { attachment, file } of attachments) {
      const list = attachmentsByItem.get(attachment.workItemId) ?? [];
      list.push({
        id: attachment.id.toString(),
        work_item_id: attachment.workItemId,
        file_asset_id: attachment.fileAssetId,
        label: attachment.label,
        created_by: attachment.createdBy ? attachment.createdBy.toString() : null,
        created_at: attachment.createdAt,
        file: serializeFileAsset(file),
      });
      attachmentsByItem.set(attachment.workItemId, list);
    }
    return rows.map((row) => ({
      ...row,
      organization: row.organizationId ? (organizationMap.get(row.organizationId.toString()) ?? null) : null,
      ownerTeam: row.ownerTeamId ? (ownerTeamMap.get(row.ownerTeamId.toString()) ?? null) : null,
      secondaryTeam: row.secondaryTeamId ? (secondaryTeamMap.get(row.secondaryTeamId.toString()) ?? null) : null,
      project: row.projectId ? (projectMap.get(row.projectId.toString()) ?? null) : null,
      fund: row.fundId ? (fundMap.get(row.fundId) ?? null) : null,
      grant: row.grantId ? (grantMap.get(row.grantId) ?? null) : null,
      goal: row.goalId ? (goalMap.get(row.goalId) ?? null) : null,
      objective: row.objectiveId ? (objectiveMap.get(row.objectiveId) ?? null) : null,
      kpi: row.kpiId ? (kpiMap.get(row.kpiId) ?? null) : null,
      assignedTo: row.assignedToId ? (assignedToMap.get(row.assignedToId.toString()) ?? null) : null,
      assignedBy: row.assignedById ? (assignedByMap.get(row.assignedById.toString()) ?? null) : null,
      createdBy: row.createdById ? (createdByMap.get(row.createdById.toString()) ?? null) : null,
      parent: row.parentId ? (parentMap.get(row.parentId) ?? null) : null,
      sprint: row.sprintId ? (sprintMap.get(row.sprintId.toString()) ?? null) : null,
      subtasks: subtaskMap.get(row.id) ?? [],
      logs: logsByItem.get(row.id) ?? [],
      comments: commentsByItem.get(row.id) ?? [],
      attachments: attachmentsByItem.get(row.id) ?? [],
    }));
  }


  private async hydrateWorkLogs(rows: any[]) {
    if (!rows.length) return rows;
    const workItemIds = [...new Set(rows.map((row) => row.workItemId).filter(Boolean))] as string[];
    const organizationIds = [...new Set(rows.map((row) => row.organizationId).filter((x): x is bigint => x != null))];
    const teamIds = [...new Set(rows.map((row) => row.teamId).filter((x): x is bigint => x != null))];
    const projectIds = [...new Set(rows.map((row) => row.projectId).filter((x): x is bigint => x != null))];
    const fundIds = [...new Set(rows.map((row) => row.fundId).filter((x): x is string => x != null))];
    const grantIds = [...new Set(rows.map((row) => row.grantId).filter((x): x is string => x != null))];
    const staffIds = [...new Set(rows.map((row) => row.staffId).filter((x): x is bigint => x != null))];
    const approvedByIds = [...new Set(rows.map((row) => row.approvedById).filter((x): x is bigint => x != null))];

    const [workItems, organizations, teams, projects, funds, grants, staff, approvedBy] = await Promise.all([
      workItemIds.length ? this.db.client.select().from(workItem).where(inArray(workItem.id, workItemIds)) : Promise.resolve([] as any[]),
      organizationIds.length ? this.db.client.select().from(organization).where(inArray(organization.id, organizationIds)) : Promise.resolve([] as any[]),
      teamIds.length ? this.db.client.select().from(group).where(inArray(group.id, teamIds)) : Promise.resolve([] as any[]),
      projectIds.length ? this.db.client.select().from(project).where(inArray(project.id, projectIds)) : Promise.resolve([] as any[]),
      fundIds.length ? this.db.client.select().from(financeFund).where(inArray(financeFund.id, fundIds)) : Promise.resolve([] as any[]),
      grantIds.length ? this.db.client.select().from(financeGrant).where(inArray(financeGrant.id, grantIds)) : Promise.resolve([] as any[]),
      staffIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, staffIds)) : Promise.resolve([] as any[]),
      approvedByIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, approvedByIds)) : Promise.resolve([] as any[]),
    ]);
    const workItemMap = new Map(workItems.map((item) => [item.id, item]));
    const organizationMap = new Map(organizations.map((org) => [org.id.toString(), org]));
    const teamMap = new Map(teams.map((team) => [team.id.toString(), team]));
    const projectMap = new Map(projects.map((project) => [project.id.toString(), project]));
    const fundMap = new Map(funds.map((fund) => [fund.id, fund]));
    const grantMap = new Map(grants.map((grant) => [grant.id, grant]));
    const staffMap = new Map(staff.map((person) => [person.id.toString(), person]));
    const approvedByMap = new Map(approvedBy.map((person) => [person.id.toString(), person]));
    return rows.map((row) => ({
      ...row,
      workItem: row.workItemId ? (workItemMap.get(row.workItemId) ?? null) : null,
      organization: row.organizationId ? (organizationMap.get(row.organizationId.toString()) ?? null) : null,
      team: row.teamId ? (teamMap.get(row.teamId.toString()) ?? null) : null,
      project: row.projectId ? (projectMap.get(row.projectId.toString()) ?? null) : null,
      fund: row.fundId ? (fundMap.get(row.fundId) ?? null) : null,
      grant: row.grantId ? (grantMap.get(row.grantId) ?? null) : null,
      staff: row.staffId ? (staffMap.get(row.staffId.toString()) ?? null) : null,
      approvedBy: row.approvedById ? (approvedByMap.get(row.approvedById.toString()) ?? null) : null
    }));
  }

  private async enrichGoals(rows: any[]) {
    if (!rows.length) return rows;
    const organizationIds = [...new Set(rows.map((row) => row.organizationId).filter((x): x is bigint => x != null))];
    const teamIds = [...new Set(rows.map((row) => row.teamId).filter((x): x is bigint => x != null))];
    const ownerIds = [...new Set(rows.map((row) => row.ownerUserId).filter((x): x is bigint => x != null))];
    const [organizations, teams, owners] = await Promise.all([
      organizationIds.length ? this.db.client.select().from(organization).where(inArray(organization.id, organizationIds)) : Promise.resolve([] as any[]),
      teamIds.length ? this.db.client.select().from(group).where(inArray(group.id, teamIds)) : Promise.resolve([] as any[]),
      ownerIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, ownerIds)) : Promise.resolve([] as any[]),
    ]);
    const organizationMap = new Map(organizations.map((org) => [org.id.toString(), org]));
    const teamMap = new Map(teams.map((team) => [team.id.toString(), team]));
    const ownerMap = new Map(owners.map((owner) => [owner.id.toString(), owner]));
    return rows.map((row) => ({
      ...row,
      organization: row.organizationId ? (organizationMap.get(row.organizationId.toString()) ?? null) : null,
      team: row.teamId ? (teamMap.get(row.teamId.toString()) ?? null) : null,
      owner: row.ownerUserId ? (ownerMap.get(row.ownerUserId.toString()) ?? null) : null
    }));
  }

  private async enrichObjectives(rows: any[]) {
    if (!rows.length) return rows;
    const goalIds = [...new Set(rows.map((row) => row.goalId).filter((x): x is string => x != null))];
    const teamIds = [...new Set(rows.map((row) => row.teamId).filter((x): x is bigint => x != null))];
    const ownerIds = [...new Set(rows.map((row) => row.ownerUserId).filter((x): x is bigint => x != null))];
    const [goals, teams, owners] = await Promise.all([
      goalIds.length ? this.db.client.select().from(teamGoal).where(inArray(teamGoal.id, goalIds)) : Promise.resolve([] as any[]),
      teamIds.length ? this.db.client.select().from(group).where(inArray(group.id, teamIds)) : Promise.resolve([] as any[]),
      ownerIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, ownerIds)) : Promise.resolve([] as any[]),
    ]);
    const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
    const teamMap = new Map(teams.map((team) => [team.id.toString(), team]));
    const ownerMap = new Map(owners.map((owner) => [owner.id.toString(), owner]));
    return rows.map((row) => ({
      ...row,
      goal: row.goalId ? (goalMap.get(row.goalId) ?? null) : null,
      team: row.teamId ? (teamMap.get(row.teamId.toString()) ?? null) : null,
      owner: row.ownerUserId ? (ownerMap.get(row.ownerUserId.toString()) ?? null) : null
    }));
  }

  private async enrichKpis(rows: any[]) {
    if (!rows.length) return rows;
    const goalIds = [...new Set(rows.map((row) => row.goalId).filter((x): x is string => x != null))];
    const objectiveIds = [...new Set(rows.map((row) => row.objectiveId).filter((x): x is string => x != null))];
    const teamIds = [...new Set(rows.map((row) => row.teamId).filter((x): x is bigint => x != null))];
    const ownerIds = [...new Set(rows.map((row) => row.ownerUserId).filter((x): x is bigint => x != null))];
    const [goals, objectives, teams, owners] = await Promise.all([
      goalIds.length ? this.db.client.select().from(teamGoal).where(inArray(teamGoal.id, goalIds)) : Promise.resolve([] as any[]),
      objectiveIds.length ? this.db.client.select().from(teamObjective).where(inArray(teamObjective.id, objectiveIds)) : Promise.resolve([] as any[]),
      teamIds.length ? this.db.client.select().from(group).where(inArray(group.id, teamIds)) : Promise.resolve([] as any[]),
      ownerIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, ownerIds)) : Promise.resolve([] as any[]),
    ]);
    const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
    const objectiveMap = new Map(objectives.map((objective) => [objective.id, objective]));
    const teamMap = new Map(teams.map((team) => [team.id.toString(), team]));
    const ownerMap = new Map(owners.map((owner) => [owner.id.toString(), owner]));
    return rows.map((row) => ({
      ...row,
      goal: row.goalId ? (goalMap.get(row.goalId) ?? null) : null,
      objective: row.objectiveId ? (objectiveMap.get(row.objectiveId) ?? null) : null,
      team: row.teamId ? (teamMap.get(row.teamId.toString()) ?? null) : null,
      owner: row.ownerUserId ? (ownerMap.get(row.ownerUserId.toString()) ?? null) : null
    }));
  }

  private async enrichSprints(rows: any[]) {
    if (!rows.length) return rows;
    const createdByIds = [...new Set(rows.map((row) => row.createdBy).filter((x): x is bigint => x != null))];
    const projectIds = [...new Set(rows.map((row) => row.projectId).filter((x): x is bigint => x != null))];
    const [creators, projects] = await Promise.all([
      createdByIds.length ? this.db.client.select().from(profile).where(inArray(profile.id, createdByIds)) : Promise.resolve([] as any[]),
      projectIds.length ? this.db.client.select().from(project).where(inArray(project.id, projectIds)) : Promise.resolve([] as any[]),
    ]);
    const creatorMap = new Map(creators.map((creator) => [creator.id.toString(), creator]));
    const projectMap = new Map(projects.map((project) => [project.id.toString(), project]));
    return rows.map((row) => ({
      ...row,
      creator: row.createdBy ? (creatorMap.get(row.createdBy.toString()) ?? null) : null,
      project: row.projectId ? (projectMap.get(row.projectId.toString()) ?? null) : null
    }));
  }

  private serializeSprintRef(row: any) {
    return {
      id: row.id?.toString() ?? row.id,
      name: row.name,
      status: row.status,
      project_id: row.projectId?.toString() || '',
      start_date: row.startDate,
      end_date: row.endDate,
      is_active: row.isActive
    };
  }

  private serializeSprint(row: any) {
    const itemCounts = new Map<string, number>();
    for (const item of row.items || []) {
      itemCounts.set(item.status, (itemCounts.get(item.status) ?? 0) + 1);
    }
    return {
      id: row.id?.toString() ?? row.id,
      name: row.name,
      goal: row.goal || '',
      project_id: row.projectId?.toString() || '',
      project: row.project ? { id: row.project.id.toString(), name: row.project.name } : null,
      start_date: row.startDate,
      end_date: row.endDate,
      status: row.status,
      is_active: row.isActive,
      created_by_id: row.createdBy?.toString() || '',
      created_by: row.creator ? serializeProfile(row.creator) : null,
      total_items: (row.items || []).length,
      completed_items: itemCounts.get('completed') ?? 0,
      items: row.items || [],
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private serializeWorkItemRef(row: any) {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      project_id: row.projectId?.toString() || '',
      sprint_id: row.sprintId?.toString() || '',
      assigned_to_id: row.assignedToId?.toString() || '',
      due_date: row.dueDate,
      estimate_points: row.estimatePoints ?? null,
      sort_order: row.sortOrder ?? 0
    };
  }

  private serializeGoal(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      period_year: row.periodYear,
      period_type: row.periodType,
      period_label: row.periodLabel || '',
      status: row.status,
      weight: row.weight != null ? Number(row.weight) : null,
      start_date: row.startDate,
      end_date: row.endDate,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      team: row.team ? { id: row.team.id.toString(), name: row.team.name } : null,
      owner: row.owner ? serializeProfile(row.owner) : null,
      objectives_count: row.objectives?.length ?? 0,
      kpis_count: row.kpis?.length ?? 0,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private serializeObjective(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      weight: row.weight != null ? Number(row.weight) : null,
      due_date: row.dueDate,
      goal_id: row.goalId || '',
      goal: row.goal ? { id: row.goal.id, title: row.goal.title } : null,
      team: row.team ? { id: row.team.id.toString(), name: row.team.name } : null,
      owner: row.owner ? serializeProfile(row.owner) : null,
      kpis_count: row.kpis?.length ?? 0,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private serializeKpi(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      target_type: row.targetType || '',
      target_value: row.targetValue != null ? Number(row.targetValue) : null,
      unit_label: row.unitLabel || '',
      period_year: row.periodYear,
      quarter: row.quarter,
      status: row.status,
      weight: row.weight != null ? Number(row.weight) : null,
      goal_id: row.goalId || '',
      objective_id: row.objectiveId || '',
      goal: row.goal ? { id: row.goal.id, title: row.goal.title } : null,
      objective: row.objective ? { id: row.objective.id, title: row.objective.title } : null,
      team: row.team ? { id: row.team.id.toString(), name: row.team.name } : null,
      owner: row.owner ? serializeProfile(row.owner) : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private async syncWorkLogToProjectTimesheet(workLogId: string, status: 'submitted' | 'approved' | 'rejected', actorId?: bigint) {
    const tid = this.tenantContext.requireTenantId();
    const [log] = await this.db.client.select().from(workLog).where(eq(workLog.id, workLogId)).limit(1);
    if (!log) return null;

    const [workItemRow] = await this.db.client.select().from(workItem).where(eq(workItem.id, log.workItemId)).limit(1);

    const [payrollWorkerRow] = await this.db.client
      .select()
      .from(payrollWorker)
      .where(and(eq(payrollWorker.profileId, log.staffId), eq(payrollWorker.status, 'active'), eq(payrollWorker.tenantId, tid)))
      .orderBy(desc(payrollWorker.createdAt))
      .limit(1);

    if (!payrollWorkerRow) return null;

    const payload = {
      sourceWorkLogId: log.id,
      workerId: payrollWorkerRow.id,
      organizationId: log.organizationId ?? workItemRow.organizationId ?? payrollWorkerRow.organizationId ?? null,
      teamId: log.teamId ?? workItemRow.ownerTeamId ?? payrollWorkerRow.teamId ?? null,
      projectId: log.projectId ?? workItemRow.projectId ?? payrollWorkerRow.projectId ?? null,
      fundId: log.fundId ?? workItemRow.fundId ?? payrollWorkerRow.defaultFundId ?? null,
      grantId: log.grantId ?? workItemRow.grantId ?? payrollWorkerRow.defaultGrantId ?? null,
      workDate: log.logDate,
      hours: log.hoursSpent,
      description: log.note || workItemRow.title,
      status,
      approvedBy: status === 'approved' ? actorId ?? null : null,
      approvedAt: status === 'approved' ? new Date() : null,
      createdBy: log.staffId
    };

    const [existing] = await this.db.client
      .select()
      .from(projectTimesheetEntry)
      .where(eq(projectTimesheetEntry.sourceWorkLogId, log.id))
      .limit(1);

    const entry = existing
      ? await this.db.client
          .update(projectTimesheetEntry)
          .set({
            organizationId: payload.organizationId,
            teamId: payload.teamId,
            projectId: payload.projectId,
            fundId: payload.fundId,
            grantId: payload.grantId,
            workDate: payload.workDate,
            hours: payload.hours,
            description: payload.description,
            status,
            approvedBy: payload.approvedBy,
            approvedAt: payload.approvedAt,
            createdBy: payload.createdBy
          })
          .where(eq(projectTimesheetEntry.id, existing.id))
          .returning()
          .then((rows) => rows[0] ?? null)
      : await this.db.client.insert(projectTimesheetEntry).values(payload).returning().then((rows) => rows[0] ?? null);

    await this.syncProjectTimesheetWorkerMonthToPayroll(payrollWorkerRow.id, log.logDate);
    return entry;
  }

  private async syncProjectTimesheetWorkerMonthToPayroll(workerId: string, workDate: Date) {
    const month = workDate.getUTCMonth() + 1;
    const year = workDate.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const tid = this.tenantContext.requireTenantId();
    const [run] = await this.db.client
      .select()
      .from(payrollRun)
      .where(and(eq(payrollRun.year, year), eq(payrollRun.month, month), eq(payrollRun.tenantId, tid)))
      .limit(1);
    if (!run) return null;

    const approvedRows = await this.db.client
      .select()
      .from(projectTimesheetEntry)
      .where(and(
        eq(projectTimesheetEntry.workerId, workerId),
        eq(projectTimesheetEntry.status, 'approved'),
        gte(projectTimesheetEntry.workDate, periodStart),
        lte(projectTimesheetEntry.workDate, periodEnd)
      ))
      .orderBy(asc(projectTimesheetEntry.workDate), asc(projectTimesheetEntry.createdAt));

    const totalHours = approvedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    const allocations: NewPayrollRunTimesheetAllocation[] = approvedRows.map((row, index) => ({
      runId: run.id,
      workerId,
      organizationId: row.organizationId,
      teamId: row.teamId,
      projectId: row.projectId,
      fundId: row.fundId,
      grantId: row.grantId,
      hours: row.hours,
      allocationPercent: String(totalHours > 0 ? (Number(row.hours || 0) / totalHours) * 100 : 0),
      source: 'timesheet' as const,
      notes: row.description,
      sortOrder: index,
      approvedAt: row.approvedAt ?? new Date()
    }));
    await this.db.client.transaction(async (tx) => {
      await tx
        .delete(payrollRunTimesheetAllocation)
        .where(and(eq(payrollRunTimesheetAllocation.runId, run.id), eq(payrollRunTimesheetAllocation.workerId, workerId)));
      if (allocations.length) {
        await tx.insert(payrollRunTimesheetAllocation).values(allocations);
      }
      await tx
        .update(projectTimesheetEntry)
        .set({ syncedRunId: run.id })
        .where(inArray(projectTimesheetEntry.id, approvedRows.map((row) => row.id)));
    });
    return run.id;
  }
}

