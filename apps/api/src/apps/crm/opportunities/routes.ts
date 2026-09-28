import type { FastifyPluginAsync } from 'fastify';

export const OpportunitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
