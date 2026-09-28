import type { FastifyPluginAsync } from 'fastify';

export const TasksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
