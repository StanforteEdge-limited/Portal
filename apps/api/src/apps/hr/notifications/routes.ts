import type { FastifyPluginAsync } from 'fastify';

export const NotificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
