import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkLogApprovalStatus, WorkItemStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { toBigInt } from '../../common/utils/ids';
import { UpsertTeamGoalDto, UpsertTeamKpiDto, UpsertTeamObjectiveDto } from './dto/upsert-team-goal.dto';
import { UpsertWorkItemDto } from './dto/upsert-work-item.dto';
import { UpsertWorkLogDto } from './dto/upsert-work-log.dto';

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService) {}

  async listGoals(query: Record<string, any>) {
    const where: Prisma.TeamGoalWhereInput = {};
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.organization_id) where.organizationId = this.parseBigInt(String(query.organization_id), 'organization id');
    if (query.period_year) where.periodYear = Number(query.period_year);
    const rows = await this.prisma.teamGoal.findMany({
      where,
      include: { organization: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ periodYear: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeGoal(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertGoal(actorId: string, dto: UpsertTeamGoalDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Prisma.TeamGoalUncheckedCreateInput | Prisma.TeamGoalUncheckedUpdateInput = {
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
      weight: dto.weight != null ? new Prisma.Decimal(dto.weight) : null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
    };
    if (id) {
      await this.prisma.teamGoal.update({ where: { id }, data: payload as Prisma.TeamGoalUncheckedUpdateInput });
      return this.getGoal(id);
    }
    const row = await this.prisma.teamGoal.create({ data: payload as Prisma.TeamGoalUncheckedCreateInput });
    return this.getGoal(row.id);
  }

  async getGoal(id: string) {
    const row = await this.prisma.teamGoal.findUnique({
      where: { id },
      include: { organization: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } }, objectives: true, kpis: true }
    });
    if (!row) throw new NotFoundException('Goal not found');
    return this.serializeGoal(row);
  }

  async listObjectives(query: Record<string, any>) {
    const where: Prisma.TeamObjectiveWhereInput = {};
    if (query.goal_id) where.goalId = String(query.goal_id);
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    const rows = await this.prisma.teamObjective.findMany({
      where,
      include: { goal: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeObjective(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertObjective(actorId: string, dto: UpsertTeamObjectiveDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Prisma.TeamObjectiveUncheckedCreateInput | Prisma.TeamObjectiveUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: this.optionalString(dto.goal_id),
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id'),
      teamId: this.optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: this.optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? new Prisma.Decimal(dto.weight) : null,
      dueDate: dto.due_date ? new Date(dto.due_date) : null,
    };
    if (id) {
      await this.prisma.teamObjective.update({ where: { id }, data: payload as Prisma.TeamObjectiveUncheckedUpdateInput });
      return this.getObjective(id);
    }
    const row = await this.prisma.teamObjective.create({ data: payload as Prisma.TeamObjectiveUncheckedCreateInput });
    return this.getObjective(row.id);
  }

  async getObjective(id: string) {
    const row = await this.prisma.teamObjective.findUnique({
      where: { id },
      include: { goal: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } }, kpis: true }
    });
    if (!row) throw new NotFoundException('Objective not found');
    return this.serializeObjective(row);
  }

  async listKpis(query: Record<string, any>) {
    const where: Prisma.TeamKpiWhereInput = {};
    if (query.goal_id) where.goalId = String(query.goal_id);
    if (query.objective_id) where.objectiveId = String(query.objective_id);
    if (query.team_id) where.teamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.period_year) where.periodYear = Number(query.period_year);
    const rows = await this.prisma.teamKpi.findMany({
      where,
      include: { goal: true, objective: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ periodYear: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeKpi(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertKpi(actorId: string, dto: UpsertTeamKpiDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const payload: Prisma.TeamKpiUncheckedCreateInput | Prisma.TeamKpiUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description ?? null,
      goalId: this.optionalString(dto.goal_id),
      objectiveId: this.optionalString(dto.objective_id),
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id'),
      teamId: this.optionalBigInt(dto.team_id, 'team id'),
      ownerUserId: this.optionalBigInt(dto.owner_user_id, 'owner user id') ?? userId,
      createdById: userId,
      targetType: dto.target_type ?? null,
      targetValue: dto.target_value != null ? new Prisma.Decimal(dto.target_value) : null,
      unitLabel: dto.unit_label ?? null,
      periodYear: dto.period_year ?? null,
      quarter: dto.quarter ?? null,
      status: dto.status ?? 'draft',
      weight: dto.weight != null ? new Prisma.Decimal(dto.weight) : null,
    };
    if (id) {
      await this.prisma.teamKpi.update({ where: { id }, data: payload as Prisma.TeamKpiUncheckedUpdateInput });
      return this.getKpi(id);
    }
    const row = await this.prisma.teamKpi.create({ data: payload as Prisma.TeamKpiUncheckedCreateInput });
    return this.getKpi(row.id);
  }

  async getKpi(id: string) {
    const row = await this.prisma.teamKpi.findUnique({
      where: { id },
      include: { goal: true, objective: true, team: true, owner: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    if (!row) throw new NotFoundException('KPI not found');
    return this.serializeKpi(row);
  }

  async listMyItems(actorId: string, query: Record<string, any>) {
    const userId = this.parseBigInt(actorId, 'user id');
    const where: Prisma.WorkItemWhereInput = {
      OR: [{ assignedToId: userId }, { createdById: userId }, { assignedById: userId }]
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.AND = [{
        OR: [
          { title: { contains: String(query.search), mode: 'insensitive' } },
          { description: { contains: String(query.search), mode: 'insensitive' } }
        ]
      }];
    }
    const rows = await this.prisma.workItem.findMany({
      where,
      include: this.workItemInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamItems(actorId: string, query: Record<string, any>) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const directReports = await this.prisma.employeeProfile.findMany({
      where: { managerUserId: managerId },
      select: { userId: true }
    });
    const reportIds = directReports.map((row) => row.userId);
    const primaryTeams = reportIds.length > 0
      ? await this.prisma.groupUser.findMany({
          where: { userId: { in: reportIds }, isPrimary: true },
          select: { groupId: true }
        })
      : [];
    const teamIds = [...new Set(primaryTeams.map((row) => row.groupId))] as bigint[];
    const where: Prisma.WorkItemWhereInput = {
      OR: [
        { assignedById: managerId },
        reportIds.length ? { assignedToId: { in: reportIds } } : undefined,
        teamIds.length ? { ownerTeamId: { in: teamIds } } : undefined
      ].filter(Boolean) as Prisma.WorkItemWhereInput[]
    };
    if (query.week_start_date) where.weekStartDate = new Date(String(query.week_start_date));
    if (query.team_id) where.ownerTeamId = this.parseBigInt(String(query.team_id), 'team id');
    if (query.assigned_to_id) where.assignedToId = this.parseBigInt(String(query.assigned_to_id), 'assigned to id');
    if (query.status) where.status = query.status;
    const rows = await this.prisma.workItem.findMany({
      where,
      include: this.workItemInclude(),
      orderBy: [{ weekStartDate: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkItem(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertItem(actorId: string, dto: UpsertWorkItemDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    if (id) {
      const existing = await this.prisma.workItem.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Work item not found');
      if (![existing.createdById?.toString(), existing.assignedById?.toString(), existing.assignedToId?.toString()].includes(userId.toString())) {
        throw new BadRequestException('You cannot update this work item');
      }
      await this.prisma.workItem.update({
        where: { id },
        data: this.mapItemDto(dto, userId, existing) as Prisma.WorkItemUncheckedUpdateInput
      });
      return this.getItem(id);
    }

    const created = await this.prisma.workItem.create({
      data: this.mapItemDto(dto, userId) as Prisma.WorkItemUncheckedCreateInput
    });
    return this.getItem(created.id);
  }

  async getItem(id: string) {
    const row = await this.prisma.workItem.findUnique({
      where: { id },
      include: this.workItemInclude()
    });
    if (!row) throw new NotFoundException('Work item not found');
    return this.serializeWorkItem(row);
  }

  async listMyLogs(actorId: string, query: Record<string, any>) {
    const userId = this.parseBigInt(actorId, 'user id');
    const where: Prisma.WorkLogWhereInput = { staffId: userId };
    if (query.approval_status) where.approvalStatus = query.approval_status;
    if (query.from || query.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(String(query.from));
      if (query.to) where.logDate.lte = new Date(String(query.to));
    }
    const rows = await this.prisma.workLog.findMany({
      where,
      include: this.workLogInclude(),
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async listTeamLogs(actorId: string, query: Record<string, any>) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const reportIds = (await this.prisma.employeeProfile.findMany({
      where: { managerUserId: managerId },
      select: { userId: true }
    })).map((row) => row.userId);

    const where: Prisma.WorkLogWhereInput = {
      OR: [
        { workItem: { assignedById: managerId } },
        reportIds.length ? { staffId: { in: reportIds } } : undefined
      ].filter(Boolean) as Prisma.WorkLogWhereInput[]
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
    const rows = await this.prisma.workLog.findMany({
      where,
      include: this.workLogInclude(),
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeWorkLog(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertLog(actorId: string, dto: UpsertWorkLogDto, id?: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const workItem = await this.prisma.workItem.findUnique({ where: { id: dto.work_item_id } });
    if (!workItem) throw new NotFoundException('Work item not found');

    if (id) {
      const existing = await this.prisma.workLog.findUnique({ where: { id } });
      if (!existing || existing.staffId !== userId) throw new NotFoundException('Work log not found');
      if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be edited');
      await this.prisma.workLog.update({
        where: { id },
        data: this.mapLogDto(dto, userId, workItem, existing) as Prisma.WorkLogUncheckedUpdateInput
      });
      return this.getLog(id);
    }

    const created = await this.prisma.workLog.create({
      data: this.mapLogDto(dto, userId, workItem) as Prisma.WorkLogUncheckedCreateInput
    });
    return this.getLog(created.id);
  }

  async getLog(id: string) {
    const row = await this.prisma.workLog.findUnique({ where: { id }, include: this.workLogInclude() });
    if (!row) throw new NotFoundException('Work log not found');
    return this.serializeWorkLog(row);
  }

  async submitLog(actorId: string, id: string) {
    const userId = this.parseBigInt(actorId, 'user id');
    const existing = await this.prisma.workLog.findUnique({ where: { id } });
    if (!existing || existing.staffId !== userId) throw new NotFoundException('Work log not found');
    if (!['draft', 'rejected'].includes(existing.approvalStatus)) throw new BadRequestException('Only draft or rejected logs can be submitted');
    await this.prisma.workLog.update({
      where: { id },
      data: { approvalStatus: WorkLogApprovalStatus.submitted }
    });
    await this.syncWorkLogToProjectTimesheet(id, 'submitted');
    return this.getLog(id);
  }

  async approveLog(actorId: string, id: string, approve: boolean) {
    const managerId = this.parseBigInt(actorId, 'user id');
    const row = await this.prisma.workLog.findUnique({ where: { id }, include: { workItem: true } });
    if (!row) throw new NotFoundException('Work log not found');
    const staff = await this.prisma.profile.findUnique({
      where: { id: row.staffId },
      include: { employeeProfile: true }
    });
    const managerUserId = staff?.employeeProfile?.managerUserId?.toString();
    if (row.staffId !== managerId && managerUserId !== managerId.toString()) {
      if (row.workItem?.assignedById !== managerId && row.workItem?.createdById !== managerId) {
        throw new BadRequestException('You cannot review this work log');
      }
    }
    await this.prisma.workLog.update({
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
    const where: Prisma.WorkLogWhereInput = {
      staffId: userId,
      approvalStatus: { in: [WorkLogApprovalStatus.submitted, WorkLogApprovalStatus.approved] }
    };
    if (query.from || query.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(String(query.from));
      if (query.to) where.logDate.lte = new Date(String(query.to));
    }
    const rows = await this.prisma.workLog.findMany({
      where,
      include: {
        organization: true,
        team: true,
        project: true,
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

  private mapItemDto(dto: UpsertWorkItemDto, actorId: bigint, existing?: any): Prisma.WorkItemUncheckedCreateInput | Prisma.WorkItemUncheckedUpdateInput {
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
      expectedHours: dto.expected_hours != null ? new Prisma.Decimal(dto.expected_hours) : existing?.expectedHours ?? null,
      isStaffAdded: dto.is_staff_added ?? existing?.isStaffAdded ?? false,
      requiresManagerAck: dto.requires_manager_ack ?? existing?.requiresManagerAck ?? false
    };
  }

  private mapLogDto(dto: UpsertWorkLogDto, actorId: bigint, item: any, existing?: any): Prisma.WorkLogUncheckedCreateInput | Prisma.WorkLogUncheckedUpdateInput {
    return {
      workItemId: item.id,
      staffId: existing?.staffId ?? actorId,
      organizationId: this.optionalBigInt(dto.organization_id, 'organization id') ?? existing?.organizationId ?? item.organizationId ?? null,
      teamId: this.optionalBigInt(dto.team_id, 'team id') ?? existing?.teamId ?? item.ownerTeamId ?? null,
      projectId: this.optionalBigInt(dto.project_id, 'project id') ?? existing?.projectId ?? item.projectId ?? null,
      fundId: this.optionalString(dto.fund_id) ?? existing?.fundId ?? item.fundId ?? null,
      grantId: this.optionalString(dto.grant_id) ?? existing?.grantId ?? item.grantId ?? null,
      logDate: new Date(dto.log_date),
      hoursSpent: new Prisma.Decimal(dto.hours_spent ?? 0),
      status: (dto.status as any) ?? existing?.status ?? WorkItemStatus.in_progress,
      progressPercent: dto.progress_percent != null ? new Prisma.Decimal(dto.progress_percent) : existing?.progressPercent ?? null,
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
    } satisfies Prisma.WorkItemInclude;
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
    } satisfies Prisma.WorkLogInclude;
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
    const log = await this.prisma.workLog.findUnique({
      where: { id: workLogId },
      include: {
        workItem: true,
        projectTimesheet: true,
        staff: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
    if (!log) return null;

    const payrollWorker = await this.prisma.payrollWorker.findFirst({
      where: { profileId: log.staffId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!payrollWorker) return null;

    const payload: Prisma.ProjectTimesheetEntryUncheckedCreateInput = {
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
      ? await this.prisma.projectTimesheetEntry.update({
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
      : await this.prisma.projectTimesheetEntry.create({ data: payload });

    await this.syncProjectTimesheetWorkerMonthToPayroll(payrollWorker.id, log.logDate);
    return entry;
  }

  private async syncProjectTimesheetWorkerMonthToPayroll(workerId: string, workDate: Date) {
    const month = workDate.getUTCMonth() + 1;
    const year = workDate.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const run = await this.prisma.payrollRun.findFirst({ where: { year, month } });
    if (!run) return null;

    const approvedRows = await this.prisma.projectTimesheetEntry.findMany({
      where: {
        workerId,
        status: 'approved',
        workDate: { gte: periodStart, lte: periodEnd }
      },
      orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }]
    });

    const totalHours = approvedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    await this.prisma.$transaction(async (tx) => {
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
