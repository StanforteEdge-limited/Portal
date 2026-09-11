import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '$common/auth/tenant-context';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';

@Injectable()
export class LeaveService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly notifications: NotificationsService,
  ) {}

  listTypes() {
    return this.drizzle.leaveType.findMany({ where: { isActive: 1 }, orderBy: { name: 'asc' } });
  }

  async createType(context: TenantContext, dto: CreateLeaveTypeDto) {
    this.requireManager(context);
    return this.drizzle.leaveType.create({
      data: {
        tenantId: context.tenantId,
        code: dto.code.trim().toLowerCase(),
        name: dto.name.trim(),
        annualEntitlementDays: dto.annual_entitlement_days,
        metadata: dto.metadata ? JSON.parse(dto.metadata) as Drizzle.InputJsonValue : undefined,
      },
    });
  }

  async createRequest(context: TenantContext, dto: CreateLeaveRequestDto) {
    const leaveType = await this.drizzle.leaveType.findFirst({
      where: { id: dto.leave_type_id, isActive: 1 },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    const start = this.parseDate(dto.start_date);
    const end = this.parseDate(dto.end_date);
    if (end < start) throw new BadRequestException('Leave end date must not be before start date');
    const days = this.businessDays(start, end);
    if (days < 1) throw new BadRequestException('Leave must include at least one working day');
    const overlap = await this.drizzle.leaveRequest.findFirst({
      where: {
        tenantId: context.tenantId,
        userId: context.profileId,
        status: { in: ['pending', 'approved'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) throw new BadRequestException('Leave dates overlap an existing request');
    return this.drizzle.leaveRequest.create({
      data: {
        tenantId: context.tenantId,
        userId: context.profileId,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason.trim(),
      },
    });
  }

  listMine(context: TenantContext, status?: string) {
    return this.drizzle.leaveRequest.findMany({
      where: { tenantId: context.tenantId, userId: context.profileId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { leaveType: true },
    });
  }

  listForReview(context: TenantContext, status = 'pending') {
    this.requireManager(context);
    return this.drizzle.leaveRequest.findMany({
      where: { tenantId: context.tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { leaveType: true },
    });
  }

  async review(context: TenantContext, id: string, dto: ReviewLeaveRequestDto) {
    this.requireManager(context);
    const request = await this.drizzle.leaveRequest.findFirst({
      where: { id, tenantId: context.tenantId, status: 'pending' },
      include: { leaveType: true },
    });
    if (!request) throw new NotFoundException('Pending leave request not found');
    const updated = await this.drizzle.leaveRequest.update({
      where: { id: request.id },
      data: { status: dto.status, reviewedBy: context.profileId, reviewedAt: new Date(), reviewNotes: dto.notes },
    });
    await this.notifications.create({
      userId: request.userId,
      type: 'leave',
      title: `Leave request ${dto.status}`,
      message: dto.notes ?? `Your leave request has been ${dto.status}.`,
      sentVia: ['in-app', 'email'],
      notifiableType: 'leave_request',
      emailThreadKey: `leave_request-${request.id}`,
    });
    return updated;
  }

  async balance(context: TenantContext, leaveTypeId?: string, year = new Date().getFullYear()) {
    const rows = await this.drizzle.leaveBalanceLedger.findMany({
      where: { tenantId: context.tenantId, userId: context.profileId, periodYear: year, ...(leaveTypeId ? { leaveTypeKey: leaveTypeId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.reduce<Record<string, number>>((result, row) => {
      result[row.leaveTypeKey] = (result[row.leaveTypeKey] ?? 0) + Number(row.deltaDays);
      return result;
    }, {});
  }

  private requireManager(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can manage leave');
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid leave date');
    return date;
  }

  private businessDays(start: Date, end: Date) {
    let total = 0;
    for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
      const day = date.getUTCDay();
      if (day !== 0 && day !== 6) total += 1;
    }
    return total;
  }
}
