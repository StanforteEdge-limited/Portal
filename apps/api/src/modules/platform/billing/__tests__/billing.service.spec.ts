import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from '$modules/platform/billing/billing.service';

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

describe('BillingService', () => {
  const db: any = { client: buildClient() };
  db.client.transaction = jest.fn(async (cb: any) => cb(db.client));

  const gateway: any = {
    name: 'paystack',
    initializeCheckout: jest.fn(),
    verifyWebhook: jest.fn(),
    parseWebhook: jest.fn(),
  };
  const cache: any = { get: jest.fn(), set: jest.fn() };

  const service = new BillingService(db, gateway, cache);

  const ownerCtx = { tenantId: 1n, profileId: 10n, isOwner: true } as any;
  const nonOwnerCtx = { tenantId: 1n, profileId: 10n, isOwner: false } as any;

  beforeEach(() => jest.clearAllMocks());

  describe('listPlans', () => {
    it('returns cached plans when available', async () => {
      const cached = [{ id: 'plan-1', name: 'Starter', prices: [] }];
      cache.get.mockResolvedValue(cached);

      const result = await service.listPlans();

      expect(result).toEqual(cached);
      expect(db.client.select).not.toHaveBeenCalled();
    });

    it('fetches plans with prices from database when cache is empty', async () => {
      cache.get.mockResolvedValue(null);
      db.client.setResults([[{ id: 'plan-1', name: 'Starter' }], []]);

      const result = await service.listPlans();

      expect(result).toHaveLength(1);
      expect(result[0].prices).toEqual([]);
      expect(cache.set).toHaveBeenCalledWith('billing:plans', expect.any(Array), 300);
    });
  });

  describe('getCurrent', () => {
    it('returns null when no active subscription', async () => {
      db.client.setResults([[]]);

      const result = await service.getCurrent(ownerCtx);

      expect(result).toBeNull();
    });

    it('returns serialized subscription when found', async () => {
      db.client.setResults([
        [{ id: 'sub-1', planId: 'plan-1', status: 'active', tenantId: 1n }],
        [{ id: 'plan-1', name: 'Starter', code: 'starter' }],
      ]);

      const result = await service.getCurrent(ownerCtx);

      expect(result.id).toBe('sub-1');
      expect(result.plan.name).toBe('Starter');
    });
  });

  describe('cancel', () => {
    it('throws if user is not owner', async () => {
      await expect(service.cancel(nonOwnerCtx)).rejects.toThrow(BadRequestException);
      expect(db.client.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no active subscription', async () => {
      db.client.setResults([[]]);

      await expect(service.cancel(ownerCtx)).rejects.toThrow(NotFoundException);
    });

    it('sets cancelAtPeriodEnd on the active subscription', async () => {
      db.client.setResults([
        [{ id: 'sub-1', planId: 'plan-1', status: 'active' }],
        [{ id: 'sub-1', cancelAtPeriodEnd: true, planId: 'plan-1' }],
        [{ id: 'plan-1', name: 'Starter' }],
      ]);

      const result = await service.cancel(ownerCtx);

      expect(result.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('createCheckout', () => {
    it('throws if user is not owner', async () => {
      await expect(service.createCheckout(nonOwnerCtx)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when tenant not found', async () => {
      db.client.setResults([[]]);

      await expect(service.createCheckout(ownerCtx)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when plan not found', async () => {
      db.client.setResults([
        [{ id: 't-1', plan: 'starter' }],
        [{ id: 10n, email: 'test@test.com' }],
        null,
      ]);

      await expect(service.createCheckout(ownerCtx, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no price configured', async () => {
      db.client.setResults([
        [{ id: 't-1', plan: 'starter' }],
        [{ id: 10n, email: 'test@test.com' }],
        [{ id: 'plan-1', code: 'starter', isActive: true }],
        [],
      ]);

      await expect(service.createCheckout(ownerCtx)).rejects.toThrow(BadRequestException);
    });

    it('creates checkout and records payment attempt', async () => {
      db.client.setResults([
        [{ id: 't-1', plan: 'starter' }],
        [{ id: 10n, email: 'test@test.com' }],
        [{ id: 'plan-1', code: 'starter', isActive: true }],
        [{ id: 'price-1', amountMinor: 50000, currency: 'NGN', isActive: true }],
        [{ id: 'inv-1' }],
        [{}],
      ]);
      gateway.initializeCheckout.mockResolvedValue({ authorizationUrl: 'https://pay.url', accessCode: 'code' });

      const result = await service.createCheckout(ownerCtx);

      expect(result.invoiceId).toBe('inv-1');
      expect(result.authorizationUrl).toBe('https://pay.url');
      expect(db.client.insert).toHaveBeenCalled();
    });
  });

  describe('handlePaystackWebhook', () => {
    it('returns early if event has no reference', async () => {
      gateway.parseWebhook.mockReturnValue({ eventId: 'evt-1', type: 'charge.success', payload: {} });

      const result = await service.handlePaystackWebhook(Buffer.from(''), 'sig');

      expect(result.received).toBe(true);
      expect(db.client.select).not.toHaveBeenCalled();
    });

    it('returns duplicate when event was already processed', async () => {
      gateway.parseWebhook.mockReturnValue({ eventId: 'evt-1', type: 'charge.success', reference: 'ref-1', payload: {} });
      db.client.setResults([[{ id: 'web-1', processedAt: new Date() }]]);

      const result = await service.handlePaystackWebhook(Buffer.from(''), 'sig');

      expect(result.duplicate).toBe(true);
    });

    it('marks non-charge.success events as processed without payment', async () => {
      gateway.parseWebhook.mockReturnValue({ eventId: 'evt-1', type: 'charge.failed', reference: 'ref-1', payload: {} });
      db.client.setResults([[], [{ id: 'web-1' }], []]);

      const result = await service.handlePaystackWebhook(Buffer.from(''), 'sig');

      expect(result.received).toBe(true);
      expect(result.paid).toBeUndefined();
      expect(db.client.update).toHaveBeenCalled();
    });

    it('throws BadRequestException when payment does not match invoice', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventId: 'evt-1',
        type: 'charge.success',
        reference: 'ref-1',
        amountMinor: 99999,
        currency: 'NGN',
        payload: {},
      });
      db.client.setResults([
        [],
        [{ id: 'web-1' }],
        [{ id: 'inv-1', amountMinor: 50000, currency: 'NGN', status: 'pending', tenantId: 1n, planId: 'plan-1', provider: 'paystack', providerReference: 'ref-1' }],
      ]);

      await expect(service.handlePaystackWebhook(Buffer.from(''), 'sig')).rejects.toThrow(BadRequestException);
    });
  });
});