import type { FastifyPluginAsync } from 'fastify';
import {
  AssignUserRoleIdsSchema,
  CreateRoleSchema,
  RbacIdParamsSchema,
  SetRolePermissionsSchema,
  UpdateRoleSchema,
  type AssignUserRoleIds,
  type CreateRole,
  type RbacIdParams,
  type SetRolePermissions,
  type UpdateRole,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

const guard = composeGuards(requireAuth, requirePermissions('settings.manage'));

export const RbacRoutes: FastifyPluginAsync = async (fastify) => {
  const rbac = () => fastify.container.rbac;

  fastify.get('/', { preHandler: guard }, async (request) =>
    rbac().getOverview(requestQuery<{ include_inactive?: string }>(request).include_inactive === 'true', currentTenant(request)),
  );

  fastify.get('/roles', { preHandler: guard }, async (request) =>
    rbac().listRoles(requestQuery<{ include_inactive?: string }>(request).include_inactive === 'true', currentTenant(request)),
  );

  fastify.post('/roles', { preHandler: guard, schema: { body: CreateRoleSchema } }, async (request) =>
    rbac().createRole(requestBody<CreateRole>(request)),
  );

  fastify.post('/roles/:id', { preHandler: guard, schema: { params: RbacIdParamsSchema, body: UpdateRoleSchema } }, async (request) =>
    rbac().updateRole(requestParams<RbacIdParams>(request).id, requestBody<UpdateRole>(request)),
  );

  fastify.delete('/roles/:id', { preHandler: guard, schema: { params: RbacIdParamsSchema } }, async (request) => {
    const { id } = requestParams<RbacIdParams>(request);
    const replacementRoleId = requestQuery<{ replacement_role_id?: string }>(request).replacement_role_id;
    return rbac().deleteRole(id, replacementRoleId, currentTenant(request));
  });

  fastify.get('/roles/:id/delete-impact', { preHandler: guard, schema: { params: RbacIdParamsSchema } }, async (request) =>
    rbac().getRoleDeleteImpact(requestParams<RbacIdParams>(request).id, currentTenant(request)),
  );

  fastify.post(
    '/roles/:id/permissions',
    { preHandler: guard, schema: { params: RbacIdParamsSchema, body: SetRolePermissionsSchema } },
    async (request) =>
      rbac().setRolePermissions(requestParams<RbacIdParams>(request).id, requestBody<SetRolePermissions>(request)),
  );

  fastify.get('/permissions', { preHandler: guard }, async (request) => {
    const { module, search } = requestQuery<{ module?: string; search?: string }>(request);
    return rbac().listPermissions({ module, search });
  });

  fastify.get('/users/:profileId', { preHandler: guard }, async (request) =>
    rbac().getUserRoles(requestParams<{ profileId: string }>(request).profileId, currentTenant(request)),
  );

  fastify.post(
    '/users/:profileId/roles',
    { preHandler: guard, schema: { body: AssignUserRoleIdsSchema } },
    async (request) =>
      rbac().assignUserRoles(
        requestParams<{ profileId: string }>(request).profileId,
        requestBody<AssignUserRoleIds>(request),
        currentTenant(request),
      ),
  );
};
