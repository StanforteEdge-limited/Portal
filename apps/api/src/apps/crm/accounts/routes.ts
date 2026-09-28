import type { FastifyPluginAsync } from 'fastify';

export const AccountsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
