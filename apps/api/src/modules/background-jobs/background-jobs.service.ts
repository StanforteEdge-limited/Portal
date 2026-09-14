import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';

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
    private readonly drizzle: DrizzleService,
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

    const row = await this.drizzle.backgroundJob.create({
      data: {
        type: input.type,
        status: 'queued',
        payload: (input.input ?? {}) as any,
        notifiable: input.notifiable ?? true,
        createdBy: createdBy ? toBigInt(createdBy) : null,
      } as any,
    });

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

  async getJob(id: string) {
    const row = await this.drizzle.backgroundJob.findUnique({ where: { id: toBigInt(id) } });
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
    await this.drizzle.backgroundJob
      .update({ where: { id }, data: { status: 'processing', startedAt: new Date(), error: null } })
      .catch(() => null);
  }

  async updateProgress(id: bigint, percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
    await this.drizzle.backgroundJob
      .update({ where: { id }, data: { progress: clamped } })
      .catch(() => null);
  }

  async complete(id: bigint, result: unknown) {
    await this.drizzle.backgroundJob.update({
      where: { id },
      data: { status: 'completed', progress: 100, result: (result ?? {}) as any, finishedAt: new Date() },
    });
  }

  async fail(id: bigint, error: string) {
    await this.drizzle.backgroundJob
      .update({ where: { id }, data: { status: 'failed', error, finishedAt: new Date() } })
      .catch(() => null);
  }
}