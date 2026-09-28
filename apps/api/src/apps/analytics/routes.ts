import type { FastifyPluginAsync } from 'fastify';

export const AnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
