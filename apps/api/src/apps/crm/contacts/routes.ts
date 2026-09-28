import type { FastifyPluginAsync } from 'fastify';

export const ContactsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
