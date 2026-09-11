import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '$common/auth/tenant-context';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';

@Injectable()
export class BillingService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listPlans() {
    return this.drizzle.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { amountMinor: 'asc' },
    });
  }

  async getCurrent(context: TenantContext) {
    const subscription = await this.drizzle.tenantSubscription.findFirst({
      where: { tenantId: context.tenantId, status: { in: ['active', 'trialing', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return null;
    return this.serialize(subscription, await this.drizzle.subscriptionPlan.findUnique({ where: { id: subscription.planId } }));
  }

  async changePlan(context: TenantContext, dto: ChangeSubscriptionDto) {
    this.requireOwner(context);
    const plan = await this.drizzle.subscriptionPlan.findFirst({
      where: { code: dto.plan.trim().toLowerCase(), isActive: true },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const current = await this.drizzle.tenantSubscription.findFirst({
      where: { tenantId: context.tenantId, status: { in: ['active', 'trialing', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const subscription = await this.drizzle.$transaction(async (tx) => {
      if (current) {
        await tx.tenantSubscription.update({
          where: { id: current.id },
          data: { status: 'cancelled', endsAt: now },
        });
      }
      return tx.tenantSubscription.create({
        data: {
          tenantId: context.tenantId,
          planId: plan.id,
          status: 'active',
          startsAt: now,
        },
      });
    });
    await this.drizzle.tenant.update({
      where: { id: context.tenantId },
      data: { plan: plan.code },
    });
    return this.serialize(subscription, plan);
  }

  async cancel(context: TenantContext) {
    this.requireOwner(context);
    const current = await this.drizzle.tenantSubscription.findFirst({
      where: { tenantId: context.tenantId, status: { in: ['active', 'trialing', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) throw new NotFoundException('Active subscription not found');
    const updated = await this.drizzle.tenantSubscription.update({
      where: { id: current.id },
      data: { status: 'cancelled', endsAt: new Date() },
    });
    const plan = await this.drizzle.subscriptionPlan.findUnique({ where: { id: updated.planId } });
    return this.serialize(updated, plan);
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
      plan,
    };
  }
}
