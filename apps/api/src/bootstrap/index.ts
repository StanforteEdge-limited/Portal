import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { appRoutes } from './routes';
import { config } from '../config';
import { extractAccessToken } from '$core/auth/guards';
import { dbPlugin } from '$plugins/db';
import { httpPlugin, logger } from '$plugins/http';
import { redisPlugin } from '$plugins/redis';

export const API_PREFIX = '/v1';

/** Server composition for the Fastify API. */
export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { level: config.logLevel },
    trustProxy: config.trustProxy,
    bodyLimit: Number(process.env.MAX_BODY_SIZE_BYTES || 2 * 1024 * 1024),
    connectionTimeout: Number(process.env.HTTP_CONNECTION_TIMEOUT_MS || 10_000),
    requestTimeout: Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30_000),
  });

  server.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  server.register(fastifyCookie);
  server.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || !config.isProduction) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  server.register(dbPlugin);
  await server.register(redisPlugin);
  if (config.env !== 'test') {
    server.register(fastifyRateLimit, {
      max: config.rateLimit.global.max,
      timeWindow: config.rateLimit.global.windowMs,
      ...(server.redis ? { redis: server.redis } : {}),
      keyGenerator: (request) => {
        const token = extractAccessToken(request);
        if (token && (server as any).container?.jwt) {
          try {
            const payload = (server as any).container.jwt.verify(token, {
              algorithms: ['HS256'],
              issuer: 'stanforte-api',
              audience: 'portal-user',
            });
            if (payload?.sub) {
              return `user:${String(payload.sub)}`;
            }
          } catch {
            // Invalid/expired token falls back to IP-based limiting
          }
        }
        return `ip:${request.ip}`;
      },
    });
  }
  server.register(httpPlugin);

  for (const { prefix, plugin } of appRoutes) {
    server.register(plugin, { prefix: `${API_PREFIX}${prefix}` });
  }

  return server;
}

export { logger };
