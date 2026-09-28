import type { FastifyPluginAsync } from 'fastify';

export const BillingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
