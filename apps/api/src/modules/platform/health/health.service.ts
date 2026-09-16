import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { DistributedLockService } from '$common/locks/distributed-lock.service';

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'error';
  checks: {
    database: { status: 'up' | 'down'; latency_ms?: number };
    redis: { status: 'up' | 'down' };
    storage: { driver: string };
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DbService,
    private readonly locks: DistributedLockService,
  ) {}

  async ready(): Promise<HealthCheck> {
    const started = Date.now();
    let database: 'up' | 'down' = 'up';
    try {
      await this.db.client.execute(sql`select 1`);
    } catch {
      database = 'down';
    }

    const redis = (await this.locks.ping()) ? ('up' as const) : ('down' as const);

    const allUp = database === 'up' && redis === 'up';
    return {
      status: allUp ? 'ok' : 'degraded',
      checks: {
        database: { status: database, latency_ms: database === 'up' ? Date.now() - started : undefined },
        redis: { status: redis },
        storage: { driver: 's3' },
      },
      timestamp: new Date().toISOString(),
    };
  }
}