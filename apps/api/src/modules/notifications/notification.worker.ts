import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { MailService } from '$common/mail/mail.service';

@Injectable()
@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<{ notificationJobId: string }>) {
    await this.tenantContext.runSystem('notification queue worker', async () => {
      const notificationJob = await this.drizzle.notificationJob.findUnique({
        where: { id: job.data.notificationJobId },
      });
      if (!notificationJob) return;

      await this.drizzle.notificationJob.update({
        where: { id: notificationJob.id },
        data: { status: 'processing', lockedAt: new Date(), attempts: job.attemptsMade + 1 },
      });

      try {
        if (notificationJob.channel !== 'email') {
          throw new Error(`Unsupported notification channel: ${notificationJob.channel}`);
        }
        const payload = notificationJob.payload as Record<string, unknown>;
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
        if (!result.sent) throw new Error('Mail provider did not send');
        await this.drizzle.notificationJob.update({
          where: { id: notificationJob.id },
          data: { status: 'completed', processedAt: new Date(), lastError: null },
        });
        await this.drizzle.notification.update({
          where: { id: notificationJob.notificationId },
          data: { sentVia: ['in-app', 'email'] },
        });
      } catch (error) {
        await this.drizzle.notificationJob.update({
          where: { id: notificationJob.id },
          data: {
            status: job.attemptsMade >= 2 ? 'failed' : 'pending',
            lastError: error instanceof Error ? error.message : 'Notification delivery failed',
          },
        });
        throw error;
      }
    });
  }
}
