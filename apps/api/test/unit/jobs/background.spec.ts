import { describe, expect, it, vi } from 'vitest';
import { BackgroundJobsService, backgroundJob } from '$app/jobs/background';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';

describe('BackgroundJobsService (unit, fake db)', () => {
  const mockTenantContext = (tenantId?: bigint) => ({
    get: vi.fn().mockReturnValue(
      tenantId
        ? {
            scope: 'tenant',
            tenantId,
            profileId: 10n,
            membershipId: 1n,
            isOwner: true,
          }
        : null,
    ),
  });

  const mockQueue = () => ({
    add: vi.fn().mockResolvedValue({ id: 'bullmq_job_1' }),
  });

  it('registers and retrieves handlers by job type', () => {
    const service = new BackgroundJobsService(
      createFakeDb() as any,
      mockTenantContext() as any,
      mockQueue() as any,
    );

    const handler = vi.fn().mockResolvedValue({ success: true });
    service.register('payroll-export', handler);

    expect(service.getHandler('payroll-export')).toBe(handler);
    expect(service.getHandler('unknown-type')).toBeUndefined();
  });

  it('throws BadRequestException if tenant context is missing when enqueuing', async () => {
    const service = new BackgroundJobsService(
      createFakeDb() as any,
      mockTenantContext(undefined) as any,
      mockQueue() as any,
    );

    await expect(
      service.enqueue({ type: 'report-generation' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('inserts database record and dispatches job to BullMQ queue', async () => {
    const db = createFakeDb().insertReturning(backgroundJob, {
      id: 55n,
      tenantId: 1n,
      type: 'csv-export',
      status: 'queued',
      notifiable: true,
    });
    const queue = mockQueue();
    const service = new BackgroundJobsService(
      db as any,
      mockTenantContext(1n) as any,
      queue as any,
    );

    const res = await service.enqueue({
      type: 'csv-export',
      input: { filter: 'active' },
      onSuccessTitle: 'CSV Ready',
    });

    expect(res.job_id).toBe('55');
    expect(queue.add).toHaveBeenCalledWith(
      'run-job',
      expect.objectContaining({
        jobId: '55',
        type: 'csv-export',
        input: { filter: 'active' },
        onSuccessTitle: 'CSV Ready',
      }),
      expect.objectContaining({ attempts: 2 }),
    );
  });

  it('throws NotFoundException when querying non-existent background job', async () => {
    const db = createFakeDb().queue(backgroundJob, []);
    const service = new BackgroundJobsService(
      db as any,
      mockTenantContext() as any,
      mockQueue() as any,
    );

    await expect(service.getJob('999', 1n)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retrieves existing background job', async () => {
    const db = createFakeDb().queue(backgroundJob, [
      {
        id: 77n,
        tenantId: 1n,
        type: 'db-backup',
        status: 'completed',
        progress: 100,
        result: { sizeBytes: 1024 },
        error: null,
        createdAt: new Date(),
        finishedAt: new Date(),
      },
    ]);
    const service = new BackgroundJobsService(
      db as any,
      mockTenantContext() as any,
      mockQueue() as any,
    );

    const job = await service.getJob('77', 1n);

    expect(job.id).toBe('77');
    expect(job.type).toBe('db-backup');
    expect(job.status).toBe('completed');
  });
});
