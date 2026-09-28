import type { FastifyPluginAsync } from 'fastify';
import {
  DesignationsIdParamsSchema,
  UpdateDesignationSchema,
  UpsertDesignationSchema,
  type DesignationsIdParams,
  type UpdateDesignation,
  type UpsertDesignation,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams } from '$core/routes';
import { designationsPermissions } from './permissions';

/**
 * Mounted at `/v1/designations`.
 *
 * `hrDesignation` is global reference data (no `tenant_id`), so there is no
 * tenant scoping here beyond the permission guard. `DesignationsService.list`
 * returns the whole ordered set, so there is no list query schema.
 */
export const DesignationsRoutes: FastifyPluginAsync = async (fastify) => {
  const designations = () => fastify.container.designations;
  const read = composeGuards(requireAuth, requirePermissions(designationsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(designationsPermissions.write));

  fastify.get('/', { preHandler: read }, async () => designations().list());

  fastify.post('/', { preHandler: write, schema: { body: UpsertDesignationSchema } }, async (request) =>
    designations().create(requestBody<UpsertDesignation>(request)),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: DesignationsIdParamsSchema } }, async (request) =>
    designations().get(requestParams<DesignationsIdParams>(request).id),
  );

  fastify.put(
    '/:id',
    { preHandler: write, schema: { params: DesignationsIdParamsSchema, body: UpdateDesignationSchema } },
    async (request) => designations().update(requestParams<DesignationsIdParams>(request).id, requestBody<UpdateDesignation>(request)),
  );

  fastify.delete('/:id', { preHandler: write, schema: { params: DesignationsIdParamsSchema } }, async (request) =>
    designations().delete(requestParams<DesignationsIdParams>(request).id),
  );
};
