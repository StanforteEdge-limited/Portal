import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from '$apps/hr/requests/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { requestCategory, requestGroup, requestType } from '$apps/hr/requests/model';

describe('RequestsService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    currentTenantId: vi.fn().mockReturnValue(tenantId),
    requireTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new RequestsService(
      db as any,
      {} as any, // workflowService
      {} as any, // formsService
      {} as any, // notificationsService
      {} as any, // documentGenerator
      mockTenantContext() as any,
    );
  };

  it('rejects group creation if code is missing', async () => {
    const db = createFakeDb();
    const service = createService(db);

    await expect(
      service.createGroup({ name: 'Expense Requests', code: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates request group for active tenant', async () => {
    const db = createFakeDb().insertReturning(requestGroup, {
      id: 'grp_1',
      tenantId: 1n,
      name: 'HR Requests',
      code: 'hr_req',
      description: 'All HR requests',
    });
    const service = createService(db);

    const group = await service.createGroup({
      name: 'HR Requests',
      code: 'hr_req',
      description: 'All HR requests',
    });

    expect(group.id).toBe('grp_1');
    expect(db.inserts.some((i) => i.table === requestGroup && (i.values as any).code === 'hr_req')).toBe(true);
  });

  it('throws NotFoundException when retrieving non-existent request type', async () => {
    const db = createFakeDb().queue(requestType, []);
    const service = createService(db);

    await expect(service.getType('rt_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns request type by id', async () => {
    const db = createFakeDb().queue(requestType, [
      { id: 'rt_1', name: 'Equipment Request', codePrefix: 'EQ' },
    ]);
    const service = createService(db);

    const type = await service.getType('rt_1');

    expect(type.id).toBe('rt_1');
    expect(type.name).toBe('Equipment Request');
  });

  it('throws NotFoundException when creating request type with non-existent category', async () => {
    const db = createFakeDb().queue(requestCategory, []);
    const service = createService(db);

    await expect(
      service.createType({
        name: 'Travel Advance',
        category_id: 'cat_missing',
        code_prefix: 'TA',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
