import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isRedisConfigured, isRedisRequired, redisConnectionOptions, redisKeyPrefix } from '$core/redis';

describe('redis configuration helpers (unit)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_REQUIRED;
    delete process.env.REDIS_KEY_PREFIX;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('detects when redis is not configured', () => {
    expect(isRedisConfigured()).toBe(false);
  });

  it('detects configured redis from REDIS_URL or REDIS_HOST', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    expect(isRedisConfigured()).toBe(true);

    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'redis.internal';
    expect(isRedisConfigured()).toBe(true);
  });

  it('detects when redis is strictly required', () => {
    expect(isRedisRequired()).toBe(false);
    process.env.REDIS_REQUIRED = 'true';
    expect(isRedisRequired()).toBe(true);
    process.env.REDIS_REQUIRED = 'false';
    expect(isRedisRequired()).toBe(false);
  });

  it('parses full redis:// URL into discrete options for BullMQ compatibility', () => {
    process.env.REDIS_URL = 'redis://user:secretpass@redis.example.com:6380/2';

    const opts = redisConnectionOptions();

    expect(opts.host).toBe('redis.example.com');
    expect(opts.port).toBe(6380);
    expect(opts.username).toBe('user');
    expect(opts.password).toBe('secretpass');
    expect(opts.db).toBe(2);
    expect(opts.tls).toBeUndefined();
  });

  it('parses rediss:// (TLS) URL correctly', () => {
    process.env.REDIS_URL = 'rediss://:secret@upstash.io:6379';

    const opts = redisConnectionOptions();

    expect(opts.host).toBe('upstash.io');
    expect(opts.port).toBe(6379);
    expect(opts.password).toBe('secret');
    expect(opts.tls).toEqual({});
  });

  it('falls back to discrete host/port/db variables when URL is absent', () => {
    process.env.REDIS_HOST = '10.0.0.5';
    process.env.REDIS_PORT = '6381';
    process.env.REDIS_PASSWORD = 'discrete-secret';
    process.env.REDIS_DB = '3';
    process.env.REDIS_TLS = 'true';

    const opts = redisConnectionOptions({ connectTimeout: 1000 });

    expect(opts.host).toBe('10.0.0.5');
    expect(opts.port).toBe(6381);
    expect(opts.password).toBe('discrete-secret');
    expect(opts.db).toBe(3);
    expect(opts.tls).toEqual({});
    expect(opts.connectTimeout).toBe(1000);
  });

  it('formats prefix correctly with default or custom override', () => {
    expect(redisKeyPrefix()).toBe('portal:');
    process.env.REDIS_KEY_PREFIX = 'staging:';
    expect(redisKeyPrefix()).toBe('staging:');
  });
});
