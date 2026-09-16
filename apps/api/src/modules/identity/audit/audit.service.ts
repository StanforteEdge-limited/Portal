import { Injectable, BadRequestException } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, SQL } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import { CreateAuditEventDto } from '$modules/identity/audit/dto/create-audit-event.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { auditEvent } from '$modules/identity/audit/model';
import { emailLog } from '$modules/communication/mail/model';
import { profile } from '$modules/identity/users/model';

@Injectable()
export class AuditService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

private inSystemContext(): boolean {
    return this.tenantContext.get()?.scope === 'system';
  }

  async listEvents(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(auditEvent.tenantId, tenantId));
    if (query.action) conditions.push(eq(auditEvent.action, String(query.action)));
    if (query.entity_type) conditions.push(eq(auditEvent.entityType, String(query.entity_type)));
    if (query.entity_id) conditions.push(eq(auditEvent.entityId, String(query.entity_id)));
    if (query.actor_id) conditions.push(eq(auditEvent.userId, parseBigIntId(String(query.actor_id), 'actor id')));

    if (query.from || query.to) {
      if (query.from) {
        const from = new Date(String(query.from));
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
        conditions.push(gte(auditEvent.createdAt, from));
      }
      if (query.to) {
        const to = new Date(String(query.to));
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');
        conditions.push(lte(auditEvent.createdAt, to));
      }
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const base = this.db.client.select().from(auditEvent).$dynamic();
    const events = await (where ? base.where(where) : base)
      .orderBy(desc(auditEvent.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    const total = Number(
      (
        await this.db.client.select({ value: count() }).from(auditEvent).where(where ?? undefined)
      )[0]?.value ?? 0,
    );

    const withUsers = await this.hydrateUsers(events, (event) => event.userId, (event, user) => ({
      ...event,
      user,
    }));

    return paginatedResponse(withUsers.map((event) => this.serializeEvent(event)), { page, per_page: perPage, total });
  }

  async createEvent(dto: CreateAuditEventDto, performedBy?: string) {
    const tenantId = this.tenantContext.currentTenantId();
    if (this.inSystemContext() || !tenantId) {
      throw new Error('Audit events require an explicit tenant context');
    }

    const event =
      (
        await this.db.client
          .insert(auditEvent)
          .values({
            tenantId,
            userId: performedBy ? parseBigIntId(performedBy, 'actor id') : null,
            entityType: dto.entity_type,
            entityId: dto.entity_id,
            action: dto.action,
            comment: dto.comment,
            data: dto.data ?? undefined,
          })
          .returning()
      )[0] ?? null;

    return {
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      action: event.action,
      comment: event.comment,
      data: event.data,
      performed_by: event.userId ? event.userId.toString() : null,
      created_at: event.createdAt,
    };
  }

  async getRequestAudit(requestId: string) {
    const conditions: SQL[] = [
      eq(auditEvent.entityType, 'request'),
      eq(auditEvent.entityId, requestId),
    ];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(auditEvent.tenantId, tenantId));

    const events = await this.db.client
      .select()
      .from(auditEvent)
      .where(and(...conditions))
      .orderBy(asc(auditEvent.createdAt));

    const withUsers = await this.hydrateUsers(events, (event) => event.userId, (event, user) => ({
      ...event,
      user,
    }));

    return {
      request_id: requestId,
      history: withUsers.map((event) => this.serializeEvent(event)),
    };
  }

  async listEmailLogs(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(emailLog.tenantId, tenantId));
    if (query.status) conditions.push(eq(emailLog.status, String(query.status)));
    if (query.to_email) conditions.push(ilike(emailLog.toEmail, `%${String(query.to_email)}%`));
    if (query.user_id) conditions.push(eq(emailLog.userId, parseBigIntId(String(query.user_id), 'user id')));
    if (query.notifiable_type) conditions.push(eq(emailLog.notifiableType, String(query.notifiable_type)));
    if (query.notifiable_id) conditions.push(eq(emailLog.notifiableId, parseBigIntId(String(query.notifiable_id), 'notifiable id')));

    if (query.from || query.to) {
      if (query.from) {
        const from = new Date(String(query.from));
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
        conditions.push(gte(emailLog.createdAt, from));
      }
      if (query.to) {
        const to = new Date(String(query.to));
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');
        conditions.push(lte(emailLog.createdAt, to));
      }
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const base = this.db.client.select().from(emailLog).$dynamic();
    const data = await (where ? base.where(where) : base)
      .orderBy(desc(emailLog.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);
    const total = Number(
      (
        await this.db.client.select({ value: count() }).from(emailLog).where(where ?? undefined)
      )[0]?.value ?? 0,
    );

    const withUsers = await this.hydrateUsers(data, (item) => item.userId, (item, user) => ({
      ...item,
      user,
    }));

    return paginatedResponse(
      withUsers.map((item) => ({
        id: item.id.toString(),
        user_id: item.userId ? item.userId.toString() : null,
        user: item.user
          ? { id: item.user.id.toString(), email: item.user.email, username: item.user.username }
          : null,
        to_email: item.toEmail,
        subject: item.subject,
        status: item.status,
        provider: item.provider,
        message_id: item.messageId,
        error_message: item.errorMessage,
        thread_key: item.threadKey,
        notifiable_type: item.notifiableType,
        notifiable_id: item.notifiableId ? item.notifiableId.toString() : null,
        created_at: item.createdAt,
      })),
      { page, per_page: perPage, total },
    );
  }

  private async hydrateUsers<T>(
    rows: T[],
    userIdFor: (row: T) => bigint | null,
    merge: (
      row: T,
      user: { id: bigint; email: string; username: string | null } | null,
    ) => T & { user: { id: bigint; email: string; username: string | null } | null },
  ): Promise<Array<T & { user: { id: bigint; email: string; username: string | null } | null }>> {
    if (!rows.length) return rows.map((row) => merge(row, null));
    const userIds = Array.from(
      new Set(rows.map(userIdFor).filter((value): value is bigint => value !== null)),
    );
    if (!userIds.length) return rows.map((row) => merge(row, null));

    const users = await this.db.client
      .select({ id: profile.id, email: profile.email, username: profile.username })
      .from(profile)
      .where(inArray(profile.id, userIds));
    const userMap = new Map(users.map((user) => [user.id.toString(), user]));
    return rows.map((row) => {
      const userId = userIdFor(row);
      const user = userId && userMap.has(userId.toString()) ? userMap.get(userId.toString())! : null;
      return merge(row, user);
    });
  }

  private serializeEvent(event: any) {
    return {
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      action: event.action,
      comment: event.comment,
      data: event.data,
      performed_by: event.userId ? event.userId.toString() : null,
      user: event.user
        ? { id: event.user.id.toString(), email: event.user.email, username: event.user.username }
        : null,
      created_at: event.createdAt,
    };
  }

}
