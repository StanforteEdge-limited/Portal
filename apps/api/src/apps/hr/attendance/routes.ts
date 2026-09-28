import type { FastifyPluginAsync } from 'fastify';

export const AttendanceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
