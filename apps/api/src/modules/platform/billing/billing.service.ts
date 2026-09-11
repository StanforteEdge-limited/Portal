import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { randomBytes } from 'node:crypto';
import { TenantContext } from '$common/auth/tenant-context';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { PAYMENT_GATEWAY_ADAPTER, PaymentGatewayAdapter } from './payment-gateway.adapter';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

@Injectable()
export class BillingService {
  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(PAYMENT_GATEWAY_ADAPTER) private readonly gateway: PaymentGatewayAdapter,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listPlans() {
    const cached = await this.cache.get<any[]>('billing:plans');
    if (cached) return cached;
    const plans = await this.drizzle.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const result = await Promise.all(plans.map(async (plan: any) => ({
      ...plan,
      prices: await this.drizzle.subscriptionPlanPrice.findMany({
        where: { planId: plan.id, isActive: true },
        orderBy: { amountMinor: 'asc' },
      }),
    })));
    await this.cache.set('billing:plans', result, 300);
    return result;
  }

  async getCurrent(context: TenantContext) {
    const subscription = await this.drizzle.tenantSubscription.findFirst({
      where: { tenantId: context.tenantId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return null;
    return this.serialize(subscription, await this.drizzle.subscriptionPlan.findUnique({ where: { id: subscription.planId } }));
  }

  async changePlan(context: TenantContext, dto: ChangeSubscriptionDto) {
    return this.createCheckout(context, dto.plan);
  }

  async createCheckout(context: TenantContext, requestedPlan?: string) {
    this.requireOwner(context);
    const tenant = await this.drizzle.tenant.findUnique({ where: { id: context.tenantId } });
    const profile = await this.drizzle.profile.findUnique({ where: { id: context.profileId } });
    if (!tenant || !profile) throw new NotFoundException('Tenant owner not found');

    const plan = await this.drizzle.subscriptionPlan.findFirst({
      where: { code: (requestedPlan ?? tenant.plan).trim().toLowerCase(), isActive: true },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    const price = await this.drizzle.subscriptionPlanPrice.findFirst({
      where: { planId: plan.id, provider: this.gateway.name, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!price) throw new BadRequestException('No payment price is configured for this plan');

    const reference = `sub_${context.tenantId}_${Date.now()}_${randomBytes(6).toString('hex')}`;
    const invoice = await this.drizzle.billingInvoice.create({
      data: {
        tenantId: context.tenantId,
        planId: plan.id,
        number: `INV-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        amountMinor: price.amountMinor,
        currency: price.currency,
        status: 'pending',
        dueAt: new Date(),
        provider: this.gateway.name,
        providerReference: reference,
      },
    });
    try {
      const payment = await this.gateway.initializeCheckout({
        email: profile.email,
        amountMinor: price.amountMinor,
        currency: price.currency,
        reference,
        callbackUrl: `${process.env.APP_BASE_URL ?? ''}/billing/payment-complete`,
        metadata: { tenantId: context.tenantId.toString(), invoiceId: invoice.id, planId: plan.id },
      });
      await this.drizzle.billingPaymentAttempt.create({
        data: {
          tenantId: context.tenantId,
          invoiceId: invoice.id,
          provider: this.gateway.name,
          reference,
          status: 'initialized',
          authorizationUrl: payment.authorizationUrl,
        },
      });
      return { invoiceId: invoice.id, reference, authorizationUrl: payment.authorizationUrl, accessCode: payment.accessCode };
    } catch (error) {
      await this.drizzle.billingInvoice.update({ where: { id: invoice.id }, data: { status: 'failed' } });
      throw error;
    }
  }

  async handlePaystackWebhook(rawBody: Buffer, signature?: string) {
    this.gateway.verifyWebhook(rawBody, signature);
    const event = this.gateway.parseWebhook(rawBody);
    if (!event.reference) return { received: true };
    const eventId = event.eventId;
    const existing = await this.drizzle.billingWebhookEvent.findFirst({
      where: { provider: this.gateway.name, eventId },
    });
    if (existing?.processedAt) return { received: true, duplicate: true };
    const webhook = existing ?? await this.drizzle.billingWebhookEvent.create({
      data: { provider: this.gateway.name, eventId, eventType: event.type, payload: event.payload },
    });
    if (event.type !== 'charge.success') {
      await this.drizzle.billingWebhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
      return { received: true };
    }

    const invoice = await this.drizzle.billingInvoice.findFirst({
      where: { provider: this.gateway.name, providerReference: event.reference, status: 'pending' },
    });
    if (!invoice || event.amountMinor !== invoice.amountMinor || event.currency !== invoice.currency) {
      throw new BadRequestException('Payment does not match invoice');
    }
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await this.drizzle.$transaction(async (tx) => {
      await tx.billingInvoice.update({ where: { id: invoice.id }, data: { status: 'paid', paidAt: now } });
      await tx.billingPaymentAttempt.updateMany({
        where: { invoiceId: invoice.id, reference: event.reference },
        data: { status: 'succeeded', paidAt: now },
      });
      const active = await tx.tenantSubscription.findFirst({
        where: { tenantId: invoice.tenantId, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: 'desc' },
      });
      if (active) {
        await tx.tenantSubscription.update({ where: { id: active.id }, data: { status: 'cancelled', endsAt: now } });
      }
      await tx.tenantSubscription.create({
        data: {
          tenantId: invoice.tenantId,
          planId: invoice.planId,
          status: 'active',
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          provider: this.gateway.name,
          providerSubscriptionId: event.reference,
        },
      });
    });
    await this.drizzle.tenant.update({
      where: { id: invoice.tenantId },
      data: { plan: (await this.drizzle.subscriptionPlan.findUnique({ where: { id: invoice.planId } }))?.code },
    });
    await this.drizzle.billingWebhookEvent.update({ where: { id: webhook.id }, data: { processedAt: now } });
    return { received: true, paid: true };
  }

  async cancel(context: TenantContext) {
    this.requireOwner(context);
    const current = await this.drizzle.tenantSubscription.findFirst({
      where: { tenantId: context.tenantId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) throw new NotFoundException('Active subscription not found');
    const updated = await this.drizzle.tenantSubscription.update({
      where: { id: current.id },
      data: { cancelAtPeriodEnd: true },
    });
    return this.serialize(updated, await this.drizzle.subscriptionPlan.findUnique({ where: { id: updated.planId } }));
  }

  private requireOwner(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can manage subscriptions');
  }

  private serialize(subscription: any, plan: any) {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId.toString(),
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan,
    };
  }
}
