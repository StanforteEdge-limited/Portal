import type { FastifyPluginAsync } from 'fastify';
import {
  AssignUserRolesSchema,
  BulkCreateUsersSchema,
  CreateAdminUserSchema,
  CreateUserSchema,
  InviteUserSchema,
  UpdateAdminUserSchema,
  UpdateProfileSchema,
  UpdateUserSchema,
  UpdateUserStatusSchema,
  UserIdParamsSchema,
  UsersListQuerySchema,
  type AssignUserRoles,
  type BulkCreateUsers,
  type CreateAdminUser,
  type CreateUser,
  type InviteUser,
  type UpdateAdminUser,
  type UpdateProfile,
  type UpdateUser,
  type UpdateUserStatus,
  type UserIdParams,
  type UsersListQuery,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

/** Mounted at the API root, so these live at `/v1/profile`, `/v1/users`, and so on. */
export const UsersRoutes: FastifyPluginAsync = async (fastify) => {
  const users = () => fastify.container.users;

  fastify.get('/profile', { preHandler: requireAuth }, async (request) =>
    users().getMyProfile(request.user.id, currentTenant(request)),
  );

  fastify.get('/me', { preHandler: requireAuth }, async (request) =>
    users().getMyProfile(request.user.id, currentTenant(request)),
  );

  fastify.patch(
    '/profile',
    { preHandler: requireAuth, schema: { body: UpdateProfileSchema } },
    async (request) => users().updateMyProfile(request.user.id, requestBody<UpdateProfile>(request), currentTenant(request)),
  );

  fastify.get(
    '/users',
    {
      preHandler: [requireAuth, requirePermissions('users.manage')],
      schema: { querystring: UsersListQuerySchema },
    },
    async (request) => users().listUsers(requestQuery<UsersListQuery>(request), currentTenant(request)),
  );

  fastify.post(
    '/users',
    { preHandler: [requireAuth, requirePermissions('users.manage')], schema: { body: CreateUserSchema } },
    async (request) => users().createUser(requestBody<CreateUser>(request), currentTenant(request)),
  );

  fastify.get(
    '/users/:id',
    {
      preHandler: [requireAuth, requirePermissions('users.manage')],
      schema: { params: UserIdParamsSchema },
    },
    async (request) => users().getUserById(requestParams<UserIdParams>(request).id, currentTenant(request)),
  );

  fastify.patch(
    '/users/:id',
    {
      preHandler: [requireAuth, requirePermissions('users.manage')],
      schema: { params: UserIdParamsSchema, body: UpdateUserSchema },
    },
    async (request) =>
      users().updateUser(
        requestParams<UserIdParams>(request).id,
        requestBody<UpdateUser>(request),
        currentTenant(request),
      ),
  );

  fastify.get(
    '/users/:id/roles',
    {
      preHandler: [requireAuth, requirePermissions('roles.manage')],
      schema: { params: UserIdParamsSchema },
    },
    async (request) => users().getUserRoles(requestParams<UserIdParams>(request).id, currentTenant(request)),
  );

  fastify.post(
    '/users/:id/roles',
    {
      preHandler: [requireAuth, requirePermissions('roles.manage')],
      schema: { params: UserIdParamsSchema, body: AssignUserRolesSchema },
    },
    async (request) =>
      users().setUserRoles(
        requestParams<UserIdParams>(request).id,
        requestBody<AssignUserRoles>(request),
        currentTenant(request),
      ),
  );

  fastify.post(
    '/users/:id/invite',
    {
      preHandler: [requireAuth, requirePermissions('users.manage')],
      schema: { params: UserIdParamsSchema, body: InviteUserSchema },
    },
    async (request) =>
      users().inviteUser(
        requestParams<UserIdParams>(request).id,
        requestBody<InviteUser>(request),
        currentTenant(request).tenantId,
      ),
  );

  fastify.post(
    '/users/:id/reset-link',
    {
      preHandler: [requireAuth, requirePermissions('users.manage')],
      schema: { params: UserIdParamsSchema, body: InviteUserSchema },
    },
    async (request) =>
      users().sendResetLink(
        requestParams<UserIdParams>(request).id,
        requestBody<InviteUser>(request),
        currentTenant(request),
      ),
  );
};

/** Mounted at `/v1/admin/users`, so these paths keep the admin prefix. */
export const AdminRoutes: FastifyPluginAsync = async (fastify) => {
  const admin = () => fastify.container.admin;
  const guard = composeGuards(requireAuth, requirePermissions('users.manage'));

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

  fastify.post(
    '/:id',
    { preHandler: guard, schema: { params: UserIdParamsSchema, body: UpdateAdminUserSchema } },
    async (request) =>
      admin().updateUser(
        requestParams<UserIdParams>(request).id,
        requestBody<UpdateAdminUser>(request),
        currentTenant(request),
      ),
  );

  fastify.post(
    '/:id/status',
    { preHandler: guard, schema: { params: UserIdParamsSchema, body: UpdateUserStatusSchema } },
    async (request) =>
      admin().updateStatus(
        requestParams<UserIdParams>(request).id,
        requestBody<UpdateUserStatus>(request),
        currentTenant(request),
      ),
  );
};
