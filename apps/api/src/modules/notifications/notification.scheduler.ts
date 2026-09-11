import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';

@Injectable()
export class NotificationScheduler {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueNotifications() {
    if (process.env.NOTIFICATION_SCHEDULER_ENABLED === 'false') return;
    await this.tenantContext.runSystem('notification scheduler', async () => {
      const due = await this.drizzle.notificationJob.findMany({
        where: { status: 'pending', runAt: { lte: new Date() } },
        orderBy: { runAt: 'asc' },
        take: 100,
      });
      for (const job of due) {
        await this.queue.add(
          'deliver-notification',
          { notificationJobId: job.id.toString() },
          {
            jobId: job.id.toString(),
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        );
      }
    });
  }
}
