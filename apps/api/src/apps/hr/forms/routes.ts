import type { FastifyPluginAsync } from 'fastify';

export const FormsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
