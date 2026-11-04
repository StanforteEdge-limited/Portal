import { describe, expect, it, vi } from 'vitest';
import { TimesheetsService } from '$apps/hr/timesheets/repository';
import { createFakeDb } from '../../support/fake-db';
import { workLog } from '$apps/hr/tasks/model';

describe('TimesheetsService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    requireTenantId: vi.fn().mockReturnValue(tenantId),
    currentTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new TimesheetsService(db as any, mockTenantContext() as any);
  };

  it('returns null safely when work log is not found during sync', async () => {
    const db = createFakeDb().queue(workLog, []);
    const service = createService(db);

    const result = await service.syncFromWorkLog('wl_missing', 'submitted');
    expect(result).toBeNull();
  });
});
