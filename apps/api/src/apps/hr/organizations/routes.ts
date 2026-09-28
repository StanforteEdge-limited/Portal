import type { FastifyPluginAsync } from 'fastify';

export const OrganizationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
