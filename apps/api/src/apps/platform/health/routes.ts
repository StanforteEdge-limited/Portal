import type { FastifyPluginAsync } from 'fastify';
import { sendRaw } from '$plugins/http';

export const HealthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness: the process is up. Readiness lives at GET /health/ready.
  fastify.get('/', async () => ({ status: 'ok' }));

  fastify.get('/ready', async (_request, reply) => {
    const report = await fastify.container.health.ready();
    return sendRaw(reply, report, report.status === 'ok' ? 200 : 503);
  });
};
