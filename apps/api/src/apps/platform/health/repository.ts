import { sql } from 'drizzle-orm';
import { DbService } from '$core/db';
import { DistributedLockService } from '$core/locks';
import type { HealthCheck } from './model';

export class HealthService {
  constructor(
    private readonly db: DbService,
    private readonly locks: DistributedLockService,
  ) {}

  async ready(): Promise<HealthCheck> {
    const started = Date.now();
    let database: HealthCheck['database'] = 'down';
    try {
      await this.db.client.execute(sql`select 1`);
      database = 'up';
    } catch {
      database = 'down';
    }

    const redis = (await this.locks.ping()) ? ('up' as const) : ('down' as const);
    const allUp = database === 'up' && redis === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database,
      redis,
      version: process.env.APP_VERSION || process.env.npm_package_version || 'dev',
      checks: { database: database === 'up', redis: redis === 'up' },
    };
  }
}
