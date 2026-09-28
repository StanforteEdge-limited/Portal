import type { FastifyPluginAsync } from 'fastify';
import {
  AssignUserRolesSchema,
  CreateUserSchema,
  InviteUserSchema,
  UpdateProfileSchema,
  UpdateUserSchema,
  UserIdParamsSchema,
  UsersListQuerySchema,
  type AssignUserRoles,
  type CreateUser,
  type InviteUser,
  type UpdateProfile,
  type UpdateUser,
  type UserIdParams,
  type UsersListQuery,
} from '@stanforte/contract';
import { currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

/**
 * Mounted at the API root: the Nest controller uses an empty `@Controller()`
 * prefix, so these live at `/v1/profile`, `/v1/users`, and so on.
 */
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
