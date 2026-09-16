import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { MailService } from '$common/mail/mail.service';
import { notification, notificationJob } from './model';

@Injectable()
@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<{ notificationJobId: string }>) {
    await this.tenantContext.runSystem('notification queue worker', async () => {
      const [jobRow] = await this.db.client
        .select()
        .from(notificationJob)
        .where(eq(notificationJob.id, job.data.notificationJobId))
        .limit(1);
      if (!jobRow) return;

      await this.db.client
        .update(notificationJob)
        .set({ status: 'processing', lockedAt: new Date(), attempts: job.attemptsMade + 1 })
        .where(eq(notificationJob.id, jobRow.id));

      try {
        if (jobRow.channel !== 'email') {
          throw new Error(`Unsupported notification channel: ${jobRow.channel}`);
        }
        const payload = jobRow.payload as Record<string, unknown>;
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
        await this.db.client
          .update(notificationJob)
          .set({ status: 'completed', processedAt: new Date(), lastError: null })
          .where(eq(notificationJob.id, jobRow.id));
        await this.db.client
          .update(notification)
          .set({ sentVia: ['in-app', 'email'] })
          .where(eq(notification.id, jobRow.notificationId));
      } catch (error) {
        await this.db.client
          .update(notificationJob)
          .set({
            status: job.attemptsMade >= 2 ? 'failed' : 'pending',
            lastError: error instanceof Error ? error.message : 'Notification delivery failed',
          })
          .where(eq(notificationJob.id, jobRow.id));
        throw error;
      }
    });
  }
}
