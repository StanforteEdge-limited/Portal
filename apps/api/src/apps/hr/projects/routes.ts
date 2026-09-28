import type { FastifyPluginAsync } from 'fastify';

export const ProjectsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
