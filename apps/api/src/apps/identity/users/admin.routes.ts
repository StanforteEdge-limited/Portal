import type { FastifyPluginAsync } from 'fastify';
import {
  BulkCreateUsersSchema,
  CreateAdminUserSchema,
  UpdateAdminUserSchema,
  UpdateUserStatusSchema,
  UserIdParamsSchema,
  UsersListQuerySchema,
  type BulkCreateUsers,
  type CreateAdminUser,
  type UpdateAdminUser,
  type UpdateUserStatus,
  type UserIdParams,
  type UsersListQuery,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

const guard = composeGuards(requireAuth, requirePermissions('users.manage'));

export const AdminRoutes: FastifyPluginAsync = async (fastify) => {
  const admin = () => fastify.container.admin;

  fastify.get('/', { preHandler: guard, schema: { querystring: UsersListQuerySchema } }, async (request) =>
    admin().listUsers(requestQuery<UsersListQuery>(request), currentTenant(request)),
  );

  fastify.get('/:id', { preHandler: guard, schema: { params: UserIdParamsSchema } }, async (request) =>
    admin().getUser(requestParams<UserIdParams>(request).id, currentTenant(request)),
  );

  fastify.post('/', { preHandler: guard, schema: { body: CreateAdminUserSchema } }, async (request) =>
    admin().createUser(requestBody<CreateAdminUser>(request), currentTenant(request)),
  );

  fastify.post('/bulk', { preHandler: guard, schema: { body: BulkCreateUsersSchema } }, async (request) =>
    admin().createBulkUsers(requestBody<BulkCreateUsers>(request).users, currentTenant(request)),
  );

  fastify.post('/:id', { preHandler: guard, schema: { params: UserIdParamsSchema, body: UpdateAdminUserSchema } }, async (request) =>
    admin().updateUser(
      requestParams<UserIdParams>(request).id,
      requestBody<UpdateAdminUser>(request),
      currentTenant(request),
    ),
  );

  fastify.post('/:id/status', { preHandler: guard, schema: { params: UserIdParamsSchema, body: UpdateUserStatusSchema } }, async (request) =>
    admin().updateStatus(
      requestParams<UserIdParams>(request).id,
      requestBody<UpdateUserStatus>(request),
      currentTenant(request),
    ),
  );
};
