import type { FastifyPluginAsync } from 'fastify';

export const WorkflowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
