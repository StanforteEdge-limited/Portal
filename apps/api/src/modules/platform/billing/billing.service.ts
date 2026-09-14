import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { TenantContext } from '$common/auth/tenant-context';
import { DbService } from '$common/db/db.service';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import {
  billingInvoice,
  billingPaymentAttempt,
  billingWebhookEvent,
  subscriptionPlan,
  subscriptionPlanPrice,
  TenantSubscription,
  tenantSubscription,
} from './model';
import { PAYMENT_GATEWAY_ADAPTER, PaymentGatewayAdapter } from './payment-gateway.adapter';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

@Injectable()
export class BillingService {
  constructor(
    private readonly db: DbService,
    @Inject(PAYMENT_GATEWAY_ADAPTER) private readonly gateway: PaymentGatewayAdapter,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listPlans() {
    const cached = await this.cache.get<any[]>('billing:plans');
    if (cached) return cached;
    const plans = await this.db.client
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.isActive, true))
      .orderBy(asc(subscriptionPlan.name));
    const result = await Promise.all(plans.map(async (plan: any) => ({
      ...plan,
      prices: await this.db.client
        .select()
        .from(subscriptionPlanPrice)
        .where(and(eq(subscriptionPlanPrice.planId, plan.id), eq(subscriptionPlanPrice.isActive, true)))
        .orderBy(asc(subscriptionPlanPrice.amountMinor)),
    })));
    await this.cache.set('billing:plans', result, 300);
    return result;
  }

  async getCurrent(context: TenantContext) {
    const subscription = await this.findCurrentSubscription(context.tenantId);
    if (!subscription) return null;
    return this.serialize(subscription, await this.findPlanById(subscription.planId));
  }

  async changePlan(context: TenantContext, dto: ChangeSubscriptionDto) {
    return this.createCheckout(context, dto.plan);
  }

  async createCheckout(context: TenantContext, requestedPlan?: string) {
    this.requireOwner(context);
    const [tenantRecord] = await this.db.client.select().from(tenant).where(eq(tenant.id, context.tenantId)).limit(1);
    const [profileRecord] = await this.db.client.select().from(profile).where(eq(profile.id, context.profileId)).limit(1);
    if (!tenantRecord || !profileRecord) throw new NotFoundException('Tenant owner not found');

    const plan = await this.findPlanByCode((requestedPlan ?? tenantRecord.plan).trim().toLowerCase());
    if (!plan) throw new NotFoundException('Subscription plan not found');
    const [price] = await this.db.client
      .select()
      .from(subscriptionPlanPrice)
      .where(and(
        eq(subscriptionPlanPrice.planId, plan.id),
        eq(subscriptionPlanPrice.provider, this.gateway.name),
        eq(subscriptionPlanPrice.isActive, true),
      ))
      .orderBy(desc(subscriptionPlanPrice.createdAt))
      .limit(1);
    if (!price) throw new BadRequestException('No payment price is configured for this plan');

    const reference = `sub_${context.tenantId}_${Date.now()}_${randomBytes(6).toString('hex')}`;
    const [invoice] = await this.db.client
      .insert(billingInvoice)
      .values({
        tenantId: context.tenantId,
        planId: plan.id,
        number: `INV-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        amountMinor: price.amountMinor,
        currency: price.currency,
        status: 'pending',
        dueAt: new Date(),
        provider: this.gateway.name,
        providerReference: reference,
      })
      .returning();
    try {
      const payment = await this.gateway.initializeCheckout({
        email: profileRecord.email,
        amountMinor: price.amountMinor,
        currency: price.currency,
        reference,
        callbackUrl: `${process.env.APP_BASE_URL ?? ''}/billing/payment-complete`,
        metadata: { tenantId: context.tenantId.toString(), invoiceId: invoice.id, planId: plan.id },
      });
      await this.db.client.insert(billingPaymentAttempt).values({
          tenantId: context.tenantId,
          invoiceId: invoice.id,
          provider: this.gateway.name,
          reference,
          status: 'initialized',
          authorizationUrl: payment.authorizationUrl,
      });
      return { invoiceId: invoice.id, reference, authorizationUrl: payment.authorizationUrl, accessCode: payment.accessCode };
    } catch (error) {
      await this.db.client.update(billingInvoice).set({ status: 'failed' }).where(eq(billingInvoice.id, invoice.id));
      throw error;
    }
  }

  async handlePaystackWebhook(rawBody: Buffer, signature?: string) {
    this.gateway.verifyWebhook(rawBody, signature);
    const event = this.gateway.parseWebhook(rawBody);
    if (!event.reference) return { received: true };
    const eventId = event.eventId;
    const [existing] = await this.db.client
      .select()
      .from(billingWebhookEvent)
      .where(and(eq(billingWebhookEvent.provider, this.gateway.name), eq(billingWebhookEvent.eventId, eventId)))
      .limit(1);
    if (existing?.processedAt) return { received: true, duplicate: true };
    const webhook = existing ?? (await this.db.client
      .insert(billingWebhookEvent)
      .values({ provider: this.gateway.name, eventId, eventType: event.type, payload: event.payload })
      .returning())[0];
    if (event.type !== 'charge.success') {
      await this.db.client.update(billingWebhookEvent).set({ processedAt: new Date() }).where(eq(billingWebhookEvent.id, webhook.id));
      return { received: true };
    }

    const [invoice] = await this.db.client
      .select()
      .from(billingInvoice)
      .where(and(
        eq(billingInvoice.provider, this.gateway.name),
        eq(billingInvoice.providerReference, event.reference),
        eq(billingInvoice.status, 'pending'),
      ))
      .limit(1);
    if (!invoice || event.amountMinor !== invoice.amountMinor || event.currency !== invoice.currency) {
      throw new BadRequestException('Payment does not match invoice');
    }
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await this.db.client.transaction(async (tx) => {
      await tx.update(billingInvoice).set({ status: 'paid', paidAt: now }).where(eq(billingInvoice.id, invoice.id));
      await tx.update(billingPaymentAttempt)
        .set({ status: 'succeeded', paidAt: now })
        .where(and(eq(billingPaymentAttempt.invoiceId, invoice.id), eq(billingPaymentAttempt.reference, event.reference)));
      const [active] = await tx
        .select()
        .from(tenantSubscription)
        .where(and(eq(tenantSubscription.tenantId, invoice.tenantId), inArray(tenantSubscription.status, ACTIVE_STATUSES)))
        .orderBy(desc(tenantSubscription.createdAt))
        .limit(1);
      if (active) {
        await tx.update(tenantSubscription).set({ status: 'cancelled', endsAt: now }).where(eq(tenantSubscription.id, active.id));
      }
      await tx.insert(tenantSubscription).values({
          tenantId: invoice.tenantId,
          planId: invoice.planId,
          status: 'active',
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          provider: this.gateway.name,
          providerSubscriptionId: event.reference,
      });
    });
    const plan = await this.findPlanById(invoice.planId);
    if (plan) {
      await this.db.client.update(tenant).set({ plan: plan.code }).where(eq(tenant.id, invoice.tenantId));
    }
    await this.db.client.update(billingWebhookEvent).set({ processedAt: now }).where(eq(billingWebhookEvent.id, webhook.id));
    return { received: true, paid: true };
  }

  async cancel(context: TenantContext) {
    this.requireOwner(context);
    const current = await this.findCurrentSubscription(context.tenantId);
    if (!current) throw new NotFoundException('Active subscription not found');
    const [updated] = await this.db.client
      .update(tenantSubscription)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(tenantSubscription.id, current.id))
      .returning();
    return this.serialize(updated, await this.findPlanById(updated.planId));
  }

  private requireOwner(context: TenantContext) {
    if (!context.isOwner) throw new BadRequestException('Only tenant owners can manage subscriptions');
  }

  private async findCurrentSubscription(tenantId: bigint) {
    const [subscription] = await this.db.client
      .select()
      .from(tenantSubscription)
      .where(and(eq(tenantSubscription.tenantId, tenantId), inArray(tenantSubscription.status, ACTIVE_STATUSES)))
      .orderBy(desc(tenantSubscription.createdAt))
      .limit(1);
    return subscription ?? null;
  }

  private async findPlanById(planId: string) {
    const [plan] = await this.db.client
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.id, planId))
      .limit(1);
    return plan ?? null;
  }

  private async findPlanByCode(code: string) {
    const [plan] = await this.db.client
      .select()
      .from(subscriptionPlan)
      .where(and(eq(subscriptionPlan.code, code), eq(subscriptionPlan.isActive, true)))
      .limit(1);
    return plan ?? null;
  }

  private serialize(subscription: TenantSubscription, plan: typeof subscriptionPlan.$inferSelect | null) {
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
