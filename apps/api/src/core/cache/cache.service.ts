import Redis from 'ioredis';
import { Logger } from '$core/logger';

export interface CacheStoreLike {
  name: string;
  isCacheableValue(value: unknown): boolean;
}

export interface CacheLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** `ttlMs` is in milliseconds, matching the `cache-manager` contract the services were written against. */
  set(key: string, value: unknown, ttlMs?: number): Promise<unknown>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  ttl(key: string): Promise<number>;
  store: CacheStoreLike;
}

function redisOptions() {
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
}

/**
 * Redis-backed cache used by analytics and billing. Replaces the Nest
 * `AppCacheModule` (`cache-manager-ioredis-yet`) so the Fastify build keeps a
 * single shared cache across API instances without extra dependencies.
 */
export class CacheService implements CacheLike {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly defaultTtl: number;
  private connected = false;

  readonly store: CacheStoreLike = {
    name: 'redis',
    isCacheableValue: (value: unknown) => value !== undefined,
  };

  constructor() {
    this.defaultTtl = Number(process.env.CACHE_TTL_SECONDS ?? 300);
    this.client = new Redis({ ...redisOptions(), lazyConnect: true });
  }
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.ping();
      this.connected = true;
      this.logger.log('Cache ready');
    } catch (error) {
      this.logger.warn(`Cache unavailable; continuing without shared cache: ${(error as Error)?.message}`);
      this.client.disconnect();
      this.connected = false;
    }
  }

  async close(): Promise<void> {
    if (this.connected) await this.client.quit();
    else this.client.disconnect();
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.connected) return undefined;
    try {
      const raw = await this.client.get(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<unknown> {
    if (!this.connected) return undefined;
    const seconds = Math.max(1, Math.ceil((ttlMs ?? this.defaultTtl) / 1000));
    return this.client.set(key, JSON.stringify(value), 'EX', seconds);
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    if (!this.connected) return;
    const keys = await this.client.keys('*');
    if (keys.length) await this.client.del(...keys);
  }

  async ttl(key: string): Promise<number> {
    if (!this.connected) return 0;
    return this.client.ttl(key);
  }
}
