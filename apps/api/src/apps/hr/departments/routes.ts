import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AssignDepartmentMemberSchema,
  CreateDepartmentSchema,
  DepartmentMemberParamsSchema,
  DepartmentMembersListQuerySchema,
  DepartmentsIdParamsSchema,
  DepartmentsListQuerySchema,
  UpdateDepartmentSchema,
  type AssignDepartmentMember,
  type DepartmentMemberParams,
  type DepartmentMembersListQuery,
  type DepartmentsIdParams,
  type DepartmentsListQuery,
  type CreateDepartment,
  type UpdateDepartment,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { departmentsPermissions } from './permissions';

/** Mounted at `/v1/departments`. */
export const DepartmentsRoutes: FastifyPluginAsync = async (fastify) => {
  const departments = () => fastify.container.departments;
  const read = composeGuards(requireAuth, requirePermissions(departmentsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(departmentsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<DepartmentsIdParams>(request).id;
  const member = (request: FastifyRequest) => requestParams<DepartmentMemberParams>(request);
  const actor = (request: { user?: { id?: string } }) => request.user?.id;

  /* ---------------------------------------------------------------------- */
  /* Departments                                                             */
  /* ---------------------------------------------------------------------- */

  fastify.get('/', { preHandler: read, schema: { querystring: DepartmentsListQuerySchema } }, async (request) =>
    departments().list(requestQuery<DepartmentsListQuery>(request)),
  );

  /** Nested tree, for pickers. Registered before `/:id` is irrelevant by path shape. */
  fastify.get('/tree', { preHandler: read }, async () => departments().tree());

  fastify.post('/', { preHandler: write, schema: { body: CreateDepartmentSchema } }, async (request) =>
    departments().create(requestBody<CreateDepartment>(request), actor(request)),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: DepartmentsIdParamsSchema } }, async (request) =>
    departments().get(id(request)),
  );

  fastify.put(
    '/:id',
    { preHandler: write, schema: { params: DepartmentsIdParamsSchema, body: UpdateDepartmentSchema } },
    async (request) => departments().update(id(request), requestBody<UpdateDepartment>(request), actor(request)),
  );

  fastify.delete('/:id', { preHandler: write, schema: { params: DepartmentsIdParamsSchema } }, async (request) =>
    departments().delete(id(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Membership                                                              */
  /* ---------------------------------------------------------------------- */

  fastify.get(
    '/:id/members',
    { preHandler: read, schema: { params: DepartmentsIdParamsSchema, querystring: DepartmentMembersListQuerySchema } },
    async (request) =>
      departments().listMembers(id(request), requestQuery<DepartmentMembersListQuery>(request)),
  );

  fastify.post(
    '/:id/members',
    { preHandler: write, schema: { params: DepartmentsIdParamsSchema, body: AssignDepartmentMemberSchema } },
    async (request) =>
      departments().assignMember(id(request), requestBody<AssignDepartmentMember>(request), actor(request)),
  );

  // Removal ends the stint rather than deleting it, so historical approvals
  // still resolve to the manager who was in post.
  fastify.delete(
    '/:id/members/:profileId',
    { preHandler: write, schema: { params: DepartmentMemberParamsSchema } },
    async (request) => {
      const { departmentId, profileId } = member(request);
      return departments().removeMember(departmentId, profileId);
    },
  );
};
