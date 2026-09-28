import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreatePolicySchema,
  PoliciesListQuerySchema,
  ResolvePolicySchema,
  UpdatePolicySchema,
  policiesIdParamsSchema,
  type CreatePolicy,
  type PoliciesListQuery,
  type ResolvePolicy,
  type UpdatePolicy,
  type policiesIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { policiesPermissions } from './permissions';

/** Mounted at `/v1/policies`. */
export const PoliciesRoutes: FastifyPluginAsync = async (fastify) => {
  const policies = () => fastify.container.policies;
  const read = composeGuards(requireAuth, requirePermissions(policiesPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(policiesPermissions.write));
  const id = (request: FastifyRequest) => requestParams<policiesIdParams>(request).id;
  const actor = (request: { user?: { id?: string } }) => request.user?.id;

  fastify.get('/', { preHandler: read, schema: { querystring: PoliciesListQuerySchema } }, async (request) =>
    policies().list(requestQuery<PoliciesListQuery>(request)),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreatePolicySchema } }, async (request) =>
    policies().create(requestBody<CreatePolicy>(request), actor(request)),
  );

  /**
   * Policy resolution is a read performed on behalf of other modules (leave
   * rules, attendance windows, request routing), so it is exposed to any
   * authenticated reader rather than only to policy editors.
   */
  fastify.post('/resolve', { preHandler: read, schema: { body: ResolvePolicySchema } }, async (request) =>
    policies().resolve(requestBody<ResolvePolicy>(request)),
  );

  fastify.put('/:id', { preHandler: write, schema: { params: policiesIdParamsSchema, body: UpdatePolicySchema } }, async (request) =>
    policies().update(id(request), requestBody<UpdatePolicy>(request), actor(request)),
  );

  fastify.delete('/:id', { preHandler: write, schema: { params: policiesIdParamsSchema } }, async (request) =>
    policies().delete(id(request)),
  );
};
