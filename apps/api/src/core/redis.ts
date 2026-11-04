import type { RedisOptions } from 'ioredis';

/**
 * Single source of truth for Redis connection settings, shared by the Fastify
 * Redis client (cache, locks, health), BullMQ queues/workers and presence.
 *
 * Supports either `REDIS_URL` (redis:// or rediss://) or discrete
 * `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` / `REDIS_TLS`.
 *
 * Note: ioredis (and therefore BullMQ) silently ignores a `url` key inside an
 * options object, so URLs are always parsed into discrete options here.
 */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim());
}

/** `REDIS_REQUIRED=true` makes the API refuse to boot without Redis. */
export function isRedisRequired(): boolean {
  return String(process.env.REDIS_REQUIRED ?? '').toLowerCase() === 'true';
}

export function redisConnectionOptions(overrides: RedisOptions = {}): RedisOptions {
  const base: RedisOptions = {};
  const rawUrl = process.env.REDIS_URL?.trim();

  if (rawUrl) {
    const url = new URL(rawUrl);
    base.host = url.hostname;
    base.port = url.port ? Number(url.port) : 6379;
    if (url.username) base.username = decodeURIComponent(url.username);
    if (url.password) base.password = decodeURIComponent(url.password);
    const db = url.pathname.replace(/^\//, '');
    if (db) base.db = Number(db);
    if (url.protocol === 'rediss:') base.tls = {};
  } else {
    base.host = process.env.REDIS_HOST?.trim() || '127.0.0.1';
    base.port = Number(process.env.REDIS_PORT || 6379);
    if (process.env.REDIS_PASSWORD) base.password = process.env.REDIS_PASSWORD;
    if (process.env.REDIS_DB) base.db = Number(process.env.REDIS_DB);
    if (String(process.env.REDIS_TLS ?? '').toLowerCase() === 'true') base.tls = {};
  }

  return { ...base, ...overrides };
}

/** Namespace for application keys so cache clears never touch BullMQ/locks. */
export function redisKeyPrefix(): string {
  return process.env.REDIS_KEY_PREFIX?.trim() || 'portal:';
}

