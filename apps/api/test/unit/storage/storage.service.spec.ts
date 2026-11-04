import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '$apps/storage/repository';
import { NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import { fileAsset } from '$apps/storage/model';

describe('StorageService (unit, fake db)', () => {
  const mockTenantContext = () => ({
    get: vi.fn().mockReturnValue({ scope: 'tenant', tenantId: 1n }),
    requireTenantId: vi.fn().mockReturnValue(1n),
    currentTenantId: vi.fn().mockReturnValue(1n),
  });

  const createService = (db: ReturnType<typeof createFakeDb>) => {
    return new StorageService(
      db as any,
      {} as any, // objectStorage
      mockTenantContext() as any,
    );
  };

  it('throws NotFoundException when retrieving non-existent file asset', async () => {
    const db = createFakeDb().queue(fileAsset, []);
    const service = createService(db);

    await expect(service.findOne('file_missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
