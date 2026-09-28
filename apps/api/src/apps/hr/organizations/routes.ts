import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreateOrganizationSchema,
  OrganizationsListQuerySchema,
  UpdateOrganizationSchema,
  organizationsIdParamsSchema,
  type CreateOrganization,
  type OrganizationsListQuery,
  type UpdateOrganization,
  type organizationsIdParams,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { organizationsPermissions } from './permissions';

/**
 * Mounted at `/v1/organizations`.
 *
 * `OrganizationsService` takes an explicit `tenantId` instead of reading the
 * tenant context, so every call site passes `currentTenant(request).tenantId`.
 * That guard throws when the request has no tenant, which is what keeps
 * `listOrganizations` from falling back to an unscoped cross-tenant read.
 */
export const OrganizationsRoutes: FastifyPluginAsync = async (fastify) => {
  const organizations = () => fastify.container.organizations;
  const self = composeGuards(requireAuth);
  const read = composeGuards(requireAuth, requirePermissions(organizationsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(organizationsPermissions.write));
  const id = (request: FastifyRequest) => requestParams<organizationsIdParams>(request).id;

  fastify.get('/', { preHandler: read, schema: { querystring: OrganizationsListQuerySchema } }, async (request) =>
    organizations().listOrganizations(requestQuery<OrganizationsListQuery>(request), currentTenant(request).tenantId),
  );

  /** Membership of the caller's own profile. */
  fastify.get('/mine', { preHandler: self }, async (request) =>
    organizations().getMyOrganizations(request.user?.id as string, currentTenant(request).tenantId),
  );

  fastify.post('/', { preHandler: write, schema: { body: CreateOrganizationSchema } }, async (request) =>
    organizations().createOrganization(requestBody<CreateOrganization>(request), currentTenant(request).tenantId),
  );

  fastify.get('/:id', { preHandler: read, schema: { params: organizationsIdParamsSchema } }, async (request) =>
    organizations().getOrganization(id(request), currentTenant(request).tenantId),
  );

  fastify.put(
    '/:id',
    { preHandler: write, schema: { params: organizationsIdParamsSchema, body: UpdateOrganizationSchema } },
    async (request) =>
      organizations().updateOrganization(id(request), requestBody<UpdateOrganization>(request), currentTenant(request).tenantId),
  );

  fastify.delete('/:id', { preHandler: write, schema: { params: organizationsIdParamsSchema } }, async (request) =>
    organizations().deleteOrganization(id(request), currentTenant(request).tenantId),
  );
};
