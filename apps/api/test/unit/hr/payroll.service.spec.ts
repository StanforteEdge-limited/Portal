import { describe, expect, it, vi } from 'vitest';
import { PayrollService } from '$apps/hr/payroll/repository';
import { NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { payrollWorker } from '$apps/hr/payroll/model';

describe('PayrollService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    requireTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new PayrollService(
      db as any,
      mockTenantContext() as any,
      {} as any, // notificationsService
      {} as any, // mailService
      {} as any, // pdfService
      {} as any, // storageService
    );
  };

  it('throws NotFoundException when retrieving non-existent payroll worker', async () => {
    const db = createFakeDb().queue(payrollWorker, []);
    const service = createService(db);

    await expect(service.getWorker('pw_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

