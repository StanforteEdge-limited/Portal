import type { Redis } from 'ioredis';
import { Logger } from '$core/logger';

export interface CacheStoreLike {
  name: string;
  isCacheableValue(value: unknown): boolean;
}

export interface CacheLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** `ttlMs` is in milliseconds. */
  set(key: string, value: unknown, ttlMs?: number): Promise<unknown>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  ttl(key: string): Promise<number>;
  store: CacheStoreLike;
}

/** Redis-backed cache used by analytics and billing. */
export class CacheService implements CacheLike {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl: number;
  private connected = false;

  readonly store: CacheStoreLike = {
    name: 'redis',
    isCacheableValue: (value: unknown) => value !== undefined,
  };

  constructor(private readonly client?: Redis) {
    this.defaultTtl = Number(process.env.CACHE_TTL_SECONDS ?? 300);
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.connected = false;
      this.logger.warn('Cache unavailable; Redis plugin is not configured');
      return;
    }

    try {
      await this.client.ping();
      this.connected = true;
      this.logger.log('Cache ready');
    } catch (error) {
      this.logger.warn(`Cache unavailable; continuing without shared cache: ${(error as Error)?.message}`);
      this.connected = false;
    }
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.connected || !this.client) return undefined;
    try {
      const raw = await this.client.get(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<unknown> {
    if (!this.connected || !this.client) return undefined;
    const seconds = Math.max(1, Math.ceil((ttlMs ?? this.defaultTtl) / 1000));
    return this.client.set(key, JSON.stringify(value), 'EX', seconds);
  }

  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.client) return;
    const keys = await this.client.keys('*');
    if (keys.length) await this.client.del(...keys);
  }

  async ttl(key: string): Promise<number> {
    if (!this.connected || !this.client) return 0;
    return this.client.ttl(key);
  }
}
