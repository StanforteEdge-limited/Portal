import fastifyRedis from '@fastify/redis';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Logger } from '$core/logger';

const logger = new Logger('RedisPlugin');

export function redisOptions() {
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
}

function shouldRegisterRedis(): boolean {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

export const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  if (!shouldRegisterRedis()) {
    logger.warn('Redis is not configured; cache and distributed locks will run in degraded mode');
    return;
  }

  await fastify.register(fastifyRedis, process.env.REDIS_URL ? { url: process.env.REDIS_URL } : redisOptions());
});
