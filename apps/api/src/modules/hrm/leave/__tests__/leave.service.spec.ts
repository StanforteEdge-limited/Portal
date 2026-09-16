import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveService } from '$modules/hrm/leave/leave.service';

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

describe('LeaveService', () => {
  const db: any = { client: buildClient() };
  const notifications: any = { create: jest.fn() };

  const service = new LeaveService(db, notifications);

  const ctx = { tenantId: 1n, profileId: 10n, isOwner: true } as any;
  const nonOwnerCtx = { tenantId: 1n, profileId: 10n, isOwner: false } as any;

  beforeEach(() => jest.clearAllMocks());

  describe('createType', () => {
    it('throws if user is not owner', async () => {
      await expect(
        service.createType(nonOwnerCtx, { code: 'AL', name: 'Annual Leave', annual_entitlement_days: 20 } as any)
      ).rejects.toThrow(BadRequestException);
      expect(db.client.insert).not.toHaveBeenCalled();
    });

    it('creates a leave type', async () => {
      db.client.setResults([{ id: 'lt-1', code: 'al', name: 'Annual Leave' }]);

      const result = await service.createType(ctx, {
        code: '  AL  ',
        name: 'Annual Leave',
        annual_entitlement_days: 20,
      } as any);

      expect(result.id).toBe('lt-1');
      expect(db.client.insert).toHaveBeenCalled();
    });
  });

  describe('createRequest', () => {
    it('throws NotFoundException if leave type not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.createRequest(ctx, {
          leave_type_id: 'bad-id',
          start_date: '2026-07-06',
          end_date: '2026-07-10',
          reason: 'Vacation',
        } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if end date is before start date', async () => {
      db.client.setResults([[{ id: 'lt-1', isActive: 1, tenantId: 1n }]]);

      await expect(
        service.createRequest(ctx, {
          leave_type_id: 'lt-1',
          start_date: '2026-07-10',
          end_date: '2026-07-01',
          reason: 'Vacation',
        } as any)
      ).rejects.toThrow('Leave end date must not be before start date');
    });

    it('throws BadRequestException if dates overlap an existing request', async () => {
      db.client.setResults([[{ id: 'lt-1', isActive: 1, tenantId: 1n }], [{ id: 'existing-req' }]]);

      await expect(
        service.createRequest(ctx, {
          leave_type_id: 'lt-1',
          start_date: '2026-07-06',
          end_date: '2026-07-10',
          reason: 'Vacation',
        } as any)
      ).rejects.toThrow('Leave dates overlap an existing request');
    });

    it('creates a leave request when valid', async () => {
      db.client.setResults([[{ id: 'lt-1', isActive: 1, tenantId: 1n }], [], [{ id: 'req-1', days: 5 }]]);

      const result = await service.createRequest(ctx, {
        leave_type_id: 'lt-1',
        start_date: '2026-07-06',
        end_date: '2026-07-10',
        reason: 'Vacation',
      } as any);

      expect(result.id).toBe('req-1');
      expect(db.client.insert).toHaveBeenCalled();
    });
  });

  describe('review', () => {
    it('throws if user is not owner', async () => {
      await expect(
        service.review(nonOwnerCtx, 'req-1', { status: 'approved' } as any)
      ).rejects.toThrow(BadRequestException);
      expect(db.client.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if pending request not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.review(ctx, 'req-1', { status: 'approved' } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('updates request status and sends notification', async () => {
      db.client.setResults([
        [{ id: 'req-1', userId: 20n, status: 'pending' }],
        [{ id: 'req-1', status: 'approved' }],
      ]);

      const result = await service.review(ctx, 'req-1', {
        status: 'approved',
        notes: 'Enjoy!',
      } as any);

      expect(result.status).toBe('approved');
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 20n, type: 'leave', title: 'Leave request approved' })
      );
    });
  });

  describe('balance', () => {
    it('returns aggregated leave balance by type', async () => {
      db.client.setResults([
        [
          { leaveTypeKey: 'annual', deltaDays: 20 },
          { leaveTypeKey: 'annual', deltaDays: -5 },
          { leaveTypeKey: 'sick', deltaDays: 10 },
        ],
      ]);

      const result = await service.balance(ctx);

      expect(result).toEqual({ annual: 15, sick: 10 });
    });

    it('returns empty object when no ledger rows', async () => {
      db.client.setResults([[]]);

      const result = await service.balance(ctx);

      expect(result).toEqual({});
    });

    it('filters by leave type when specified', async () => {
      db.client.setResults([[{ leaveTypeKey: 'sick', deltaDays: 5 }]]);

      const result = await service.balance(ctx, 'sick');

      expect(result).toEqual({ sick: 5 });
      expect(db.client.where).toHaveBeenCalled();
    });
  });
});