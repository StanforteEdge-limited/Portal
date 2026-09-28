import type { FastifyPluginAsync } from 'fastify';

export const OnboardingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({ ok: true }));
};
