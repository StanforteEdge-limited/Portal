import type { FastifyPluginAsync } from 'fastify';

export const TenancyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
