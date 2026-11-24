import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AddProjectMemberSchema,
  CreateProjectSchema,
  ProjectMemberParamsSchema,
  ProjectsListQuerySchema,
  UpdateProjectSchema,
  projectsIdParamsSchema,
  type AddProjectMember,
  type CreateProject,
  type ProjectMemberParams,
  type ProjectsListQuery,
  type UpdateProject,
  type projectsIdParams,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { projectsPermissions } from './permissions';

/**
 * Mounted at `/v1/projects`.
 *
 * Project metadata only. Every mutation records the acting user, so the route
 * reads the id off the token rather than the body. Task boards, comments and
 * attachments are served by `/v1/tasks`.
 */
export const ProjectsRoutes: FastifyPluginAsync = async (fastify) => {
  const projects = () => fastify.container.projects;
  const read = composeGuards(requireAuth, requirePermissions(projectsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(projectsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<projectsIdParams>(request).id;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const inTenant = <T>(request: FastifyRequest, op: () => Promise<T> | T) =>
    fastify.container.tenantContext.run(currentTenant(request), op);

  fastify.get('/', { preHandler: read, schema: { querystring: ProjectsListQuerySchema } }, async (request) =>
    inTenant(request, () => projects().list(requestQuery<ProjectsListQuery>(request))),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateProjectSchema } }, async (request) =>
    inTenant(request, () => projects().create(actor(request), requestBody<CreateProject>(request))),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: projectsIdParamsSchema } }, async (request) =>
    inTenant(request, () => projects().get(id(request))),
  );

  fastify.get('/:id/governance', { preHandler: read, schema: { params: projectsIdParamsSchema } }, async (request) =>
    inTenant(request, () => projects().governance(id(request))),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: projectsIdParamsSchema, body: UpdateProjectSchema } }, async (request) =>
    inTenant(request, () => projects().update(id(request), actor(request), requestBody<UpdateProject>(request))),
  );

  fastify.post('/:id/archive', { preHandler: write, schema: { params: projectsIdParamsSchema } }, async (request) =>
    inTenant(request, () => projects().archive(id(request), actor(request))),
  );

  fastify.post('/:id/unarchive', { preHandler: write, schema: { params: projectsIdParamsSchema } }, async (request) =>
    inTenant(request, () => projects().unarchive(id(request), actor(request))),
  );

  fastify.post(
    '/:id/members',
    { preHandler: write, schema: { params: projectsIdParamsSchema, body: AddProjectMemberSchema } },
    async (request) =>
      inTenant(request, () => projects().addMember(id(request), actor(request), requestBody<AddProjectMember>(request))),
  );

  fastify.delete(
    '/:id/members/:userId',
    { preHandler: write, schema: { params: ProjectMemberParamsSchema } },
    async (request) =>
      inTenant(request, () =>
        projects().removeMember(id(request), actor(request), requestParams<ProjectMemberParams>(request).userId),
      ),
  );
};
