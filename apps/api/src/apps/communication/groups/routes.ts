import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  AddGroupMemberSchema,
  CreateTeamSchema,
  SetGroupMemberScopesSchema,
  SetGroupOrganizationsSchema,
  UpdateTeamSchema,
  type AddGroupMember,
  type CreateTeam,
  type SetGroupMemberScopes,
  type SetGroupOrganizations,
  type UpdateTeam,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { groupsPermissions } from './permissions';

export const GroupsRoutes: FastifyPluginAsync = async (fastify) => {
  const groups = () => fastify.container.groups;
  const read = composeGuards(requireAuth, requirePermissions(groupsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(groupsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<{ id: string }>(request).id;
  const userId = (request: FastifyRequest) => requestParams<{ userId: string }>(request).userId;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  fastify.get('/', { preHandler: read }, async (request) =>
    groups().list(requestQuery<Record<string, any>>(request)),
  );

  fastify.get('/:id', { preHandler: read }, async (request) => groups().get(id(request)));

  fastify.post('/', { preHandler: write, schema: { body: CreateTeamSchema } }, async (request) =>
    groups().create(actor(request), requestBody<CreateTeam>(request)),
  );

  fastify.post('/:id', { preHandler: write, schema: { body: UpdateTeamSchema } }, async (request) =>
    groups().update(id(request), actor(request), requestBody<UpdateTeam>(request)),
  );

  fastify.post('/:id/members', { preHandler: write, schema: { body: AddGroupMemberSchema } }, async (request) =>
    groups().addMember(id(request), actor(request), requestBody<AddGroupMember>(request)),
  );

  fastify.delete('/:id/members/:userId', { preHandler: write }, async (request) =>
    groups().removeMember(id(request), userId(request)),
  );

  fastify.post('/:id/organizations', { preHandler: write, schema: { body: SetGroupOrganizationsSchema } }, async (request) =>
    groups().setOrganizations(id(request), requestBody<SetGroupOrganizations>(request)),
  );

  fastify.post('/:id/members/:userId/scopes', { preHandler: write, schema: { body: SetGroupMemberScopesSchema } }, async (request) =>
    groups().setMemberScopes(id(request), userId(request), requestBody<SetGroupMemberScopes>(request)),
  );
};
