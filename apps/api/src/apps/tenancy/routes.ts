import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  AssignTenantRolesSchema,
  CreateWorkspaceSchema,
  DecommissionTenantSchema,
  InviteTenantMemberSchema,
  TransferOwnershipSchema,
  UpdateTenantSchema,
  type AssignTenantRoles,
  type CreateWorkspace,
  type DecommissionTenant,
  type InviteTenantMember,
  type TransferOwnership,
  type UpdateTenant,
} from '@stanforte/contract';
import { currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { parseBigIntId } from '$core/utils';
import { requestBody, requestParams } from '$core/routes';
import { tenancyPermissions } from './permissions';

const TenantMemberParamsSchema = Type.Object({
  profileId: Type.String({ minLength: 1 }),
});

const TenantStatusSchema = Type.Object({
  status: Type.Union([Type.Literal('active'), Type.Literal('suspended')]),
});

export const TenancyRoutes: FastifyPluginAsync = async (fastify) => {
  const tenancy = () => fastify.container.tenancy;
  const inTenant = (request: FastifyRequest, operation: () => Promise<unknown> | unknown) =>
    fastify.container.tenantContext.run(currentTenant(request), operation);

  fastify.post('/workspaces', { schema: { body: CreateWorkspaceSchema } }, async (request) =>
    tenancy().createWorkspace(requestBody<CreateWorkspace>(request)),
  );

  fastify.get('/', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.read)] }, async (request) =>
    inTenant(request, () => tenancy().getTenant(currentTenant(request))),
  );

  fastify.get('/current', { preHandler: [requireAuth] }, async (request) =>
    inTenant(request, () => tenancy().getTenant(currentTenant(request))),
  );

  fastify.patch('/', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: UpdateTenantSchema } }, async (request) =>
    inTenant(request, () => tenancy().updateTenant(currentTenant(request), requestBody<UpdateTenant>(request))),
  );

  fastify.patch('/current', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: UpdateTenantSchema } }, async (request) =>
    inTenant(request, () => tenancy().updateTenant(currentTenant(request), requestBody<UpdateTenant>(request))),
  );

  fastify.post('/status', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: TenantStatusSchema } }, async (request) =>
    inTenant(request, () => tenancy().setTenantStatus(currentTenant(request), requestBody<{ status: 'active' | 'suspended' }>(request).status)),
  );

  fastify.get('/members', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.read)] }, async (request) =>
    inTenant(request, () => tenancy().listMembers(currentTenant(request))),
  );

  fastify.post('/members/invite', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: InviteTenantMemberSchema } }, async (request) =>
    inTenant(request, () => {
      const body = requestBody<InviteTenantMember>(request);
      return tenancy().inviteMember(currentTenant(request), body.email, body.message);
    }),
  );

  fastify.post('/members/:profileId/roles', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { params: TenantMemberParamsSchema, body: AssignTenantRolesSchema } }, async (request) =>
    inTenant(request, () => {
      const { profileId } = requestParams<{ profileId: string }>(request);
      return tenancy().assignRoles(currentTenant(request), parseBigIntId(profileId, 'profile id'), requestBody<AssignTenantRoles>(request).roles);
    }),
  );

  fastify.post('/members/:profileId/deactivate', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { params: TenantMemberParamsSchema } }, async (request) =>
    inTenant(request, () => {
      const { profileId } = requestParams<{ profileId: string }>(request);
      return tenancy().deactivateMember(currentTenant(request), parseBigIntId(profileId, 'profile id'));
    }),
  );

  fastify.post('/transfer-ownership', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: TransferOwnershipSchema } }, async (request) =>
    inTenant(request, () =>
      tenancy().transferOwnership(
        currentTenant(request),
        parseBigIntId(requestBody<TransferOwnership>(request).profile_id, 'profile id'),
      ),
    ),
  );

  fastify.get('/audit-coverage', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.read)] }, async (request) =>
    inTenant(request, () => tenancy().auditTenantCoverage(currentTenant(request))),
  );

  fastify.get('/export', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)] }, async (request) =>
    inTenant(request, () => tenancy().exportTenantData(currentTenant(request))),
  );

  fastify.post('/decommission', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)], schema: { body: DecommissionTenantSchema } }, async (request) =>
    inTenant(request, () => tenancy().decommissionTenant(currentTenant(request), requestBody<DecommissionTenant>(request).confirm)),
  );

  fastify.post('/bootstrap-defaults', { preHandler: [requireAuth, requirePermissions(tenancyPermissions.write)] }, async (request) =>
    inTenant(request, () => tenancy().bootstrapDefaults(currentTenant(request))),
  );
};
