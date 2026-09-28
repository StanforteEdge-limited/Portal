import type { FastifyPluginAsync } from 'fastify';

export const PipelinesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
