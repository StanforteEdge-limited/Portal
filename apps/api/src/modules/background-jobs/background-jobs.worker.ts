import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { BackgroundJobsService } from './background-jobs.service';
import { toBigInt } from '$common/utils/ids';
import { backgroundJob } from './model';

@Injectable()
@Processor('background-jobs')
export class BackgroundJobsWorker extends WorkerHost {
  private readonly logger = new Logger(BackgroundJobsWorker.name);

  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly jobs: BackgroundJobsService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job) {
    const data = job.data ?? {};
    const { jobId, onSuccessTitle, onSuccessMessage } = data;

    const [row] = await this.db.client
      .select()
      .from(backgroundJob)
      .where(eq(backgroundJob.id, toBigInt(String(jobId))))
      .limit(1);
    if (!row) {
      this.logger.warn(`Background job row ${jobId} not found, skipping`);
      return null;
    }
    if (row.status === 'completed') return null;

    const actor = data.actor
      ? { profileId: data.actor.profileId, membershipId: data.actor.membershipId, isOwner: data.actor.isOwner === true }
      : undefined;

    const context = {
      scope: 'tenant' as const,
      tenantId: row.tenantId,
      profileId: actor ? toBigInt(actor.profileId) : row.createdBy ?? 0n,
      membershipId: actor ? toBigInt(actor.membershipId) : 0n,
      isOwner: actor?.isOwner ?? false,
    };

    await this.jobs.markStarted(row.id);

    return this.tenantContext.run(context, async () => {
      const handler = this.jobs.getHandler(row.type);
      if (!handler) {
        throw new Error(`No background job handler registered for "${row.type}"`);
      }

      try {
        const handlerContext = {
          actorId: actor?.profileId ? String(actor.profileId) : undefined,
          progress: async (percent: number) => this.jobs.updateProgress(row.id, percent),
        };
        const result = await handler(row.payload ?? {}, handlerContext);
        await this.jobs.complete(row.id, result);
        await this.notifyCompletion(jobId, row.type, actor, onSuccessTitle, onSuccessMessage);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Background job ${jobId} (${row.type}) failed: ${message}`);
        await this.jobs.fail(row.id, message);
        throw error;
      }
    });
  }

  private async notifyCompletion(
    jobId: string,
    type: string,
    actor: { profileId: string } | undefined,
    title: string | null | undefined,
    message: string | null | undefined,
  ) {
    if (!actor?.profileId) return;
    try {
      await this.notifications.create({
        userId: actor.profileId,
        type: 'background_job',
        title: title ?? 'Background task completed',
        message: message ?? `Your task "${type}" has completed successfully.`,
        sentVia: ['in-app'],
      });
    } catch (error) {
      this.logger.warn(`Failed to notify completion for job ${jobId}: ${String(error)}`);
    }
  }
}
