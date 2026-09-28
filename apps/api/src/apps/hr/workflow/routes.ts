import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CancelWorkflowSchema,
  ProcessWorkflowDecisionSchema,
  StartWorkflowForEntitySchema,
  WorkflowIdParamsSchema,
  type CancelWorkflow,
  type ProcessWorkflowDecision,
  type StartWorkflowForEntity,
  type WorkflowIdParams,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams } from '$core/routes';
import { workflowPermissions } from './permissions';

/**
 * Mounted at `/v1/workflow`.
 *
 * `startForRequest` is deliberately not routed: it derives the approval flow
 * from a request type's `approval_flow_json` and is called internally by the
 * requests module when a request is submitted. Only the generic entity start
 * and the instance actions are client reachable, and the acting user always
 * comes from the token.
 */
export const WorkflowRoutes: FastifyPluginAsync = async (fastify) => {
  const workflow = () => fastify.container.workflow;
  const read = composeGuards(requireAuth, requirePermissions(workflowPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(workflowPermissions.write));
  const instanceId = (request: FastifyRequest) => requestParams<WorkflowIdParams>(request).id;
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  fastify.get('/instances/:id', { preHandler: read, schema: { params: WorkflowIdParamsSchema } }, async (request) =>
    workflow().getInstance(instanceId(request)),
  );

  fastify.get('/instances/:id/actions', { preHandler: read, schema: { params: WorkflowIdParamsSchema } }, async (request) =>
    workflow().getAvailableActions(instanceId(request)),
  );

  fastify.get('/instances/:id/history', { preHandler: read, schema: { params: WorkflowIdParamsSchema } }, async (request) =>
    workflow().getHistory(instanceId(request)),
  );

  fastify.post('/instances', { preHandler: write, schema: { body: StartWorkflowForEntitySchema } }, async (request) => {
    const dto = requestBody<StartWorkflowForEntity>(request);
    return workflow().startForEntity({
      entityId: dto.entity_id,
      entityType: dto.entity_type,
      approvalFlowJson: dto.approval_flow,
      name: dto.name,
      amount: dto.amount ?? null,
      data: dto.data as Record<string, unknown> | undefined,
      initiatedBy: actor(request),
    });
  });

  fastify.post(
    '/instances/:id/decision',
    { preHandler: write, schema: { params: WorkflowIdParamsSchema, body: ProcessWorkflowDecisionSchema } },
    async (request) => {
      const dto = requestBody<ProcessWorkflowDecision>(request);
      return workflow().processDecision({
        instanceId: instanceId(request),
        action: dto.action,
        comment: dto.comment,
        performedBy: actor(request),
      });
    },
  );

  fastify.post(
    '/instances/:id/cancel',
    { preHandler: write, schema: { params: WorkflowIdParamsSchema, body: CancelWorkflowSchema } },
    async (request) => workflow().cancelWorkflow(instanceId(request), actor(request), requestBody<CancelWorkflow>(request).reason),
  );
};
