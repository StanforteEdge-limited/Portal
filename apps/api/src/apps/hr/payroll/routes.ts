import type { FastifyPluginAsync } from 'fastify';

export const PayrollRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
