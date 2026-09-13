import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Drizzle, WorkLogApprovalStatus, WorkItemStatus } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { toBigInt } from '$common/utils/ids';
import { UpsertTeamGoalDto, UpsertTeamKpiDto, UpsertTeamObjectiveDto } from '$modules/operations/tasks/dto/upsert-team-goal.dto';
import { UpsertSprintDto } from '$modules/operations/tasks/dto/upsert-sprint.dto';
import { UpsertWorkItemDto } from '$modules/operations/tasks/dto/upsert-work-item.dto';
import { UpsertWorkLogDto } from '$modules/operations/tasks/dto/upsert-work-log.dto';

@Injectable()
export class TasksService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listGoals(query: Record<string, any>) {
    const where: Drizzle.TeamGoalWhereInput = {};
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.organization_id) where.organizationId = this.parseBigInt(String(query.organization_id), 'organization id');
    if (query.period_year) where.periodYear = Number(query.period_year);
    const rows = await this.drizzle.teamGoal.findMany({
      where,
      include: { organization: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ periodYear: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeGoal(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertGoal(actorId: string, dto: UpsertTeamGoalDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Drizzle.TeamGoalUncheckedCreateInput | Drizzle.TeamGoalUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description ?? null,
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id'),
      teamId: this.optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: this.optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      periodYear: dto.period_year,
      periodType: dto.period_type ?? 'annual',
      periodLabel: dto.period_label ?? null,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? new Drizzle.Decimal(dto.weight) : null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
    };
    if (id) {
      await this.drizzle.teamGoal.update({ where: { id }, data: payload as Drizzle.TeamGoalUncheckedUpdateInput });
      return this.getGoal(id);
    }
    const row = await this.drizzle.teamGoal.create({ data: payload as Drizzle.TeamGoalUncheckedCreateInput });
    return this.getGoal(row.id);
  }

  async getGoal(id: string) {
    const row = await this.drizzle.teamGoal.findUnique({
      where: { id },
      include: { organization: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } }, objectives: true, kpis: true }
    });
    if (!row) throw new NotFoundException('Goal not found');
    return this.serializeGoal(row);
  }

  async listObjectives(query: Record<string, any>) {
    const where: Drizzle.TeamObjectiveWhereInput = {};
    if (query.goal_id) where.goalId = String(query.goal_id);
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    const rows = await this.drizzle.teamObjective.findMany({
      where,
      include: { goal: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeObjective(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertObjective(actorId: string, dto: UpsertTeamObjectiveDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Drizzle.TeamObjectiveUncheckedCreateInput | Drizzle.TeamObjectiveUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: this.optionalString(dto.goal_id),
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id'),
      teamId: this.optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: this.optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? new Drizzle.Decimal(dto.weight) : null,
      dueDate: dto.due_date ? new Date(dto.due_date) : null,
    };
    if (id) {
      await this.drizzle.teamObjective.update({ where: { id }, data: payload as Drizzle.TeamObjectiveUncheckedUpdateInput });
      return this.getObjective(id);
    }
    const row = await this.drizzle.teamObjective.create({ data: payload as Drizzle.TeamObjectiveUncheckedCreateInput });
    return this.getObjective(row.id);
  }

  async getObjective(id: string) {
    const row = await this.drizzle.teamObjective.findUnique({
      where: { id },
      include: { goal: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } }, kpis: true }
    });
    if (!row) throw new NotFoundException('Objective not found');
    return this.serializeObjective(row);
  }

  async listKpis(query: Record<string, any>) {
    const where: Drizzle.TeamKpiWhereInput = {};
    if (query.goal_id) where.goalId = String(query.goal_id);
    if (query.objective_id) where.objectiveId = String(query.objective_id);
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.period_year) where.periodYear = Number(query.period_year);
    const rows = await this.drizzle.teamKpi.findMany({
      where,
      include: { goal: true, objective: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ periodYear: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeKpi(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertKpi(actorId: string, dto: UpsertTeamKpiDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Drizzle.TeamKpiUncheckedCreateInput | Drizzle.TeamKpiUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: this.optionalString(dto.goal_id),
      objectiveId: this.optionalString(dto.objective_id),
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id'),
      teamId: this.optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: this.optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      targetType: dto.target_type ?? null,
      targetValue: dto.target_value != null ? new Drizzle.Decimal(dto.target_value) : null,
      unitLabel: dto.unit_label ?? null,
      periodYear: dto.period_year ?? null,
      quarter: dto.quarter ?? null,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? new Drizzle.Decimal(dto.weight) : null,
    };
    if (id) {
      await this.drizzle.teamKpi.update({ where: { id }, data: payload as Drizzle.TeamKpiUncheckedUpdateInput });
      return this.getKpi(id);
    }
    const row = await this.drizzle.teamKpi.create({ data: payload as Drizzle.TeamKpiUncheckedCreateInput });
    return this.getKpi(row.id);
  }

  async getKpi(id: string) {
    const row = await this.drizzle.teamKpi.findUnique({
      where: { id },
      include: { goal: true, objective: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    if (!row) throw new NotFoundException('KPI not found');
    return this.serializeKpi(row);
  }

  async listMyItems(actorId: string, query: Record<string, any>) {
    const userId = this.parseBigInt(actorId, 'user id');
    const where: Drizzle.WorkItemWhereInput = {
      OR: [{ assignedToId: userId }, { createdById: userId }, { assignedById: userId }]
    };
    if (query.status) where.status = query.status;
    if (query.project_id) where.projectId = this.parseBigInt(String(query.project_id), 'project id');
    if (query.sprint_id) where.sprintId = this.parseBigInt(String(query.sprint_id), 'sprint id');
    if (query.parent_id) where.parentId = String(query.parent_id);
    if (query.search) {
      where.AND = [{
        OR: [
          { title: { contains: String(query.search), mode: 'insensitive' } },
          { description: { contains: String(query.search), mode: 'insensitive' } }
        ]
      }];
    }
    const rows = await this.drizzle.workItem.findMany({
      where,
      include: this.workItemInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    const enriched = await this.enrichItems(rows);
    const items = enriched.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamItems(actorId: string, query: Record<string, any>) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const directReports = await this.drizzle.employeeProfile.findMany({
      where: { managerUserId: managerId },
      select: { userId: true }
    });
    const reportIds = directReports.map((row) => row.userId);
    const primaryTeams = reportIds.length > 0
      ? await this.drizzle.groupUser.findMany({
          where: { userId: { in: reportIds }, isPrimary: true },
          select: { groupId: true }
        })
      : [];
    const teamIds = [...new Set(primaryTeams.map((row) => row.groupId))] as bigint[];
    const where: Drizzle.WorkItemWhereInput = {
      OR: [
        { assignedById: managerId },
        reportIds.length ? { assignedToId: { in: reportIds } } : undefined,
        teamIds.length ? { ownerTeamId: { in: teamIds } } : undefined
      ].filter(Boolean) as Drizzle.WorkItemWhereInput[]
    };
    if (query.week_start_date) where.weekStartDate = new Date(String(query.week_start_date));
    if (query.team_id) where.ownerTeamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.assigned_to_id) where.assignedToId = this.parseBigInt(String(query.assigned_to_id), 'assigned to id');
    if (query.status) where.status = query.status;
    if (query.project_id) where.projectId = this.parseBigInt(String(query.project_id), 'project id');
    if (query.sprint_id) where.sprintId = this.parseBigInt(String(query.sprint_id), 'sprint id');
    if (query.parent_id) where.parentId = String(query.parent_id);
    const rows = await this.drizzle.workItem.findMany({
      where,
      include: this.workItemInclude(),
      orderBy: [{ weekStartDate: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    const enriched = await this.enrichItems(rows);
    const items = enriched.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertItem(actorId: string, dto: UpsertWorkItemDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const targetProjectId = dto.project_id ? this.parseBigInt(dto.project_id, 'project id') : null;
    let parentId: string | null = this.optionalString(dto.parent_id);
    let sprintId: bigint | null = dto.sprint_id ? this.parseBigInt(dto.sprint_id, 'sprint id') : null;
    if (id) {
      const existing = await this.drizzle.workItem.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Work item not found');
      if (![existing.createdById?.toString(), existing.assignedById?.toString(), existing.assignedToId?.toString()].includes(userId.toString())) {
        throw new BadRequestException('You cannot update this work item');
      }
      if (parentId === id) throw new BadRequestException('A work item cannot be its own parent');
      const projectId = targetProjectId ?? existing.projectId ?? null;
      await this.validateItemLinks(parentId, sprintId, projectId);
      await this.drizzle.workItem.update({
        where: { id },
        data: this.mapItemDto(dto, userId, existing) as Drizzle.WorkItemUncheckedUpdateInput
      });
      return this.getItem(id);
    }

    const projectId = targetProjectId ?? null;
    await this.validateItemLinks(parentId, sprintId, projectId);
    const created = await this.drizzle.workItem.create({
      data: this.mapItemDto(dto, userId) as Drizzle.WorkItemUncheckedCreateInput
    });
    return this.getItem(created.id);
  }

  private async validateItemLinks(parentId: string | null, sprintId: bigint | null, projectId: bigint | null) {
    if (parentId) {
      const parent = await this.drizzle.workItem.findUnique({
        where: { id: parentId },
        select: { id: true, projectId: true }
      });
      if (!parent) throw new BadRequestException('Parent work item not found');
      if (projectId != null && parent.projectId != null && projectId !== parent.projectId) {
        throw new BadRequestException('Parent work item belongs to a different project');
      }
    }
    if (sprintId != null) {
      const sprint = await this.drizzle.sprint.findUnique({ where: { id: sprintId } });
      if (!sprint) throw new BadRequestException('Sprint not found');
      if (projectId != null && sprint.projectId !== projectId) {
        throw new BadRequestException('Sprint belongs to a different project');
      }
    }
  }

  async getItem(id: string) {
    const row = await this.drizzle.workItem.findUnique({
      where: { id },
      include: this.workItemInclude()
    });
    if (!row) throw new NotFoundException('Work item not found');
    const enriched = await this.enrichItems([row]);
    return this.serializeWorkItem(enriched[0]);
  }

  async board(actorId: string, query: Record<string, any>) {
    const where: Drizzle.WorkItemWhereInput = {};
    if (query.project_id) where.projectId = this.parseBigInt(String(query.project_id), 'project id');
    if (query.sprint_id) where.sprintId = this.parseBigInt(String(query.sprint_id), 'sprint id');
    if (query.assigned_to_id) where.assignedToId = this.parseBigInt(String(query.assigned_to_id), 'assigned to id');
    if (query.status) where.status = query.status;
    const rows = await this.drizzle.workItem.findMany({
      where,
      include: this.workItemInclude(),
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]
    });
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
    const where: Drizzle.SprintWhereInput = {};
    if (query.project_id) where.projectId = this.parseBigInt(String(query.project_id), 'project id');
    if (query.status) where.status = String(query.status);
    if (query.is_active != null) where.isActive = query.is_active === 'true' || query.is_active === true;
    const rows = await this.drizzle.sprint.findMany({
      where,
      include: this.sprintInclude(),
      orderBy: [{ createdAt: 'desc' }]
    });
    const enriched = await this.enrichSprints(rows);
    const items = enriched.map((row) => this.serializeSprint(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getSprint(id: string) {
    const row = await this.drizzle.sprint.findUnique({
      where: { id },
      include: this.sprintInclude()
    });
    if (!row) throw new NotFoundException('Sprint not found');
    const enriched = await this.enrichSprints([row]);
    const items = await this.drizzle.workItem.findMany({
      where: { sprintId: row.id },
      include: this.workItemInclude(),
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]
    });
    const enrichedItems = await this.enrichItems(items);
    enriched[0].items = enrichedItems.map((item) => this.serializeWorkItem(item));
    return this.serializeSprint(enriched[0]);
  }

  async upsertSprint(actorId: string, dto: UpsertSprintDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    let projectId: bigint | null = null;
    if (dto.project_id) {
      projectId = this.parseBigInt(dto.project_id, 'project id');
      const projectRow = await this.drizzle.project.findUnique({
        where: { id: projectId },
        select: { id: true }
      });
      if (!projectRow) throw new BadRequestException('Project not found');
    }
    if (id) {
      const existing = await this.drizzle.sprint.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Sprint not found');
      if (projectId == null) projectId = existing.projectId;
      const data: Drizzle.SprintUncheckedUpdateInput = {
        projectId,
        name: dto.name ?? existing.name,
        goal: dto.goal != null ? dto.goal : existing.goal,
        startDate: dto.start_date ? new Date(dto.start_date) : existing.startDate,
        endDate: dto.end_date ? new Date(dto.end_date) : existing.endDate,
        isActive: dto.is_active ?? existing.isActive
      };
      await this.drizzle.sprint.update({ where: { id }, data });
      return this.getSprint(id);
    }
    if (projectId == null) throw new BadRequestException('project_id is required');
    const data: Drizzle.SprintUncheckedCreateInput = {
      projectId,
      name: dto.name,
      goal: dto.goal ?? null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
      status: dto.status ?? 'planned',
      isActive: dto.is_active ?? true,
      createdBy: userId
    };
    const row = await this.drizzle.sprint.create({ data });
    return this.getSprint(row.id.toString());
  }

  async startSprint(actorId: string, id: string) {
    const existing = await this.drizzle.sprint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sprint not found');
    await this.drizzle.sprint.updateMany({
      where: { projectId: existing.projectId, isActive: true },
      data: { isActive: false }
    });
    await this.drizzle.sprint.update({
      where: { id },
      data: { status: 'active', isActive: true }
    });
    return this.getSprint(id);
  }

  async completeSprint(actorId: string, id: string) {
    const existing = await this.drizzle.sprint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sprint not found');
    await this.drizzle.sprint.update({
      where: { id },
      data: { status: 'completed', isActive: false }
    });
    await this.drizzle.workItem.updateMany({
      where: {
        sprintId: existing.id,
        status: { notIn: ['completed', 'cancelled'] } as any
      },
      data: { sprintId: null }
    });
    return this.getSprint(id);
  }

  async listMyLogs(actorId: string, query: Record<string, any>) {
    const userId = this.parseBigInt(actorId, 'user id');
    const where: Drizzle.WorkLogWhereInput = { staffId: userId };
    if (query.approval_status) where.approvalStatus = query.approval_status;
    if (query.from || query.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(String(query.from));
      if (query.to) where.logDate.lte = new Date(String(query.to));
    }
    const rows = await this.drizzle.workLog.findMany({
      where,
      include: this.workLogInclude(),
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamLogs(actorId: string, query: Record<string, any>) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const reportIds = (await this.drizzle.employeeProfile.findMany({
      where: { managerUserId: managerId },
      select: { userId: true }
    })).map((row) => row.userId);

    const where: Drizzle.WorkLogWhereInput = {
      OR: [
        { workItem: { assignedById: managerId } },
        reportIds.length ? { staffId: { in: reportIds } } : undefined
      ].filter(Boolean) as Drizzle.WorkLogWhereInput[]
    };
    if (query.approval_status) where.approvalStatus = query.approval_status;
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.staff_id) where.staffId = this.parseBigInt(String(query.staff_id), 'staff id');
    if (query.week_start_date) {
      const weekStart = new Date(String(query.week_start_date));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      where.logDate = { gte: weekStart, lte: weekEnd };
    }
    const rows = await this.drizzle.workLog.findMany({
      where,
      include: this.workLogInclude(),
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertLog(actorId: string, dto: UpsertWorkLogDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const workItem = await this.drizzle.workItem.findUnique({ where: { id: dto.work_item_id } });
    if (!workItem) throw new NotFoundException('Work item not found');

    if (id) {
      const existing = await this.drizzle.workLog.findUnique({ where: { id } });
      if (!existing || existing.staffId !== userId) throw new NotFoundException('Work log not found');
      if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be edited');
      await this.drizzle.workLog.update({
        where: { id },
        data: this.mapLogDto(dto, userId, workItem, existing) as Drizzle.WorkLogUncheckedUpdateInput
      });
      return this.getLog(id);
    }

    const created = await this.drizzle.workLog.create({
      data: this.mapLogDto(dto, userId, workItem) as Drizzle.WorkLogUncheckedCreateInput
    });
    return this.getLog(created.id);
  }

  async getLog(id: string) {
    const row = await this.drizzle.workLog.findUnique({ where: { id }, include: this.workLogInclude() });
    if (!row) throw new NotFoundException('Work log not found');
    return this.serializeWorkLog(row);
  }

  async submitLog(actorId: string, id: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const existing = await this.drizzle.workLog.findUnique({ where: { id } });
    if (!existing || existing.staffId !== userId) throw new NotFoundException('Work log not found');
    if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be submitted');
    await this.drizzle.workLog.update({
      where: { id },
      data: { approvalStatus: WorkLogApprovalStatus.submitted }
    });
    await this.syncWorkLogToProjectTimesheet(id, 'submitted');
    return this.getLog(id);
  }

  async approveLog(actorId: string, id: string, approve: boolean) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const row = await this.drizzle.workLog.findUnique({ where: { id }, include: { workItem: true } });
    if (!row) throw new NotFoundException('Work log not found');
    const staff = await this.drizzle.profile.findUnique({
      where: { id: row.staffId },
      include: { employeeProfile: true }
    });
    const managerUserId = staff?.employeeProfile?.managerUserId?.toString();
    if (row.staffId !== managerId && managerUserId !== managerId.toString()) {
      if (row.workItem?.assignedById !== managerId && row.workItem?.createdById !== managerId) {
        throw new BadRequestException('You cannot review this work log');
      }
    }
    await this.drizzle.workLog.update({
      where: { id },
      data: {
        approvalStatus: approve ? WorkLogApprovalStatus.approved : WorkLogApprovalStatus.rejected,
        approvedById: managerId,
        approvedAt: approve ? new Date() : null
      }
    });
    await this.syncWorkLogToProjectTimesheet(id, approve ? 'approved' : 'rejected', managerId);
    return this.getLog(id);
  }

  async myTimesheetSummary(actorId: string, query: Record<string, any>) {
    const userId = this.parseBigInt(actorId, 'user id');
    const where: Drizzle.WorkLogWhereInput = {
      staffId: userId,
      approvalStatus: { in: [WorkLogApprovalStatus.submitted, WorkLogApprovalStatus.approved] }
    };
    if (query.from || query.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(String(query.from));
      if (query.to) where.logDate.lte = new Date(String(query.to));
    }
    const rows = await this.drizzle.workLog.findMany({
      where,
      include: {
        organization: true,
        team: true,
project: true,
      sprint: true,
      fund: true,
        grant: true,
        workItem: true
      },
      orderBy: { logDate: 'asc' }
    });
    const summary = new Map<string, any>();
    for (const row of rows) {
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

  private mapItemDto(dto: UpsertWorkItemDto, actorId: bigint, existing?: any): Drizzle.WorkItemUncheckedCreateInput | Drizzle.WorkItemUncheckedUpdateInput {
    return {
      title: dto.title ?? existing?.title,
      description: dto.description ?? existing?.description ?? null,
      itemType: (dto.item_type as any) ?? existing?.itemType ?? 'weekly_task',
      status: (dto.status as any) ?? existing?.status ?? 'planned',
      priority: (dto.priority as any) ?? existing?.priority ?? 'medium',
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id') ?? existing?.organizationId ?? null,
      ownerTeamId: this.optionalBigInt(dto.owner_team_id, 'owner team id') ?? existing?.ownerTeamId ?? null,
      secondaryTeamId: this.optionalBigInt(dto.secondary_team_id, 'secondary team id') ?? existing?.secondaryTeamId ?? null,
      projectId: this.optionalBigInt(dto.project_id, 'project id') ?? existing?.projectId ?? null,
      sprintId: this.optionalBigInt(dto.sprint_id, 'sprint id') ?? existing?.sprintId ?? null,
      parentId: this.optionalString(dto.parent_id) ?? existing?.parentId ?? null,
      estimatePoints: dto.estimate_points != null ? Number(dto.estimate_points) : existing?.estimatePoints ?? null,
      sortOrder: dto.sort_order != null ? Number(dto.sort_order) : existing?.sortOrder ?? 0,
      fundId: this.optionalString(dto.fund_id) ?? existing?.fundId ?? null,
      grantId: this.optionalString(dto.grant_id) ?? existing?.grantId ?? null,
      goalId: this.optionalString(dto.goal_id) ?? existing?.goalId ?? null,
      objectiveId: this.optionalString(dto.objective_id) ?? existing?.objectiveId ?? null,
      kpiId: this.optionalString(dto.kpi_id) ?? existing?.kpiId ?? null,
      assignedToId: this.optionalBigInt(dto.assigned_to_id, 'assigned to id') ?? existing?.assignedToId ?? actorId,
      assignedById: existing?.assignedById ?? actorId,
      createdById: existing?.createdById ?? actorId,
      plannedStartDate: dto.planned_start_date ? new Date(dto.planned_start_date) : existing?.plannedStartDate ?? null,
      dueDate: dto.due_date ? new Date(dto.due_date) : existing?.dueDate ?? null,
      weekStartDate: dto.week_start_date ? new Date(dto.week_start_date) : existing?.weekStartDate ?? null,
      expectedHours: dto.expected_hours != null ? new Drizzle.Decimal(dto.expected_hours) : existing?.expectedHours ?? null,
      isStaffAdded: dto.is_staff_added ?? existing?.isStaffAdded ?? false,
      requiresManagerAck: dto.requires_manager_ack ?? existing?.requiresManagerAck ?? false
    };
  }

  private mapLogDto(dto: UpsertWorkLogDto, actorId: bigint, item: any, existing?: any): Drizzle.WorkLogUncheckedCreateInput | Drizzle.WorkLogUncheckedUpdateInput {
    return {
      workItemId: item.id,
      staffId: existing?.staffId ?? actorId,
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id') ?? existing?.organizationId ?? item.organizationId ?? null,
      teamId: this.optionalBigInt(dto.team_id, 'team id') ?? existing?.teamId ?? item.ownerTeamId ?? null,
      projectId: this.optionalBigInt(dto.project_id, 'project id') ?? existing?.projectId ?? item.projectId ?? null,
      fundId: this.optionalString(dto.fund_id) ?? existing?.fundId ?? item.fundId ?? null,
      grantId: this.optionalString(dto.grant_id) ?? existing?.grantId ?? item.grantId ?? null,
      logDate: new Date(dto.log_date),
      hoursSpent: new Drizzle.Decimal(dto.hours_spent ?? 0),
      status: (dto.status as any) ?? existing?.status ?? WorkItemStatus.in_progress,
      progressPercent: dto.progress_percent != null ? new Drizzle.Decimal(dto.progress_percent) : existing?.progressPercent ?? null,
      note: dto.note ?? existing?.note ?? null,
      blockerNote: dto.blocker_note ?? existing?.blockerNote ?? null,
      carriedOver: dto.carried_over ?? existing?.carriedOver ?? false,
      carryOverToDate: dto.carry_over_to_date ? new Date(dto.carry_over_to_date) : existing?.carryOverToDate ?? null,
      approvalStatus: existing?.approvalStatus ?? WorkLogApprovalStatus.draft,
      approvedById: existing?.approvedById ?? null,
      approvedAt: existing?.approvedAt ?? null
    };
  }

  private workItemInclude() {
    return {
      organization: true,
      ownerTeam: true,
      secondaryTeam: true,
      project: true,
      fund: true,
      grant: true,
      goal: true,
      objective: true,
      kpi: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      logs: { orderBy: { logDate: 'desc' }, take: 5 }
    } satisfies Drizzle.WorkItemInclude;
  }

  private workLogInclude() {
    return {
      workItem: true,
      organization: true,
      team: true,
      project: true,
      fund: true,
      grant: true,
      staff: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
    } satisfies Drizzle.WorkLogInclude;
  }

  private serializeWorkItem(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      item_type: row.itemType,
      status: row.status,
      priority: row.priority,
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
      assigned_to: row.assignedTo ? this.serializeProfile(row.assignedTo) : null,
      assigned_by: row.assignedBy ? this.serializeProfile(row.assignedBy) : null,
      created_by: row.createdBy ? this.serializeProfile(row.createdBy) : null,
      parent: row.parent ? this.serializeWorkItemRef(row.parent) : null,
      subtasks: (row.subtasks || []).map((child: any) => this.serializeWorkItemRef(child)),
      sprint: row.sprint ? this.serializeSprintRef(row.sprint) : null,
      recent_logs: (row.logs || []).map((log: any) => ({
        id: log.id,
        log_date: log.logDate,
        hours_spent: Number(log.hoursSpent || 0),
        status: log.status,
        approval_status: log.approvalStatus,
        note: log.note || ''
      })),
      created_at: row.createdAt,
      updated_at: row.updatedAt
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
      staff: row.staff ? this.serializeProfile(row.staff) : null,
      approved_by: row.approvedBy ? this.serializeProfile(row.approvedBy) : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private serializeProfile(row: any) {
    return {
      id: row.id.toString(),
      full_name: [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email,
      email: row.email
    };
  }

  private async enrichItems(rows: any[]) {
    if (!rows.length) return rows;
    const ids = rows.map((row) => row.id);
    const parentIds = [...new Set(rows.map((row) => row.parentId).filter(Boolean))] as string[];
    const [parents, subtasks] = await Promise.all([
      parentIds.length
        ? this.drizzle.workItem.findMany({ where: { id: { in: parentIds } } })
        : Promise.resolve([]),
      this.drizzle.workItem.findMany({ where: { parentId: { in: ids } } })
    ]);
    const parentMap = new Map(parents.map((parent) => [parent.id, parent]));
    const subtaskMap = new Map<string, any[]>();
    for (const child of subtasks) {
      const list = subtaskMap.get(child.parentId) ?? [];
      list.push(child);
      subtaskMap.set(child.parentId, list);
    }
    return rows.map((row) => ({
      ...row,
      parent: row.parentId ? (parentMap.get(row.parentId) ?? null) : null,
      subtasks: subtaskMap.get(row.id) ?? []
    }));
  }

  private async enrichSprints(rows: any[]) {
    if (!rows.length) return rows;
    const createdByIds = [...new Set(rows.map((row) => row.createdBy).filter(Boolean))] as bigint[];
    const creators = createdByIds.length
      ? await this.drizzle.profile.findMany({
          where: { id: { in: createdByIds } },
          select: { id: true, firstName: true, lastName: true, email: true }
        })
      : [];
    const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
    return rows.map((row) => ({ ...row, creator: row.createdBy ? (creatorMap.get(row.createdBy) ?? null) : null }));
  }

  private sprintInclude() {
    return {
      project: { select: { id: true, name: true } }
    } satisfies Drizzle.SprintInclude;
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
      created_by: row.creator ? this.serializeProfile(row.creator) : null,
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
      owner: row.owner ? this.serializeProfile(row.owner) : null,
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
      owner: row.owner ? this.serializeProfile(row.owner) : null,
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
      owner: row.owner ? this.serializeProfile(row.owner) : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private parseBigInt(value: string, label: string) {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private optionalString(value?: string | null) {
    if (value == null) return null;
    const next = String(value).trim();
    return next.length ? next : null;
  }

  private optionalBigInt(value: string | null | undefined, label: string) {
    const next = this.optionalString(value);
    return next ? this.parseBigInt(next, label) : null;
  }

  private async syncWorkLogToProjectTimesheet(workLogId: string, status: 'submitted' | 'approved' | 'rejected', actorId?: bigint) {
    const log = await this.drizzle.workLog.findUnique({
      where: { id: workLogId },
      include: {
        workItem: true,
        projectTimesheet: true,
        staff: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
    if (!log) return null;

    const payrollWorker = await this.drizzle.payrollWorker.findFirst({
      where: { profileId: log.staffId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!payrollWorker) return null;

    const payload: Drizzle.ProjectTimesheetEntryUncheckedCreateInput = {
      sourceWorkLogId: log.id,
      workerId: payrollWorker.id,
      organizationId: log.organizationId ?? log.workItem.organizationId ?? payrollWorker.organizationId ?? null,
      teamId: log.teamId ?? log.workItem.ownerTeamId ?? payrollWorker.teamId ?? null,
      projectId: log.projectId ?? log.workItem.projectId ?? payrollWorker.projectId ?? null,
      fundId: log.fundId ?? log.workItem.fundId ?? payrollWorker.defaultFundId ?? null,
      grantId: log.grantId ?? log.workItem.grantId ?? payrollWorker.defaultGrantId ?? null,
      workDate: log.logDate,
      hours: log.hoursSpent,
      description: log.note || log.workItem.title,
      status,
      approvedBy: status === 'approved' ? actorId ?? null : null,
      approvedAt: status === 'approved' ? new Date() : null,
      createdBy: log.staffId
    };

    const entry = log.projectTimesheet
      ? await this.drizzle.projectTimesheetEntry.update({
          where: { id: log.projectTimesheet.id },
          data: {
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
          }
        })
      : await this.drizzle.projectTimesheetEntry.create({ data: payload });

    await this.syncProjectTimesheetWorkerMonthToPayroll(payrollWorker.id, log.logDate);
    return entry;
  }

  private async syncProjectTimesheetWorkerMonthToPayroll(workerId: string, workDate: Date) {
    const month = workDate.getUTCMonth() + 1;
    const year = workDate.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const run = await this.drizzle.payrollRun.findFirst({ where: { year, month } });
    if (!run) return null;

    const approvedRows = await this.drizzle.projectTimesheetEntry.findMany({
      where: {
        workerId,
        status: 'approved',
        workDate: { gte: periodStart, lte: periodEnd }
      },
      orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }]
    });

    const totalHours = approvedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    await this.drizzle.$transaction(async (tx) => {
      await tx.payrollRunTimesheetAllocation.deleteMany({ where: { runId: run.id, workerId } });
      if (approvedRows.length) {
        await tx.payrollRunTimesheetAllocation.createMany({
          data: approvedRows.map((row, index) => ({
            runId: run.id,
            workerId,
            organizationId: row.organizationId,
            teamId: row.teamId,
            projectId: row.projectId,
            fundId: row.fundId,
            grantId: row.grantId,
            hours: row.hours,
            allocationPercent: totalHours > 0 ? (Number(row.hours || 0) / totalHours) * 100 : 0,
            source: 'timesheet',
            notes: row.description,
            sortOrder: index,
            approvedAt: row.approvedAt ?? new Date()
          }))
        });
      }
      await tx.projectTimesheetEntry.updateMany({
        where: { id: { in: approvedRows.map((row) => row.id) } },
        data: { syncedRunId: run.id }
      });
    });
    return run.id;
  }
}
