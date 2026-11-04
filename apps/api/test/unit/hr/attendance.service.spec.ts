import { describe, expect, it, vi } from 'vitest';
import { AttendanceService } from '$apps/hr/attendance/repository';
import { BadRequestException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';

describe('AttendanceService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    requireTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new AttendanceService(
      db as any,
      mockTenantContext() as any,
      { create: vi.fn() } as any, // notifications
    );
  };

  it('rejects invalid timestamp string when clocking in', async () => {
    const db = createFakeDb();
    const service = createService(db);

    await expect(
      service.clockIn('10', {}, { at: 'invalid-date' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

