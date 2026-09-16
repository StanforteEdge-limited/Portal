import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from '$modules/hrm/notifications/notifications.service';

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

describe('NotificationsService', () => {
  const db: any = { client: buildClient() };
  const tenantContext: any = {
    currentTenantId: jest.fn().mockReturnValue(1n),
    get: jest.fn().mockReturnValue({ tenantId: 1n, scope: 'tenant' }),
  };
  const queue: any = { add: jest.fn() };

  const service = new NotificationsService(db, tenantContext, queue);

  const notificationRow = {
    id: 'n-1', userId: 10n, type: 'info', title: 'Test', message: 'Hello',
    link: null, data: null, sentVia: ['in-app'], notifiableType: null,
    notifiableId: null, tenantId: 1n, status: 'unread', createdAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('throws BadRequestException when user is not a tenant member', async () => {
      tenantContext.get.mockReturnValue({ tenantId: 1n, scope: 'tenant' });
      db.client.setResults([[]]);

      await expect(
        service.create({ userId: '99', title: 'Test', message: 'Hello' })
      ).rejects.toThrow(BadRequestException);
    });

    it('creates notification in tenant scope', async () => {
      tenantContext.get.mockReturnValue({ tenantId: 1n, scope: 'tenant' });
      db.client.setResults([[{ profileId: 10n, tenantId: 1n }], [notificationRow]]);

      const result = await service.create({ userId: '10', title: 'Test', message: 'Hello' });

      expect(result.id).toBe('n-1');
      expect(db.client.insert).toHaveBeenCalled();
    });

    it('resolves tenant from membership when in system scope', async () => {
      tenantContext.get.mockReturnValue({ scope: 'system' });
      db.client.setResults([[{ tenantId: 5n }], [{ ...notificationRow, id: 'n-2', tenantId: 5n }]]);

      const result = await service.create({ userId: '10', title: 'Test', message: 'Hello' });

      expect(result.id).toBe('n-2');
    });

    it('returns undefined when no tenant membership is resolvable in system scope', async () => {
      tenantContext.get.mockReturnValue({ scope: 'system' });
      db.client.setResults([[]]);

      const result = await service.create({ userId: '10', title: 'Test', message: 'Hello' });

      expect(result).toBeUndefined();
    });

    it('queues email job when sentVia includes email', async () => {
      tenantContext.get.mockReturnValue({ tenantId: 1n, scope: 'tenant' });
      db.client.setResults([
        [{ profileId: 10n, tenantId: 1n }],
        [{ ...notificationRow, id: 'n-3', sentVia: ['email'] }],
        [{ email: 'test@test.com' }],
        [{ id: 'job-1' }],
      ]);

      await service.create({
        userId: '10',
        title: 'Test',
        message: 'Hello',
        sentVia: ['email'],
      });

      expect(queue.add).toHaveBeenCalledWith(
        'deliver-notification',
        expect.objectContaining({ notificationJobId: 'job-1' }),
        expect.any(Object)
      );
    });
  });

  describe('listForUser', () => {
    it('returns notifications for user', async () => {
      db.client.setResults([[{ id: 'n-1', title: 'Test' }]]);

      const result = await service.listForUser('10');

      expect(result).toHaveLength(1);
    });

    it('filters by status when provided', async () => {
      db.client.setResults([[]]);

      await service.listForUser('10', 'unread');

      expect(db.client.where).toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('marks a single notification as read', async () => {
      db.client.setResults([{ rowCount: 1 }]);

      const result = await service.markRead('10', 'n-1');

      expect(result.count).toBe(1);
      expect(db.client.update).toHaveBeenCalled();
    });

    it('returns count 0 when notification not found', async () => {
      db.client.setResults([{ rowCount: 0 }]);

      const result = await service.markRead('10', 'bad-id');

      expect(result.count).toBe(0);
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications as read', async () => {
      db.client.setResults([{ rowCount: 5 }]);

      const result = await service.markAllRead('10');

      expect(result.count).toBe(5);
    });
  });

  describe('getOneForUser', () => {
    it('returns notification when found', async () => {
      db.client.setResults([[{ id: 'n-1', title: 'Test' }]]);

      const result = await service.getOneForUser('10', 'n-1');

      expect(result.id).toBe('n-1');
    });

    it('returns null when not found', async () => {
      db.client.setResults([[]]);

      const result = await service.getOneForUser('10', 'bad-id');

      expect(result).toBeNull();
    });
  });

  describe('unreadCount', () => {
    it('returns count of unread notifications', async () => {
      db.client.setResults([[{ value: 3 }]]);

      const result = await service.unreadCount('10');

      expect(result).toBe(3);
    });

    it('returns 0 when no unread notifications', async () => {
      db.client.setResults([[{ value: 0 }]]);

      const result = await service.unreadCount('10');

      expect(result).toBe(0);
    });
  });
});