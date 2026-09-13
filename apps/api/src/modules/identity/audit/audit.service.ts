import { BadRequestException, Injectable } from '@nestjs/common';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { toBigInt } from '$common/utils/ids';
import { CreateAuditEventDto } from '$modules/identity/audit/dto/create-audit-event.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';

@Injectable()
export class AuditService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listEvents(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const where: Drizzle.AuditEventWhereInput = {};
    if (query.action) where.action = String(query.action);
    if (query.entity_type) where.entityType = String(query.entity_type);
    if (query.entity_id) where.entityId = String(query.entity_id);
    if (query.actor_id) where.userId = this.parseId(String(query.actor_id), 'actor id');

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        const from = new Date(String(query.from));
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
        where.createdAt.gte = from;
      }
      if (query.to) {
        const to = new Date(String(query.to));
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');
        where.createdAt.lte = to;
      }
    }

    const [events, total] = await this.drizzle.$transaction([
      this.drizzle.auditEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.drizzle.auditEvent.count({ where })
    ]);

    return paginatedResponse(events.map((event) => this.serializeEvent(event)), { page, per_page: perPage, total });
  }

  async createEvent(dto: CreateAuditEventDto, performedBy?: string) {
    const event = await this.drizzle.auditEvent.create({
      data: {
        userId: performedBy ? this.parseId(performedBy, 'actor id') : null,
        entityType: dto.entity_type,
        entityId: dto.entity_id,
        action: dto.action,
        comment: dto.comment,
        data: dto.data ? (dto.data as Drizzle.InputJsonValue) : undefined
      }
    });

    return {
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      action: event.action,
      comment: event.comment,
      data: event.data,
      performed_by: event.userId ? event.userId.toString() : null,
      created_at: event.createdAt
    };
  }

  async getRequestAudit(requestId: string) {
    const events = await this.drizzle.auditEvent.findMany({
      where: {
        entityType: 'request',
        entityId: requestId
      },
      include: {
        user: {
          select: { id: true, email: true, username: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      request_id: requestId,
      history: events.map((event) => this.serializeEvent(event))
    };
  }

  async listEmailLogs(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const where: Drizzle.EmailLogWhereInput = {};
    if (query.status) where.status = String(query.status);
    if (query.to_email) where.toEmail = { contains: String(query.to_email), mode: 'insensitive' };
    if (query.user_id) where.userId = this.parseId(String(query.user_id), 'user id');
    if (query.notifiable_type) where.notifiableType = String(query.notifiable_type);
    if (query.notifiable_id) where.notifiableId = this.parseId(String(query.notifiable_id), 'notifiable id');

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        const from = new Date(String(query.from));
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
        where.createdAt.gte = from;
      }
      if (query.to) {
        const to = new Date(String(query.to));
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await this.drizzle.$transaction([
      this.drizzle.emailLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.drizzle.emailLog.count({ where })
    ]);

    return paginatedResponse(data.map((item) => ({
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
      created_at: item.createdAt
    })), { page, per_page: perPage, total });
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
      created_at: event.createdAt
    };
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}