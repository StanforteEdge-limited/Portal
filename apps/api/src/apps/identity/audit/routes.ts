import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { CreateAuditEventSchema, type CreateAuditEvent } from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

export const AuditRoutes: FastifyPluginAsync = async (fastify) => {
  const audit = () => fastify.container.audit;
  const inTenant = (request: FastifyRequest, operation: () => Promise<unknown> | unknown) =>
    fastify.container.tenantContext.run(currentTenant(request), operation);
  const view = composeGuards(requireAuth, requirePermissions('audit.view'));
  const manage = composeGuards(requireAuth, requirePermissions('audit.manage'));

  fastify.get('/', { preHandler: view }, async (request) =>
    inTenant(request, () => audit().listEvents(requestQuery(request))),
  );

  fastify.get('/email-logs', { preHandler: view }, async (request) =>
    inTenant(request, () => audit().listEmailLogs(requestQuery(request))),
  );

  fastify.get('/requests/:requestId', { preHandler: view }, async (request) =>
    inTenant(request, () => audit().getRequestAudit(requestParams<{ requestId: string }>(request).requestId)),
  );

  fastify.post('/', { preHandler: manage, schema: { body: CreateAuditEventSchema } }, async (request) =>
    inTenant(request, () => audit().createEvent(requestBody<CreateAuditEvent>(request), request.user?.id)),
  );
};
