import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from '$modules/hrm/organizations/organizations.service';

function buildClient() {
  let idx = 0;
  const queue: any[] = [];
  const chain: any = {};
  const METHODS = [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin',
    'insert', 'update', 'delete', 'set', 'values', 'returning',
    '$dynamic', 'groupBy', 'having', 'onConflictDoUpdate', 'onConflictDoNothing',
  ];
  for (const m of METHODS) chain[m] = jest.fn(() => chain);
  chain.then = (onFulfilled: (value: any) => any) => {
    if (idx >= queue.length) throw new Error(`No mock result for query #${idx + 1}`);
    return Promise.resolve(onFulfilled(queue[idx++]));
  };
  chain.setResults = (...results: any[]) => {
    queue.length = 0;
    queue.push(...results);
    idx = 0;
  };
  return chain;
}

describe('OrganizationsService', () => {
  const db: any = { client: buildClient() };
  db.client.transaction = jest.fn(async (cb: any) => cb(db.client));

  const service = new OrganizationsService(db);

  beforeEach(() => jest.clearAllMocks());

  describe('createOrganization', () => {
    it('throws BadRequestException if code already exists', async () => {
      db.client.setResults([[{ id: 'existing' }]]);

      await expect(
        service.createOrganization({ code: 'HR', name: 'Human Resources' } as any, 1n)
      ).rejects.toThrow(BadRequestException);
      expect(db.client.transaction).not.toHaveBeenCalled();
    });

    it('creates organization and tenant link inside transaction', async () => {
      db.client.setResults([[], [{ id: 'org-1', code: 'HR', name: 'Human Resources' }], []]);

      const result = await service.createOrganization(
        { code: 'HR', name: 'Human Resources' } as any,
        1n
      );

      expect(result.id).toBe('org-1');
      expect(db.client.transaction).toHaveBeenCalled();
    });

    it('creates organization without tenant link when tenantId is null', async () => {
      db.client.setResults([[], [{ id: 'org-2', code: 'FIN', name: 'Finance' }]]);

      const result = await service.createOrganization({ code: 'FIN', name: 'Finance' } as any);

      expect(result.id).toBe('org-2');
      expect(db.client.transaction).toHaveBeenCalled();
    });
  });

  describe('updateOrganization', () => {
    it('throws NotFoundException if organization not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.updateOrganization('7', { name: 'Updated' } as any, 1n)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if new code conflicts', async () => {
      db.client.setResults([[{ id: 'org-1', code: 'HR' }], [{ id: 'org-2', code: 'FIN' }]]);

      await expect(
        service.updateOrganization('organizations-1', { code: 'FIN' } as any, 1n)
      ).rejects.toThrow(BadRequestException);
    });

    it('updates organization successfully', async () => {
      db.client.setResults([[{ id: 'org-1', code: 'HR' }], [{ id: 'org-1', name: 'Updated HR' }]]);

      const result = await service.updateOrganization('5', { name: 'Updated HR' } as any, 1n);

      expect(result.name).toBe('Updated HR');
    });
  });

  describe('deleteOrganization', () => {
    it('throws NotFoundException if organization not found', async () => {
      db.client.setResults([[]]);

      await expect(service.deleteOrganization('7', 1n)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if organization has children', async () => {
      db.client.setResults([[{ id: 'org-1' }], [{ id: 'child-1' }]]);

      await expect(service.deleteOrganization('5', 1n)).rejects.toThrow(BadRequestException);
    });

    it('deletes organization when no children exist', async () => {
      db.client.setResults([[{ id: 'org-1' }], [], []]);

      const result = await service.deleteOrganization('5', 1n);

      expect(result).toEqual({ success: true });
      expect(db.client.delete).toHaveBeenCalled();
    });
  });

  describe('getOrganization', () => {
    it('throws NotFoundException if not found', async () => {
      db.client.setResults([[]]);

      await expect(service.getOrganization('7', 1n)).rejects.toThrow(NotFoundException);
    });

    it('returns organization when found', async () => {
      db.client.setResults([[{ id: 'org-1', name: 'HR' }]]);

      const result = await service.getOrganization('5', 1n);

      expect(result.id).toBe('org-1');
    });
  });

  describe('listOrganizations', () => {
    it('returns organizations with child organizations resolved', async () => {
      db.client.setResults([[{ id: 'org-1', name: 'HR' }], []]);

      const result = await service.listOrganizations({}, 1n);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].childOrganizations).toEqual([]);
    });

    it('returns empty list', async () => {
      db.client.setResults([[]]);

      const result = await service.listOrganizations({ search: 'Human' }, 1n);

      expect(result.data).toHaveLength(0);
    });
  });
});