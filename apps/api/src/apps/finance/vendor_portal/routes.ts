import type { FastifyPluginAsync } from 'fastify';

export const VendorPortalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
