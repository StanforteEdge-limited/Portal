import type { FastifyPluginAsync } from 'fastify';

export const LeaveRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
