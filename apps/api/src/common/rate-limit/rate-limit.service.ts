import { Global, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { MemoryStore, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

/**
 * Provides a shared, Redis-backed store for express-rate-limit so rate-limit
 * counters are consistent across API instances (SCALING). Falls back to the
 * in-process MemoryStore for single-box dev if Redis is unreachable at boot.
 */
@Global()
@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis?: Redis;
  private rateLimitStore?: Store;

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
      const prefix = String(process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:');
      this.rateLimitStore = new RedisStore({
        prefix,
        sendCommand: (...args: string[]): Promise<RedisReply> =>
          this.redis!.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
      });
      this.logger.log('Rate limiting backed by Redis');
    } catch (error) {
      this.logger.warn(
        `Redis unavailable for rate limiting; falling back to in-memory store: ${(error as Error)?.message}`,
      );
      try {
        await redis.disconnect();
      } catch {
        /* ignore */
      }
      this.redis = undefined;
      this.rateLimitStore = new MemoryStore();
      this.logger.warn(
        'WARNING: in-memory rate limiting is per-instance only - use Redis in multi-replica deployments',
      );
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
      this.redis = undefined;
    }
  }

  get store(): Store {
    if (!this.rateLimitStore) {
      // Fallback for the unlikely case a middleware is registered before init.
      this.rateLimitStore = new MemoryStore();
    }
    return this.rateLimitStore;
  }
}