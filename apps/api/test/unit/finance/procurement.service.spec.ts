import { describe, expect, it, vi } from 'vitest';
import { ProcurementService } from '$apps/finance/procurement/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { procurementRequisition } from '$apps/finance/procurement/model';

describe('ProcurementService (unit, fake db)', () => {
  const mockTenantContext = (tenantId?: bigint) => ({
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    requireTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>, tenantId?: bigint) => {
    return new ProcurementService(
      db as any,
      mockTenantContext(tenantId) as any,
      {} as any, // workflowService
      {} as any, // notificationsService
      {} as any, // mailService
      {} as any, // mailQueue
      {} as any, // pdfService
    );
  };

  it('rejects PR creation when tenant context is missing', async () => {
    const db = createFakeDb().queue(procurementRequisition, [{ value: 0 }]); // count query
    const service = createService(db, undefined);

    await expect(
      service.createPr('10', { title: 'Laptops', items: [] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when retrieving non-existent PR', async () => {
    const db = createFakeDb().queue(procurementRequisition, []);
    const service = createService(db, 1n);

    await expect(service.getPr('pr_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
