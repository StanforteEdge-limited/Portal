import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { Prisma } from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';

type NotificationInput = {
  userId: string | bigint;
  type?: string;
  title: string;
  message: string;
  link?: string;
  data?: Prisma.InputJsonValue;
  sentVia?: string[];
  notifiableType?: string;
  notifiableId?: string | number | bigint;
  emailSubject?: string;
  emailHtml?: string;
  emailPortalUrl?: string;
  emailCtaLabel?: string;
  emailTo?: string;
  emailThreadKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
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
    const created = await this.prisma.notification.create({
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
          await this.prisma.profile.findUnique({
            where: { id: toBigInt(input.userId) },
            select: { email: true }
          })
        )?.email;

      if (recipientEmail) {
        try {
          const threadKey =
            input.emailThreadKey ??
            (input.notifiableType && input.notifiableId !== undefined
              ? `${input.notifiableType}-${input.notifiableId.toString()}`
              : `notification-${created.id.toString()}`);
          const result = await this.mailService.send({
            to: recipientEmail,
            subject: input.emailSubject ?? input.title,
            text: input.message,
            html: input.emailHtml,
            portalUrl: this.resolveEmailPortalUrl(input),
            ctaLabel: input.emailCtaLabel,
            threadKey,
            userId: input.userId,
            notifiableType: input.notifiableType,
            notifiableId: input.notifiableId
          });

          if (result.sent) {
            await this.prisma.notification.update({
              where: { id: created.id },
              data: { sentVia: ['in-app', 'email'] }
            });
          }
        } catch (error) {
          void error;
        }
      }
    }

    return created;
  }

  async listForUser(userId: string, status?: 'read' | 'unread') {
    return this.prisma.notification.findMany({
      where: {
        userId: toBigInt(userId),
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
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
    return this.prisma.notification.updateMany({
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
    return this.prisma.notification.findFirst({
      where: {
        id: toBigInt(notificationId),
        userId: toBigInt(userId)
      }
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId: toBigInt(userId),
        status: 'unread'
      }
    });
  }
}
