import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { Container } from '../bootstrap/container';
import { envelope, withJsonReplacer } from '$core/http/envelope';
import { buildErrorHandler } from '$core/http/error-handler';
import { Logger } from '$core/logger';

const logger = new Logger('Bootstrap');

/** Replies written by the error handler bypass the success envelope. */
const RAW_RESPONSE = Symbol('raw-response');

export function sendRaw(reply: FastifyReply, body: unknown, status: number) {
  (reply as any)[RAW_RESPONSE] = true;
  reply.status(status).send(body);
}

/**
 * Global HTTP concerns: the shared service container, the `{ success, data }`
 * envelope, BigInt-safe JSON, and the exception filter.
 */
export const httpPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const container = new Container(fastify.db, (fastify as any).redis);
  fastify.decorate('container', container);

  await container.cache.connect();
  fastify.addHook('onClose', async () => {
    if (container.isProvided('queues')) await container.queues.close();
  });

  fastify.setErrorHandler((error, request, reply) => {
    const handler = buildErrorHandler(fastify);
    (reply as any)[RAW_RESPONSE] = true;
    handler(error, request, reply);
  });

  // `preSerialization` is the only hook that still sees the handler's object.
  fastify.addHook('preSerialization', async (_request, reply, payload) => {
    if ((reply as any)[RAW_RESPONSE]) return payload;
    if (payload === undefined || payload === null) return payload;
    return withJsonReplacer(envelope(payload));
  });
});

export { logger, RAW_RESPONSE };
