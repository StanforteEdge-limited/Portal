import type { FastifyPluginAsync } from 'fastify';
import {
  CreateLeaveRequestSchema,
  CreateLeaveTypeSchema,
  ReviewLeaveRequestSchema,
  leaveIdParamsSchema,
  type CreateLeaveRequest,
  type CreateLeaveType,
  type ReviewLeaveRequest,
  type leaveIdParams,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { leavePermissions } from './permissions';

/** Mounted at `/v1/leave`. */
export const LeaveRoutes: FastifyPluginAsync = async (fastify) => {
  const leave = () => fastify.container.leave;
  const self = composeGuards(requireAuth);
  const manage = composeGuards(requireAuth, requirePermissions(leavePermissions.write));

  /* ---------------------------------------------------------------------- */
  /* Self service — a requester only ever acts on their own context          */
  /* ---------------------------------------------------------------------- */

  fastify.get('/balance', { preHandler: self }, async (request) => {
    const query = requestQuery<{ leave_type_id?: string; year?: string }>(request);
    return leave().balance(currentTenant(request), query.leave_type_id, Number(query.year ?? new Date().getFullYear()));
  });

  fastify.get('/requests', { preHandler: self }, async (request) =>
    leave().listMine(currentTenant(request), requestQuery<{ status?: string }>(request).status),
  );

  fastify.post(
    '/requests',
    { preHandler: self, schema: { body: CreateLeaveRequestSchema } },
    async (request) => leave().createRequest(currentTenant(request), requestBody<CreateLeaveRequest>(request)),
  );

  /* ---------------------------------------------------------------------- */
  /* Review queue                                                            */
  /* ---------------------------------------------------------------------- */

  fastify.get('/review-queue', { preHandler: manage }, async (request) =>
    leave().listForReview(currentTenant(request), requestQuery<{ status?: string }>(request).status ?? 'pending'),
  );

  fastify.post(
    '/requests/:id/review',
    { preHandler: manage, schema: { params: leaveIdParamsSchema, body: ReviewLeaveRequestSchema } },
    async (request) =>
      leave().review(
        currentTenant(request),
        requestParams<leaveIdParams>(request).id,
        requestBody<ReviewLeaveRequest>(request),
      ),
  );

  /* ---------------------------------------------------------------------- */
  /* Leave types — reference data owned by HR                               */
  /* ---------------------------------------------------------------------- */

  fastify.post('/types', { preHandler: manage, schema: { body: CreateLeaveTypeSchema } }, async (request) =>
    leave().createType(currentTenant(request), requestBody<CreateLeaveType>(request)),
  );
};
