import { Global, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

/**
 * Redis-backed advisory/leader lock so recurring cron jobs run on exactly one
 * API instance in a multi-replica deployment. Degrades gracefully to running
 * unconditionally (single-instance semantics) when Redis is unavailable.
 */
@Global()
@Injectable()
export class DistributedLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis?: Redis;
  private connected = false;

  private redisOptions() {
    return {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    };
  }

  async onModuleInit() {
    const redis = new Redis(this.redisOptions());
    try {
      await redis.connect();
      await redis.ping();
      this.redis = redis;
      this.connected = true;
      this.logger.log('Distributed lock service ready');
    } catch (error) {
      this.logger.warn(
        `Distributed lock service unavailable; cron jobs may double-fire: ${(error as Error)?.message}`,
      );
      try {
        await redis.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Runs `operation` only if the distributed lock `name` is acquired; returns
   * `null` when another instance holds the lock. `operation` is always run when
   * Redis is not available (single-instance behavior).
   */
  async withLock<T>(name: string, ttlMs: number, operation: () => Promise<T>): Promise<T | null> {
    if (!this.connected || !this.redis) return operation();
    const key = `portal:lock:${name}`;
    const token = `${process.pid}-${randomUUID()}`;
    const acquired = await this.redis.set(key, token, 'PX', Math.max(1000, ttlMs), 'NX');
    if (acquired !== 'OK') {
      this.logger.debug(`Lock "${name}" already held by another instance; skipping this tick`);
      return null;
    }
    try {
      return await operation();
    } finally {
      await this.releaseIfOwned(key, token);
    }
  }

  async ping(): Promise<boolean> {
    if (!this.redis || !this.connected) return false;
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private async releaseIfOwned(key: string, token: string) {
    const lua = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
    try {
      await this.redis!.eval(lua, 1, key, token);
    } catch {
      /* lock will expire via TTL */
    }
  }
}