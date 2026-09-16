import { BadRequestException } from '@nestjs/common';
import { AuditService } from '$modules/identity/audit/audit.service';

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

describe('AuditService', () => {
  const db: any = { client: buildClient() };
  const tenantContext: any = {
    currentTenantId: jest.fn().mockReturnValue(1n),
    get: jest.fn().mockReturnValue({ tenantId: 1n, scope: 'tenant' }),
  };

  const service = new AuditService(db, tenantContext);

  beforeEach(() => jest.clearAllMocks());

  describe('createEvent', () => {
    it('throws when running in system scope', async () => {
      tenantContext.get.mockReturnValue({ scope: 'system' });

      await expect(
        service.createEvent({ entity_type: 'request', entity_id: '1', action: 'create' } as any, '1')
      ).rejects.toThrow('Audit events require an explicit tenant context');
      expect(db.client.insert).not.toHaveBeenCalled();
    });

    it('creates audit event with tenant context and performs serialization', async () => {
      tenantContext.get.mockReturnValue({ tenantId: 1n, scope: 'tenant' });
      db.client.setResults([[
        {
          id: 'evt-1',
          entityType: 'request',
          entityId: '1',
          action: 'create',
          comment: null,
          data: null,
          userId: 10n,
          createdAt: new Date(),
        },
      ]]);

      const result = await service.createEvent(
        { entity_type: 'request', entity_id: '1', action: 'create' } as any,
        '10'
      );

      expect(result.entity_type).toBe('request');
      expect(result.action).toBe('create');
      expect(result.performed_by).toBe('10');
    });

    it('creates event with null performed_by when not provided', async () => {
      tenantContext.get.mockReturnValue({ tenantId: 1n, scope: 'tenant' });
      db.client.setResults([[
        {
          id: 'evt-2',
          entityType: 'user',
          entityId: '5',
          action: 'login',
          comment: null,
          data: null,
          userId: null,
          createdAt: new Date(),
        },
      ]]);

      const result = await service.createEvent(
        { entity_type: 'user', entity_id: '5', action: 'login' } as any
      );

      expect(result.performed_by).toBeNull();
    });
  });

  describe('listEvents', () => {
    it('returns paginated events with default params', async () => {
      db.client.setResults([[], [{ value: 0 }]]);

      const result = await service.listEvents({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(db.client.$dynamic).toHaveBeenCalled();
    });

    it('throws BadRequestException on invalid from date', async () => {
      await expect(service.listEvents({ from: 'not-a-date' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid to date', async () => {
      await expect(service.listEvents({ to: 'not-a-date' })).rejects.toThrow(BadRequestException);
    });

    it('filters by action and entity_type', async () => {
      db.client.setResults([[], [{ value: 0 }]]);

      await service.listEvents({ action: 'create', entity_type: 'request' });

      expect(db.client.where).toHaveBeenCalled();
    });
  });

  describe('getRequestAudit', () => {
    it('returns empty audit history for a request', async () => {
      db.client.setResults([[]]);

      const result = await service.getRequestAudit('req-1');

      expect(result.request_id).toBe('req-1');
      expect(result.history).toEqual([]);
    });

    it('returns serialized history when events exist', async () => {
      db.client.setResults([[
        {
          id: 'evt-1',
          entityType: 'request',
          entityId: 'req-1',
          action: 'submit',
          comment: null,
          data: null,
          userId: null,
          createdAt: new Date(),
        },
      ]]);

      const result = await service.getRequestAudit('req-1');

      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('submit');
    });

    it('includes tenant filter when tenant context exists', async () => {
      tenantContext.currentTenantId.mockReturnValue(1n);
      db.client.setResults([[]]);

      await service.getRequestAudit('req-1');

      expect(db.client.where).toHaveBeenCalled();
    });
  });

  describe('listEmailLogs', () => {
    it('returns paginated email logs', async () => {
      db.client.setResults([[], [{ value: 0 }]]);

      const result = await service.listEmailLogs({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('throws BadRequestException on invalid from date', async () => {
      await expect(service.listEmailLogs({ from: 'bad' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid to date', async () => {
      await expect(service.listEmailLogs({ to: 'bad' })).rejects.toThrow(BadRequestException);
    });
  });
});