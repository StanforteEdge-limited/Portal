import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { toBigInt } from '$common/utils/ids';
import { Drizzle } from '$common/db/drizzle-compat';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

type NotificationInput = {
  userId: string | bigint;
  type?: string;
  title: string;
  message: string;
  link?: string;
  data?: Drizzle.InputJsonValue;
  sentVia?: string[];
  notifiableType?: string;
  notifiableId?: string | number | bigint;
  emailSubject?: string;
  emailHtml?: string;
  emailPortalUrl?: string;
  emailCtaLabel?: string;
  emailTo?: string;
  emailThreadKey?: string;
  scheduledFor?: Date | string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  private resolveEmailPortalUrl(input: NotificationInput): string | undefined {
    const explicitPortalUrl = String(input.emailPortalUrl ?? '').trim();
    if (explicitPortalUrl) {
      return explicitPortalUrl;
    }

    const link = String(input.link ?? '').trim();
    if (!link) {
      return undefined;
    }

    if (/^https?:\/\//i.test(link)) {
      return link;
    }

    const appBaseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const normalizedPath = link.startsWith('/') ? link : `/${link}`;
    return `${appBaseUrl}${normalizedPath}`;
  }

  async create(input: NotificationInput) {
    const created = await this.drizzle.notification.create({
      data: {
        userId: toBigInt(input.userId),
        type: input.type ?? 'info',
        title: input.title,
        message: input.message,
        link: input.link,
        data: input.data,
        sentVia: input.sentVia ?? ['in-app'],
        notifiableType: input.notifiableType,
        notifiableId: input.notifiableId !== undefined ? toBigInt(input.notifiableId) : undefined
      }
    });

    const wantsEmail = input.sentVia
      ? input.sentVia.includes('email')
      : (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true');
    if (wantsEmail) {
      const recipientEmail =
        input.emailTo ??
        (
          await this.drizzle.profile.findUnique({
            where: { id: toBigInt(input.userId) },
            select: { email: true }
          })
        )?.email;

      if (recipientEmail) {
        const context = this.tenantContext.get();
        const tenantId =
          context && context.scope !== 'system'
            ? context.tenantId
            : (
                await this.drizzle.tenantMembership.findFirst({
                  where: { profileId: toBigInt(input.userId) },
                  select: { tenantId: true }
                })
              )?.tenantId;
        if (!tenantId) {
          this.logger.warn(
            `Cannot schedule email for user ${input.userId}: no tenant context available`
          );
          return created;
        }
        const job = await this.drizzle.notificationJob.create({
          data: {
            tenantId,
            notificationId: created.id,
            channel: 'email',
            runAt: input.scheduledFor ? new Date(input.scheduledFor) : new Date(),
            payload: {
              to: recipientEmail,
              subject: input.emailSubject ?? input.title,
              text: input.message,
              html: input.emailHtml,
              portalUrl: this.resolveEmailPortalUrl(input),
              ctaLabel: input.emailCtaLabel,
              threadKey: input.emailThreadKey ??
                (input.notifiableType && input.notifiableId !== undefined
                  ? `${input.notifiableType}-${input.notifiableId.toString()}`
                  : `notification-${created.id.toString()}`),
              userId: input.userId.toString(),
              notifiableType: input.notifiableType,
              notifiableId: input.notifiableId?.toString(),
            } as Drizzle.InputJsonValue,
          },
        });
        await this.queue.add('deliver-notification', { notificationJobId: job.id.toString() }, {
          jobId: job.id.toString(),
          delay: input.scheduledFor ? Math.max(0, new Date(input.scheduledFor).getTime() - Date.now()) : 0,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        });
      }
    }

    return created;
  }

  async listForUser(userId: string, status?: 'read' | 'unread') {
    return this.drizzle.notification.findMany({
      where: {
        userId: toBigInt(userId),
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.drizzle.notification.updateMany({
      where: {
        id: toBigInt(notificationId),
        userId: toBigInt(userId),
        status: 'unread'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });
  }

  async markAllRead(userId: string) {
    return this.drizzle.notification.updateMany({
      where: {
        userId: toBigInt(userId),
        status: 'unread'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });
  }

  async getOneForUser(userId: string, notificationId: string) {
    return this.drizzle.notification.findFirst({
      where: {
        id: toBigInt(notificationId),
        userId: toBigInt(userId)
      }
    });
  }

  async unreadCount(userId: string) {
    return this.drizzle.notification.count({
      where: {
        userId: toBigInt(userId),
        status: 'unread'
      }
    });
  }
}
