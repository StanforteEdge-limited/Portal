import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { paginatedResponse } from '../../common/helpers/paginated-response';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const where: Prisma.WorkflowHistoryWhereInput = {};
    if (query.action) where.action = String(query.action);
    if (query.instance_id) where.instanceId = String(query.instance_id);
    if (query.actor_id) where.performedBy = this.parseId(String(query.actor_id), 'actor id');

    const instanceWhere: Prisma.WorkflowInstanceWhereInput = {};
    if (query.entity_type) instanceWhere.entityType = String(query.entity_type);
    if (query.entity_id) instanceWhere.entityId = String(query.entity_id);
    if (Object.keys(instanceWhere).length > 0) {
      where.instance = { is: instanceWhere };
    }

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

    const events = await this.prisma.workflowHistory.findMany({
      where,
      include: {
        instance: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
            workflow: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage
    });
    const total = await this.prisma.workflowHistory.count({ where });

    return paginatedResponse(events.map((event) => ({
      id: event.id,
      instance_id: event.instanceId,
      action: event.action,
      comment: event.comment,
      data: event.data,
      performed_by: event.performedBy ? event.performedBy.toString() : null,
      created_at: event.createdAt,
      entity: {
        type: event.instance.entityType,
        id: event.instance.entityId
      },
      workflow: {
        id: event.instance.workflow.id,
        name: event.instance.workflow.name
      }
    })), { page, per_page: perPage, total });
  }

  async createEvent(dto: CreateAuditEventDto, performedBy?: string) {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: dto.instance_id } });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const event = await this.prisma.workflowHistory.create({
      data: {
        instanceId: dto.instance_id,
        action: dto.action,
        comment: dto.comment,
        data: dto.data ? (dto.data as Prisma.InputJsonValue) : undefined,
        performedBy: performedBy ? this.parseId(performedBy, 'performed_by') : null
      }
    });

    return {
      id: event.id,
      instance_id: event.instanceId,
      action: event.action,
      comment: event.comment,
      data: event.data,
      performed_by: event.performedBy ? event.performedBy.toString() : null,
      created_at: event.createdAt
    };
  }

  async getRequestAudit(requestId: string) {
    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        entityType: 'request',
        entityId: requestId
      },
      include: {
        history: {
          orderBy: { createdAt: 'asc' }
        },
        workflow: {
          select: { id: true, name: true }
        }
      }
    });

    if (instances.length === 0) {
      return { request_id: requestId, history: [] };
    }

    const history = instances.flatMap((instance) =>
      instance.history.map((event) => ({
        id: event.id,
        instance_id: instance.id,
        action: event.action,
        comment: event.comment,
        data: event.data,
        performed_by: event.performedBy ? event.performedBy.toString() : null,
        created_at: event.createdAt,
        workflow: {
          id: instance.workflow.id,
          name: instance.workflow.name
        }
      }))
    );

    return {
      request_id: requestId,
      history: history.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    };
  }

  async listEmailLogs(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 25)));

    const where: Prisma.EmailLogWhereInput = {};
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
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
      this.prisma.emailLog.count({ where })
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

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
