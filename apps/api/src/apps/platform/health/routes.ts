import type { FastifyPluginAsync } from 'fastify';
import { sendRaw } from '$plugins/http';

export const HealthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/healthz', async (_req, reply) => sendRaw(reply, { status: 'ok' }, 200));

  fastify.get('/readyz', async (_req, reply) => {
    const report = await fastify.container.health.ready();
    return sendRaw(reply, report, report.status === 'ok' ? 200 : 503);
  });
};
