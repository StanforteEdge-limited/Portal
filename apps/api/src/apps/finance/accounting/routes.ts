import type { FastifyPluginAsync } from 'fastify';

export const AccountingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
