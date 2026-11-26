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
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PREFIXES = ['/v1/billing/webhook/'];

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
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // Permissions-Policy header on every response
  server.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
    return payload;
  });

  // Production HTTPS enforcement & CSRF Origin validation for cookie-authenticated mutations
  server.addHook('onRequest', async (request, reply) => {
    if (config.isProduction) {
      const proto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
      if (proto === 'http') {
        if (request.method === 'GET' || request.method === 'HEAD') {
          const host = request.headers.host || '';
          return reply.redirect(`https://${host}${request.url}`, 301);
        }
        return reply.status(403).send({
          success: false,
          error: { status_code: 403, message: 'HTTPS is required' },
        });
      }
    }

    if (
      STATE_CHANGING_METHODS.has(request.method) &&
      request.headers.cookie &&
      !CSRF_EXEMPT_PREFIXES.some((prefix) => request.url.startsWith(prefix))
    ) {
      const origin = request.headers.origin;
      if (origin && config.corsOrigins.length > 0 && !config.corsOrigins.includes(origin)) {
        request.log.warn(
          { event: 'csrf_origin_blocked', method: request.method, url: request.url, origin, ip: request.ip },
          'Blocked cross-origin state-changing request',
        );
        return reply.status(403).send({
          success: false,
          error: { status_code: 403, message: 'Cross-origin request blocked' },
        });
      }
    }
  });

  // Security event logging for 401/403/429 spikes (never logs passwords or tokens)
  server.addHook('onResponse', async (request, reply) => {
    const code = reply.statusCode;
    if (code === 401 || code === 403 || code === 429) {
      request.log.warn(
        {
          event: 'security_http_status',
          statusCode: code,
          method: request.method,
          url: request.url.split('?')[0],
          ip: request.ip,
          userId: (request.user as any)?.id ?? null,
        },
        `Security response ${code}`,
      );
    }
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
