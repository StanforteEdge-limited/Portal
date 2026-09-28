import type { FastifyPluginAsync } from 'fastify';

export const DocumentsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
