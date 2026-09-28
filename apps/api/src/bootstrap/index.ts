import Fastify, { type FastifyInstance } from 'fastify';
import { appRoutes } from './routes';
import { config } from '../config';
import { dbPlugin } from '$plugins/db';
import { httpPlugin, logger } from '$plugins/http';

export const API_PREFIX = '/v1';

/**
 * Server composition, the Fastify equivalent of Nest's `AppModule` +
 * `NestFactory.create(AppModule)` in `main.ts`.
 */
export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { level: config.logLevel },
    trustProxy: config.trustProxy,
    bodyLimit: Number(process.env.MAX_BODY_SIZE_BYTES || 25 * 1024 * 1024),
  });

  server.register(dbPlugin);
  server.register(httpPlugin);

  for (const { prefix, plugin } of appRoutes) {
    server.register(plugin, { prefix: `${API_PREFIX}${prefix}` });
  }

  return server;
}

export { logger };
