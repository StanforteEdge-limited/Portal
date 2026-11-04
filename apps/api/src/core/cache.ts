import type { Redis } from 'ioredis';
import { Logger } from '$core/logger';
import { redisKeyPrefix } from '$core/redis';

export interface CacheStoreLike {
  name: string;
  isCacheableValue(value: unknown): boolean;
}

export interface CacheLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** `ttlSeconds` defaults to `CACHE_TTL_SECONDS` (300). */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<unknown>;
  del(key: string): Promise<void>;
  /** Removes only keys written by this cache (prefixed), never queue/lock keys. */
  clear(): Promise<void>;
  /** Remaining TTL in seconds; 0 when missing or cache is unavailable. */
  ttl(key: string): Promise<number>;
  store: CacheStoreLike;
}

const BIGINT_TAG = '__bigint__';

/** JSON cannot represent BigInt (DB ids); tag them so they round-trip. */
function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? { [BIGINT_TAG]: v.toString() } : v));
}

function deserialize<T>(raw: string): T {
  return JSON.parse(raw, (_key, v) =>
    v && typeof v === 'object' && typeof v[BIGINT_TAG] === 'string' && Object.keys(v).length === 1
      ? BigInt(v[BIGINT_TAG])
      : v,
  ) as T;
}

/**
 * Redis-backed cache (analytics, billing). Every operation is best-effort:
 * when Redis is absent or errors, reads miss and writes are skipped so the
 * request still succeeds from the database.
 */
export class CacheService implements CacheLike {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtlSeconds: number;
  private readonly prefix: string;
  private connected = false;

  readonly store: CacheStoreLike = {
    name: 'redis',
    isCacheableValue: (value: unknown) => value !== undefined,
  };

  constructor(private readonly client?: Redis) {
    this.defaultTtlSeconds = Math.max(1, Number(process.env.CACHE_TTL_SECONDS ?? 300));
    this.prefix = `${redisKeyPrefix()}cache:`;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.connected = false;
      this.logger.warn('Cache disabled; Redis is not available');
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

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.connected || !this.client) return undefined;
    try {
      const raw = await this.client.get(this.k(key));
      return raw === null ? undefined : deserialize<T>(raw);
    } catch (error) {
      this.logger.debug(`cache get failed for ${key}: ${(error as Error)?.message}`);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<unknown> {
    if (!this.connected || !this.client || !this.store.isCacheableValue(value)) return undefined;
    const seconds = Math.max(1, Math.ceil(ttlSeconds ?? this.defaultTtlSeconds));
    try {
      return await this.client.set(this.k(key), serialize(value), 'EX', seconds);
    } catch (error) {
      this.logger.debug(`cache set failed for ${key}: ${(error as Error)?.message}`);
      return undefined;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      await this.client.del(this.k(key));
    } catch (error) {
      this.logger.debug(`cache del failed for ${key}: ${(error as Error)?.message}`);
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 500);
        cursor = next;
        if (keys.length) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`cache clear failed: ${(error as Error)?.message}`);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.connected || !this.client) return 0;
    try {
      return Math.max(0, await this.client.ttl(this.k(key)));
    } catch {
      return 0;
    }
  }
}
