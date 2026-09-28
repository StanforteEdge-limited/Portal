import type { FastifyPluginAsync } from 'fastify';

export const BackgroundJobsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
