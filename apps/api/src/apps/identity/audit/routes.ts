import type { FastifyPluginAsync } from 'fastify';
import { CreateAuditEventSchema, type CreateAuditEvent } from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

export const AuditRoutes: FastifyPluginAsync = async (fastify) => {
  const audit = () => fastify.container.audit;
  const view = composeGuards(requireAuth, requirePermissions('audit.view'));
  const manage = composeGuards(requireAuth, requirePermissions('audit.manage'));

  fastify.get('/', { preHandler: view }, async (request) => audit().listEvents(requestQuery(request)));

  fastify.get('/email-logs', { preHandler: view }, async (request) => audit().listEmailLogs(requestQuery(request)));

  fastify.get('/requests/:requestId', { preHandler: view }, async (request) =>
    audit().getRequestAudit(requestParams<{ requestId: string }>(request).requestId),
  );

  fastify.post('/', { preHandler: manage, schema: { body: CreateAuditEventSchema } }, async (request) =>
    audit().createEvent(requestBody<CreateAuditEvent>(request), request.user?.id),
  );
};
