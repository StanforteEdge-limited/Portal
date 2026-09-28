import type { FastifyPluginAsync } from 'fastify';

export const AcknowledgementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
