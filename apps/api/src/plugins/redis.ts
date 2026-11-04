import Redis from 'ioredis';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Logger } from '$core/logger';
import { isRedisConfigured, isRedisRequired, redisConnectionOptions } from '$core/redis';

const logger = new Logger('RedisPlugin');

declare module 'fastify' {
  interface FastifyInstance {
    /** Present only when Redis is configured AND reachable at boot. */
    redis?: Redis;
  }
}

/** Kept for backwards compatibility with existing imports. */
export function redisOptions() {
  return redisConnectionOptions({ maxRetriesPerRequest: 1, enableOfflineQueue: false });
}

/**
 * Connects the shared Redis client used by cache, distributed locks and health.
 *
 * - Not configured             -> warn, run degraded (no cache, inline mail/jobs).
 * - Configured but unreachable -> warn and run degraded, or fail boot when
 *                                 `REDIS_REQUIRED=true`.
 */
export const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  if (!isRedisConfigured()) {
    if (isRedisRequired()) throw new Error('REDIS_REQUIRED=true but REDIS_URL/REDIS_HOST is not set');
    logger.warn('Redis is not configured; cache disabled and queues will run inline');
    return;
  }

  const client = new Redis(
    redisConnectionOptions({
      lazyConnect: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    }),
  );
  // Without a listener ioredis prints unhandled error events on every retry.
  client.on('error', (error) => logger.debug(`Redis error: ${error.message}`));

  try {
    await client.connect();
    await client.ping();
    logger.log(`Redis connected (${client.options.host}:${client.options.port})`);
  } catch (error) {
    client.disconnect();
    const message = `Redis unreachable: ${(error as Error)?.message}`;
    if (isRedisRequired()) throw new Error(message);
    logger.warn(`${message}; cache disabled and queues will run inline`);
    return;
  }

  fastify.decorate('redis', client);
  fastify.addHook('onClose', async () => {
    await client.quit().catch(() => client.disconnect());
  });
});
