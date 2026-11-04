import { describe, expect, it, vi } from 'vitest';
import { DepartmentsService } from '$apps/hr/departments/repository';
import { ConflictException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { department } from '$apps/hr/departments/model';

describe('DepartmentsService (unit, fake db)', () => {
  const mockTenantContext = (tenantId = 1n) => ({
    requireTenantId: vi.fn().mockReturnValue(tenantId),
    currentTenantId: vi.fn().mockReturnValue(tenantId),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new DepartmentsService(db as any, mockTenantContext() as any);
  };

  it('throws NotFoundException when department does not exist', async () => {
    const db = createFakeDb().queue(department, []);
    const service = createService(db);

    await expect(service.get('dept_missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects creation if department code already exists in tenant', async () => {
    const db = createFakeDb().queue(department, [
      { id: 'dept_1', tenantId: 1n, code: 'ENG', name: 'Engineering' },
    ]);
    const service = createService(db);

    await expect(
      service.create({ name: 'Engineering Dept', code: 'ENG' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates department successfully when code is unique', async () => {
    const db = createFakeDb()
      .queue(department, []) // check by code returns empty
      .insertReturning(department, {
        id: 'dept_new',
        tenantId: 1n,
        code: 'FIN',
        name: 'Finance & Accounts',
        isActive: true,
      });

    const service = createService(db);

    const created = await service.create({
      name: 'Finance & Accounts',
      code: 'FIN',
    } as any);

    expect(created.id).toBe('dept_new');
    expect(db.inserts.some((i) => i.table === department && (i.values as any).code === 'FIN')).toBe(true);
  });

  it('prevents deleting department that has child departments', async () => {
    const db = createFakeDb()
      .queue(department, [{ id: 'dept_parent', tenantId: 1n, name: 'Operations' }])
      .queue(department, [{ value: 2 }]); // child count > 0

    const service = createService(db);

    await expect(service.delete('dept_parent')).rejects.toBeInstanceOf(ConflictException);
  });
});
