import type { FastifyPluginAsync } from 'fastify';

export const TaxonomyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
