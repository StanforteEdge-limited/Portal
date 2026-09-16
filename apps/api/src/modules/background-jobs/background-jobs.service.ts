import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { backgroundJob } from './model';

export type BackgroundJobActor = {
  profileId: bigint | string;
  membershipId: bigint | string;
  isOwner: boolean;
};

export type BackgroundJobHandlerContext = {
  actorId?: string;
  progress: (percent: number) => Promise<void>;
};

export type BackgroundJobHandler = (
  input: any,
  ctx: BackgroundJobHandlerContext,
) => Promise<unknown>;

export type EnqueueBackgroundJobInput = {
  type: string;
  input?: unknown;
  notifiable?: boolean;
  tenantId?: bigint | string;
  actor?: BackgroundJobActor;
  onSuccessTitle?: string;
  onSuccessMessage?: string;
};

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);
  private readonly handlers = new Map<string, BackgroundJobHandler>();

  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    @InjectQueue('background-jobs') private readonly queue: Queue,
  ) {}

  register(type: string, handler: BackgroundJobHandler) {
    this.handlers.set(type, handler);
    return this;
  }

  getHandler(type: string): BackgroundJobHandler | undefined {
    return this.handlers.get(type);
  }

  async enqueue(input: EnqueueBackgroundJobInput): Promise<{ job_id: string }> {
    const context = this.tenantContext.get();
    const tenantId =
      input.tenantId ??
      (context && context.scope === 'tenant' ? context.tenantId : undefined);
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required to enqueue a background job');
    }

    const actor =
      input.actor ??
      (context && context.scope === 'tenant'
        ? { profileId: context.profileId, membershipId: context.membershipId, isOwner: context.isOwner }
        : undefined);

    const createdBy = actor?.profileId;

    const [row] = await this.db.client
      .insert(backgroundJob)
      .values({
        tenantId: toBigInt(tenantId),
        type: input.type,
        status: 'queued',
        payload: (input.input ?? {}) as any,
        notifiable: input.notifiable ?? true,
        createdBy: createdBy ? toBigInt(createdBy) : null,
      })
      .returning();

    const jobId = row.id.toString();

    await this.queue.add(
      'run-job',
      {
        jobId,
        type: input.type,
        input: input.input ?? {},
        actor: actor
          ? {
              profileId: String(actor.profileId),
              membershipId: String(actor.membershipId),
              isOwner: actor.isOwner,
            }
          : null,
        createdBy: createdBy ? String(createdBy) : null,
        notifiable: input.notifiable ?? true,
        onSuccessTitle: input.onSuccessTitle ?? null,
        onSuccessMessage: input.onSuccessMessage ?? null,
      },
      {
        jobId,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 2000,
        removeOnFail: 5000,
      },
    );

    return { job_id: jobId };
  }

  async getJob(id: string, tenantId?: bigint) {
    const conditions = [eq(backgroundJob.id, toBigInt(id))];
    if (tenantId) conditions.push(eq(backgroundJob.tenantId, tenantId));
    const [row] = await this.db.client
      .select()
      .from(backgroundJob)
      .where(and(...conditions))
      .limit(1);
    if (!row) throw new NotFoundException('Background job not found');
    return {
      id: row.id.toString(),
      type: row.type,
      status: row.status,
      progress: row.progress,
      error: row.error ?? null,
      result: row.result ?? null,
      created_at: row.createdAt,
      started_at: row.startedAt ?? null,
      finished_at: row.finishedAt ?? null,
    };
  }

  async markStarted(id: bigint) {
    await this.db.client
      .update(backgroundJob)
      .set({ status: 'processing', startedAt: new Date(), error: null })
      .where(eq(backgroundJob.id, id))
      .catch(() => null);
  }

  async updateProgress(id: bigint, percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
    await this.db.client
      .update(backgroundJob)
      .set({ progress: clamped })
      .where(eq(backgroundJob.id, id))
      .catch(() => null);
  }

  async complete(id: bigint, result: unknown) {
    await this.db.client
      .update(backgroundJob)
      .set({ status: 'completed', progress: 100, result: (result ?? {}) as any, finishedAt: new Date() })
      .where(eq(backgroundJob.id, id));
  }

  async fail(id: bigint, error: string) {
    await this.db.client
      .update(backgroundJob)
      .set({ status: 'failed', error, finishedAt: new Date() })
      .where(eq(backgroundJob.id, id))
      .catch(() => null);
  }
}
