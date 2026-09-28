import type { FastifyPluginAsync } from 'fastify';

export const GroupsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
