import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, SQL } from 'drizzle-orm';
import { TenantContext } from '$common/auth/tenant-context';
import { DbService } from '$common/db/db.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { leaveBalanceLedger } from '$modules/hr/hr/model';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { leaveRequest, leaveType } from './model';

@Injectable()
export class LeaveService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

listTypes(context: TenantContext) {
    return this.db.client
      .select()
      .from(leaveType)
      .where(and(
        eq(leaveType.isActive, 1),
        or(eq(leaveType.tenantId, context.tenantId), isNull(leaveType.tenantId)),
      ))
      .orderBy(asc(leaveType.name));
  }

  async createType(context: TenantContext, dto: CreateLeaveTypeDto) {
    this.requireManager(context);
    const [created] = await this.db.client
      .insert(leaveType)
      .values({
        tenantId: context.tenantId,
        code: dto.code.trim().toLowerCase(),
        name: dto.name.trim(),
        annualEntitlementDays: dto.annual_entitlement_days,
        metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
      })
      .returning();
    return created;
  }

  async createRequest(context: TenantContext, dto: CreateLeaveRequestDto) {
const [type] = await this.db.client
      .select()
      .from(leaveType)
      .where(and(
        eq(leaveType.id, dto.leave_type_id),
        eq(leaveType.isActive, 1),
        or(eq(leaveType.tenantId, context.tenantId), isNull(leaveType.tenantId)),
      ))
      .limit(1);
    if (!type) throw new NotFoundException('Leave type not found');
    const start = this.parseDate(dto.start_date);
    const end = this.parseDate(dto.end_date);
    if (end < start) throw new BadRequestException('Leave end date must not be before start date');
    const days = this.businessDays(start, end);
    if (days < 1) throw new BadRequestException('Leave must include at least one working day');
    const [overlap] = await this.db.client
      .select({ id: leaveRequest.id })
      .from(leaveRequest)
      .where(and(
        eq(leaveRequest.tenantId, context.tenantId),
        eq(leaveRequest.userId, context.profileId),
        inArray(leaveRequest.status, ['pending', 'approved']),
        lte(leaveRequest.startDate, end),
        gte(leaveRequest.endDate, start),
      ))
      .limit(1);
    if (overlap) throw new BadRequestException('Leave dates overlap an existing request');
    const [created] = await this.db.client
      .insert(leaveRequest)
      .values({
        tenantId: context.tenantId,
        userId: context.profileId,
        leaveTypeId: type.id,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason.trim(),
      })
      .returning();
    return created;
  }

  listMine(context: TenantContext, status?: string) {
    const conditions: SQL[] = [
      eq(leaveRequest.tenantId, context.tenantId),
      eq(leaveRequest.userId, context.profileId),
    ];
    if (status) conditions.push(eq(leaveRequest.status, status));
    return this.listRequestsWithType(conditions, desc(leaveRequest.createdAt));
  }

  listForReview(context: TenantContext, status = 'pending') {
    this.requireManager(context);
    const conditions: SQL[] = [eq(leaveRequest.tenantId, context.tenantId)];
    if (status) conditions.push(eq(leaveRequest.status, status));
    return this.listRequestsWithType(conditions, asc(leaveRequest.createdAt));
  }

  async review(context: TenantContext, id: string, dto: ReviewLeaveRequestDto) {
    this.requireManager(context);
    const [request] = await this.db.client
      .select()
      .from(leaveRequest)
      .where(and(eq(leaveRequest.id, id), eq(leaveRequest.tenantId, context.tenantId), eq(leaveRequest.status, 'pending')))
      .limit(1);
    if (!request) throw new NotFoundException('Pending leave request not found');
    const [updated] = await this.db.client
      .update(leaveRequest)
      .set({ status: dto.status, reviewedBy: context.profileId, reviewedAt: new Date(), reviewNotes: dto.notes })
      .where(eq(leaveRequest.id, request.id))
      .returning();
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
    const conditions: SQL[] = [
      eq(leaveBalanceLedger.tenantId, context.tenantId),
      eq(leaveBalanceLedger.userId, context.profileId),
      eq(leaveBalanceLedger.periodYear, year),
    ];
    if (leaveTypeId) conditions.push(eq(leaveBalanceLedger.leaveTypeKey, leaveTypeId));
    const rows = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(...conditions))
      .orderBy(asc(leaveBalanceLedger.createdAt));
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

  private async listRequestsWithType(conditions: SQL[], orderBy: SQL) {
    const rows = await this.db.client
      .select({ request: leaveRequest, leaveType })
      .from(leaveRequest)
      .leftJoin(leaveType, eq(leaveRequest.leaveTypeId, leaveType.id))
      .where(and(...conditions))
      .orderBy(orderBy);
    return rows.map(({ request, leaveType }) => ({ ...request, leaveType }));
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
