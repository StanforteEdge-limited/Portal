import type { FastifyPluginAsync } from 'fastify';

export const ChatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
