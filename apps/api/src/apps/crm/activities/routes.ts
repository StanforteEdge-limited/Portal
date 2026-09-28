import type { FastifyPluginAsync } from 'fastify';

export const ActivitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
