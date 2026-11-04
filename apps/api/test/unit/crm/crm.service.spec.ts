import { describe, expect, it, vi } from 'vitest';
import { CrmLeadsService } from '$apps/crm/leads/repository';
import { NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { crmLead } from '$apps/crm/leads/model';

describe('CrmLeadsService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    requireTenantId: vi.fn().mockReturnValue(tenantId),
    currentTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new CrmLeadsService(db as any, mockTenantContext() as any);
  };

  it('throws NotFoundException when retrieving non-existent lead', async () => {
    const db = createFakeDb().queue(crmLead, []);
    const service = createService(db);

    await expect(service.getLead('999')).rejects.toBeInstanceOf(NotFoundException);
  });
});

