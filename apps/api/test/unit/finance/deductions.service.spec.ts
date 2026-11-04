import { describe, expect, it, vi } from 'vitest';
import { DeductionService } from '$apps/finance/deductions/repository';
import { createFakeDb } from '../../support/fake-db';
import { financeDeductionType } from '$apps/finance/accounting/model';

describe('DeductionService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    requireTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new DeductionService(
      db as any,
      mockTenantContext() as any,
      {} as any, // pdfService
    );
  };

  it('lists active deduction types', async () => {
    const db = createFakeDb().queue(financeDeductionType, [
      { id: 'dt_1', name: 'Withholding Tax (WHT)', code: 'WHT', rate: '0.05', isActive: true },
      { id: 'dt_2', name: 'Value Added Tax (VAT)', code: 'VAT', rate: '0.075', isActive: true },
    ]);
    const service = createService(db);

    const res = await service.listDeductionTypes({ is_active: true });

    expect(res.data.items.length).toBe(2);
    expect(res.data.items[0].code).toBe('WHT');
  });

  it('updates or creates a deduction type', async () => {
    const db = createFakeDb().insertReturning(financeDeductionType, {
      id: 'dt_new',
      name: 'Pension Contribution',
      code: 'PEN',
      rate: '0.08',
      isActive: true,
    });
    const service = createService(db);

    const res = await service.upsertDeductionType(
      undefined,
      { name: 'Pension Contribution', code: 'PEN', rate: 0.08 } as any,
      1,
    );

    expect(res).toBeDefined();
    expect(db.inserts.some((i) => i.table === financeDeductionType)).toBe(true);
  });
});
