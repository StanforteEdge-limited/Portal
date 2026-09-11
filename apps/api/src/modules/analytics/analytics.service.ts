import { Injectable } from '@nestjs/common';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContext } from '$common/auth/tenant-context';

@Injectable()
export class AnalyticsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async track(input: {
    name: string;
    source: string;
    properties?: Drizzle.InputJsonValue;
    context?: TenantContext;
  }) {
    const context = input.context;
    return this.drizzle.analyticsEvent.create({
      data: {
        tenantId: context?.tenantId,
        profileId: context?.profileId,
        name: input.name,
        source: input.source,
        properties: input.properties,
      },
    });
  }

  async list(context: TenantContext, name?: string) {
    return this.drizzle.analyticsEvent.findMany({
      where: { tenantId: context.tenantId, ...(name ? { name } : {}) },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }
}
