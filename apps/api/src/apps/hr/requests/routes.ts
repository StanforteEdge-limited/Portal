import type { FastifyPluginAsync } from 'fastify';

export const RequestsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
