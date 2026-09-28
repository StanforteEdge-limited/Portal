import type { FastifyPluginAsync } from 'fastify';

export const PoliciesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
