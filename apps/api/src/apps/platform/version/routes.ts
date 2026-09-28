import type { FastifyPluginAsync } from 'fastify';

export const VersionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
