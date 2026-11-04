import { describe, expect, it, vi } from 'vitest';
import { BillingService } from '$apps/platform/billing/repository';
import { BadRequestException, NotFoundException } from '$core/errors';
import { createFakeDb } from '../../support/fake-db';
import {
  billingInvoice,
  billingPaymentAttempt,
  billingWebhookEvent,
  subscriptionPlan,
  subscriptionPlanPrice,
  tenantSubscription,
} from '$apps/platform/billing/model';
import { profile } from '$apps/identity/users/model';
import { tenant } from '$apps/tenancy/model';

describe('BillingService (unit, fake db)', () => {
  const ownerContext = {
    tenantId: 1n,
    profileId: 10n,
    membershipId: 1n,
    isOwner: true,
  } as any;

  const memberContext = {
    tenantId: 1n,
    profileId: 11n,
    membershipId: 2n,
    isOwner: false,
  } as any;

  const mockCache = () => ({
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    ttl: vi.fn().mockResolvedValue(0),
    store: { name: 'redis', isCacheableValue: () => true },
  });

  const mockGateway = () => ({
    name: 'paystack',
    initializeCheckout: vi.fn().mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/access_code',
      accessCode: 'access_code_123',
    }),
    verifyWebhook: vi.fn(),
    parseWebhook: vi.fn(),
  });

  it('returns cached plans without querying the database', async () => {
    const db = createFakeDb();
    const cache = mockCache();
    const cachedPlans = [{ id: 1n, code: 'starter', name: 'Starter Plan' }];
    cache.get.mockResolvedValue(cachedPlans);
    const service = new BillingService(db as any, mockGateway() as any, cache as any);

    const result = await service.listPlans();

    expect(result).toEqual(cachedPlans);
    expect(cache.get).toHaveBeenCalledWith('billing:plans');
    expect(db.selects.length).toBe(0);
  });

  it('queries database and populates cache on cache miss', async () => {
    const db = createFakeDb()
      .queue(subscriptionPlan, [{ id: 1n, code: 'pro', name: 'Pro Plan', isActive: true }])
      .queue(subscriptionPlanPrice, [
        { id: 10n, planId: 1n, amountMinor: 500000, currency: 'NGN', isActive: true },
      ]);
    const cache = mockCache();
    const service = new BillingService(db as any, mockGateway() as any, cache as any);

    const result = await service.listPlans();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Pro Plan');
    expect(result[0].prices.length).toBe(1);
    expect(cache.set).toHaveBeenCalledWith('billing:plans', expect.any(Array), 300);
  });

  it('rejects checkout creation from non-owners', async () => {
    const db = createFakeDb();
    const service = new BillingService(db as any, mockGateway() as any, mockCache() as any);

    await expect(service.createCheckout(memberContext, 'pro')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException if tenant or profile is not found', async () => {
    const db = createFakeDb().queue(tenant, []).queue(profile, []);
    const service = new BillingService(db as any, mockGateway() as any, mockCache() as any);

    await expect(service.createCheckout(ownerContext, 'pro')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('successfully initializes checkout and records invoice for valid plan', async () => {
    const db = createFakeDb()
      .queue(tenant, [{ id: 1n, name: 'Acme', plan: 'pro' }])
      .queue(profile, [{ id: 10n, email: 'owner@acme.com' }])
      .queue(subscriptionPlan, [{ id: 2n, code: 'pro', name: 'Pro', isActive: true }])
      .queue(subscriptionPlanPrice, [
        { id: 20n, planId: 2n, provider: 'paystack', amountMinor: 2500000, currency: 'NGN', isActive: true },
      ])
      .insertReturning(billingInvoice, {
        id: '100',
        tenantId: 1n,
        planId: 2n,
        amountMinor: 2500000,
        currency: 'NGN',
        status: 'pending',
      });

    const gateway = mockGateway();
    const service = new BillingService(db as any, gateway as any, mockCache() as any);

    const checkout = await service.createCheckout(ownerContext, 'pro');

    expect(checkout.invoiceId).toBe('100');
    expect(checkout.authorizationUrl).toBe('https://checkout.paystack.com/access_code');
    expect(gateway.initializeCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@acme.com',
        amountMinor: 2500000,
        currency: 'NGN',
      }),
    );
  });

  it('skips duplicate webhook events when already processed', async () => {
    const db = createFakeDb().queue(billingWebhookEvent, [
      { id: 1n, provider: 'paystack', eventId: 'evt_1', processedAt: new Date() },
    ]);
    const gateway = mockGateway();
    gateway.parseWebhook.mockReturnValue({ eventId: 'evt_1', reference: 'ref_1', type: 'charge.success' });
    const service = new BillingService(db as any, gateway as any, mockCache() as any);

    const result = await service.handlePaystackWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true, duplicate: true });
  });

  it('processes charge.success webhook and marks invoice paid', async () => {
    const db = createFakeDb()
      .queue(billingWebhookEvent, [])
      .insertReturning(billingWebhookEvent, { id: 1n, provider: 'paystack', eventId: 'evt_2' })
      .queue(billingInvoice, [
        {
          id: 'inv_1',
          tenantId: 1n,
          planId: 2n,
          amountMinor: 2500000,
          currency: 'NGN',
          status: 'pending',
          provider: 'paystack',
          providerReference: 'ref_2',
        },
      ])
      .queue(tenantSubscription, []) // active subscription query inside tx
      .queue(subscriptionPlan, [{ id: 2n, code: 'pro' }]); // findPlanById query

    const gateway = mockGateway();
    gateway.parseWebhook.mockReturnValue({
      eventId: 'evt_2',
      reference: 'ref_2',
      type: 'charge.success',
      amountMinor: 2500000,
      currency: 'NGN',
      payload: {},
    });

    const service = new BillingService(db as any, gateway as any, mockCache() as any);

    const result = await service.handlePaystackWebhook(Buffer.from('{}'), 'valid_signature');

    expect(result).toEqual({ received: true, paid: true });
    expect(db.transactions).toBe(1);
    expect(db.updates.some((u) => u.table === billingInvoice && u.values.status === 'paid')).toBe(true);
  });
});
