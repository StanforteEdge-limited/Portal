import { Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { notification, notificationJob } from './model';
import { profile } from '$modules/identity/users/model';
import { tenantMembership } from '$modules/tenancy/model';

type NotificationInput = {
  userId: string | bigint;
  type?: string;
  title: string;
  message: string;
  link?: string;
  data?: unknown;
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
    private readonly db: DbService,
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
    const context = this.tenantContext.get();
    const tenantId = context && context.scope !== 'system' ? context.tenantId : undefined;
    const [created] = await this.db.client
      .insert(notification)
      .values({
        tenantId,
        userId: toBigInt(input.userId),
        type: input.type ?? 'info',
        title: input.title,
        message: input.message,
        link: input.link,
        data: input.data,
        sentVia: input.sentVia ?? ['in-app'],
        notifiableType: input.notifiableType,
        notifiableId: input.notifiableId !== undefined ? toBigInt(input.notifiableId) : undefined
      })
      .returning();

    const wantsEmail = input.sentVia
      ? input.sentVia.includes('email')
      : (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true');
    if (wantsEmail) {
      const recipientEmail =
        input.emailTo ??
        (
          await this.db.client
            .select({ email: profile.email })
            .from(profile)
            .where(eq(profile.id, toBigInt(input.userId)))
            .limit(1)
        )[0]?.email;

      if (recipientEmail) {
        const emailTenantId =
          tenantId ??
          (
            await this.db.client
              .select({ tenantId: tenantMembership.tenantId })
              .from(tenantMembership)
              .where(eq(tenantMembership.profileId, toBigInt(input.userId)))
              .limit(1)
          )[0]?.tenantId;
        if (!emailTenantId) {
          this.logger.warn(
            `Cannot schedule email for user ${input.userId}: no tenant context available`
          );
          return created;
        }
        const [job] = await this.db.client
          .insert(notificationJob)
          .values({
            tenantId: emailTenantId,
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
            },
          })
          .returning();
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
    const conditions = [eq(notification.userId, toBigInt(userId))];
    if (status) conditions.push(eq(notification.status, status));
    return this.db.client
      .select()
      .from(notification)
      .where(and(...conditions))
      .orderBy(desc(notification.createdAt));
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.db.client
      .update(notification)
      .set({
        status: 'read',
        readAt: new Date()
      })
      .where(and(
        eq(notification.id, toBigInt(notificationId)),
        eq(notification.userId, toBigInt(userId)),
        eq(notification.status, 'unread'),
      ));
    return { count: Number(result?.rowCount ?? 0) };
  }

  async markAllRead(userId: string) {
    const result = await this.db.client
      .update(notification)
      .set({
        status: 'read',
        readAt: new Date()
      })
      .where(and(eq(notification.userId, toBigInt(userId)), eq(notification.status, 'unread')));
    return { count: Number(result?.rowCount ?? 0) };
  }

  async getOneForUser(userId: string, notificationId: string) {
    const [row] = await this.db.client
      .select()
      .from(notification)
      .where(and(eq(notification.id, toBigInt(notificationId)), eq(notification.userId, toBigInt(userId))))
      .limit(1);
    return row ?? null;
  }

  async unreadCount(userId: string) {
    const [row] = await this.db.client
      .select({ value: count() })
      .from(notification)
      .where(and(eq(notification.userId, toBigInt(userId)), eq(notification.status, 'unread')));
    return Number(row?.value ?? 0);
  }
}
