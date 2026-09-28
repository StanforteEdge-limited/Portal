import type { FastifyPluginAsync } from 'fastify';

export const LeadsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
