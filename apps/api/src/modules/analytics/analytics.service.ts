import { Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContext } from '$common/auth/tenant-context';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

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
    const key = `analytics:${context.tenantId.toString()}:${name ?? '*'}`;
    const cached = await this.cache.get<any[]>(key);
    if (cached) return cached;
    const events = await this.drizzle.analyticsEvent.findMany({
      where: { tenantId: context.tenantId, ...(name ? { name } : {}) },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    await this.cache.set(key, events, 30);
    return events;
  }
}
