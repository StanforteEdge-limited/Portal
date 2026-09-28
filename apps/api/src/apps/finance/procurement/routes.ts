import type { FastifyPluginAsync } from 'fastify';

export const ProcurementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
