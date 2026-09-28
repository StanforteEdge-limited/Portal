import type { FastifyPluginAsync } from 'fastify';

export const MailRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
