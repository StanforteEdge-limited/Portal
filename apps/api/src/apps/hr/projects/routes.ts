import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AddProjectCardAttachmentSchema,
  AddProjectMemberSchema,
  CreateProjectCardUpdateSchema,
  CreateProjectSchema,
  ProjectCardAttachmentParamsSchema,
  ProjectCardParamsSchema,
  ProjectCardsListQuerySchema,
  ProjectMemberParamsSchema,
  ProjectsListQuerySchema,
  UpdateProjectCardSchema,
  UpdateProjectSchema,
  UpsertProjectCardSchema,
  projectsIdParamsSchema,
  type AddProjectCardAttachment,
  type AddProjectMember,
  type CreateProject,
  type CreateProjectCardUpdate,
  type ProjectCardAttachmentParams,
  type ProjectCardParams,
  type ProjectCardsListQuery,
  type ProjectMemberParams,
  type ProjectsListQuery,
  type UpdateProject,
  type UpdateProjectCard,
  type UpsertProjectCard,
  type projectsIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { projectsPermissions } from './permissions';

/**
 * Mounted at `/v1/projects`.
 *
 * Every mutation records the acting user, so the route reads the id off the
 * token rather than the body.
 */
export const ProjectsRoutes: FastifyPluginAsync = async (fastify) => {
  const projects = () => fastify.container.projects;
  const read = composeGuards(requireAuth, requirePermissions(projectsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(projectsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<projectsIdParams>(request).id;
  const cardParams = (request: FastifyRequest) => requestParams<ProjectCardParams>(request);
  const attachmentParams = (request: FastifyRequest) => requestParams<ProjectCardAttachmentParams>(request);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  fastify.get('/', { preHandler: read, schema: { querystring: ProjectsListQuerySchema } }, async (request) =>
    projects().list(requestQuery<ProjectsListQuery>(request)),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateProjectSchema } }, async (request) =>
    projects().create(actor(request), requestBody<CreateProject>(request)),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: projectsIdParamsSchema } }, async (request) =>
    projects().get(id(request)),
  );

  fastify.get('/:id/governance', { preHandler: read, schema: { params: projectsIdParamsSchema } }, async (request) =>
    projects().governance(id(request)),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: projectsIdParamsSchema, body: UpdateProjectSchema } }, async (request) =>
    projects().update(id(request), actor(request), requestBody<UpdateProject>(request)),
  );

  fastify.post('/:id/archive', { preHandler: write, schema: { params: projectsIdParamsSchema } }, async (request) =>
    projects().archive(id(request), actor(request)),
  );

  fastify.post('/:id/unarchive', { preHandler: write, schema: { params: projectsIdParamsSchema } }, async (request) =>
    projects().unarchive(id(request), actor(request)),
  );

  fastify.post(
    '/:id/members',
    { preHandler: write, schema: { params: projectsIdParamsSchema, body: AddProjectMemberSchema } },
    async (request) => projects().addMember(id(request), actor(request), requestBody<AddProjectMember>(request)),
  );

  fastify.delete(
    '/:id/members/:userId',
    { preHandler: write, schema: { params: ProjectMemberParamsSchema } },
    async (request) => projects().removeMember(id(request), actor(request), requestParams<ProjectMemberParams>(request).userId),
  );

  fastify.get(
    '/:id/cards',
    { preHandler: read, schema: { params: projectsIdParamsSchema, querystring: ProjectCardsListQuerySchema } },
    async (request) => projects().listCards(id(request), requestQuery<ProjectCardsListQuery>(request)),
  );

  fastify.post(
    '/:id/cards',
    { preHandler: write, schema: { params: projectsIdParamsSchema, body: UpsertProjectCardSchema } },
    async (request) => projects().createCard(id(request), actor(request), requestBody<UpsertProjectCard>(request)),
  );

  fastify.get(
    '/:id/cards/:cardId',
    { preHandler: read, schema: { params: ProjectCardParamsSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().getCard(params.id, params.cardId);
    },
  );

  fastify.put(
    '/:id/cards/:cardId',
    { preHandler: write, schema: { params: ProjectCardParamsSchema, body: UpdateProjectCardSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().updateCard(params.id, params.cardId, actor(request), requestBody<UpdateProjectCard>(request));
    },
  );

  fastify.delete(
    '/:id/cards/:cardId',
    { preHandler: write, schema: { params: ProjectCardParamsSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().deleteCard(params.id, params.cardId, actor(request));
    },
  );

  fastify.post(
    '/:id/cards/:cardId/attachments',
    { preHandler: write, schema: { params: ProjectCardParamsSchema, body: AddProjectCardAttachmentSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().addCardAttachment(
        params.id,
        params.cardId,
        actor(request),
        requestBody<AddProjectCardAttachment>(request),
      );
    },
  );

  fastify.delete(
    '/:id/cards/:cardId/attachments/:attachmentId',
    { preHandler: write, schema: { params: ProjectCardAttachmentParamsSchema } },
    async (request) => {
      const params = attachmentParams(request);
      return projects().removeCardAttachment(params.id, params.cardId, params.attachmentId, actor(request));
    },
  );

  fastify.get(
    '/:id/cards/:cardId/updates',
    { preHandler: read, schema: { params: ProjectCardParamsSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().listCardUpdates(params.id, params.cardId);
    },
  );

  fastify.post(
    '/:id/cards/:cardId/updates',
    { preHandler: write, schema: { params: ProjectCardParamsSchema, body: CreateProjectCardUpdateSchema } },
    async (request) => {
      const params = cardParams(request);
      return projects().addCardUpdate(
        params.id,
        params.cardId,
        actor(request),
        requestBody<CreateProjectCardUpdate>(request),
      );
    },
  );
};
