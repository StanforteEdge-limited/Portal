import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { MailService } from '$common/mail/mail.service';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    if (process.env.NOTIFICATION_WORKER_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.processPending(), 5000);
    void this.processPending();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processPending() {
    if (this.running) return;
    this.running = true;
    try {
      await this.tenantContext.runSystem('notification delivery worker', async () => {
        const jobs = await this.drizzle.notificationJob.findMany({
          where: { status: 'pending', runAt: { lte: new Date() } },
          orderBy: { createdAt: 'asc' },
          take: 25,
        });
        for (const job of jobs) {
          await this.drizzle.notificationJob.update({
            where: { id: job.id },
            data: { status: 'processing', lockedAt: new Date(), attempts: { increment: 1 } },
          });
          try {
            if (job.channel !== 'email') throw new Error(`Unsupported notification channel: ${job.channel}`);
            const payload = job.payload as Record<string, unknown>;
            const result = await this.mailService.send({
              to: String(payload.to),
              subject: String(payload.subject),
              text: String(payload.text),
              html: payload.html ? String(payload.html) : undefined,
              portalUrl: payload.portalUrl ? String(payload.portalUrl) : undefined,
              ctaLabel: payload.ctaLabel ? String(payload.ctaLabel) : undefined,
              threadKey: String(payload.threadKey),
              userId: String(payload.userId),
              notifiableType: payload.notifiableType ? String(payload.notifiableType) : undefined,
              notifiableId: payload.notifiableId ? String(payload.notifiableId) : undefined,
            });
            await this.drizzle.notificationJob.update({
              where: { id: job.id },
              data: { status: result.sent ? 'completed' : 'failed', processedAt: new Date(), lastError: result.sent ? null : 'Mail provider did not send' },
            });
            if (result.sent) {
              await this.drizzle.notification.update({
                where: { id: job.notificationId },
                data: { sentVia: ['in-app', 'email'] },
              });
            }
          } catch (error) {
            await this.drizzle.notificationJob.update({
              where: { id: job.id },
              data: { status: job.attempts >= 3 ? 'failed' : 'pending', lastError: error instanceof Error ? error.message : 'Notification delivery failed' },
            });
          }
        }
      });
    } finally {
      this.running = false;
    }
  }
}
