import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, asc, eq, lte } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DistributedLockService } from '$common/locks/distributed-lock.service';
import { notificationJob } from './model';

@Injectable()
export class NotificationScheduler {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly locks: DistributedLockService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueNotifications() {
    if (process.env.NOTIFICATION_SCHEDULER_ENABLED === 'false') return;
    await this.locks.withLock('notification-sweep', 120_000, async () => {
      await this.tenantContext.runSystem('notification scheduler', async () => {
        const due = await this.db.client
          .select()
          .from(notificationJob)
          .where(and(eq(notificationJob.status, 'pending'), lte(notificationJob.runAt, new Date())))
          .orderBy(asc(notificationJob.runAt))
          .limit(100);
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
    });
  }
}
