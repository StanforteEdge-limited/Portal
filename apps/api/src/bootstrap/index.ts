import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { appRoutes } from './routes';
import { config } from '../config';
import { dbPlugin } from '$plugins/db';
import { httpPlugin, logger } from '$plugins/http';
import { redisPlugin } from '$plugins/redis';

export const API_PREFIX = '/v1';

/** Server composition for the Fastify API. */
export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { level: config.logLevel },
    trustProxy: config.trustProxy,
    bodyLimit: Number(process.env.MAX_BODY_SIZE_BYTES || 25 * 1024 * 1024),
  });

  server.register(fastifyCookie);
  server.register(dbPlugin);
  server.register(redisPlugin);
  server.register(httpPlugin);

  for (const { prefix, plugin } of appRoutes) {
    server.register(plugin, { prefix: `${API_PREFIX}${prefix}` });
  }

  return server;
}

export { logger };
