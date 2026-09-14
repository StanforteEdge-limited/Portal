import { Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { desc, eq, and } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContext } from '$common/auth/tenant-context';
import { analyticsEvent } from './model';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DbService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async track(input: {
    name: string;
    source: string;
    properties?: unknown;
    context?: TenantContext;
  }) {
    const context = input.context;
    const [event] = await this.db.client
      .insert(analyticsEvent)
      .values({
        tenantId: context?.tenantId,
        profileId: context?.profileId,
        name: input.name,
        source: input.source,
        properties: input.properties,
      })
      .returning();
    return event ?? null;
  }

  async list(context: TenantContext, name?: string) {
    const key = `analytics:${context.tenantId.toString()}:${name ?? '*'}`;
    const cached = await this.cache.get<any[]>(key);
    if (cached) return cached;
    const where = name
      ? and(eq(analyticsEvent.tenantId, context.tenantId), eq(analyticsEvent.name, name))
      : eq(analyticsEvent.tenantId, context.tenantId);
    const events = await this.db.client
      .select()
      .from(analyticsEvent)
      .where(where)
      .orderBy(desc(analyticsEvent.occurredAt))
      .limit(200);
    await this.cache.set(key, events, 30);
    return events;
  }
}
