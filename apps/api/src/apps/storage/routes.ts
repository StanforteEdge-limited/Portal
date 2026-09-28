import {
  StorageListQuerySchema,
} from '@stanforte/contract';
import type { FastifyPluginAsync } from 'fastify';

export const StorageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: StorageListQuerySchema,
    },
  }, async () => ({ ok: true }));
};
