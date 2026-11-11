import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  ActionRequestSchema,
  CreateCategorySchema,
  CreateGroupSchema,
  CreateManualRequestSchema,
  CreateRequestSchema,
  CreateTypeSchema,
  DownloadRequestSchema,
  RequestsIdParamsSchema,
  RetireRequestSchema,
  SubmitRequestSchema,
  UpdateCategorySchema,
  UpdateGroupSchema,
  UpdateRequestSchema,
  UpdateTypeSchema,
  type ActionRequest,
  type CreateCategory,
  type CreateGroup,
  type CreateManualRequest,
  type CreateRequest,
  type CreateType,
  type DownloadRequest,
  type RequestsIdParams,
  type RetireRequest,
  type SubmitRequest,
  type UpdateCategory,
  type UpdateGroup,
  type UpdateRequest,
  type UpdateType,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { requestsPermissions } from './permissions';

const RequestListQuerySchema = Type.Object({
  status: Type.Optional(Type.String()),
  request_type_id: Type.Optional(Type.String()),
  group_id: Type.Optional(Type.String()),
  category_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  created_by: Type.Optional(Type.String()),
  from: Type.Optional(Type.String()),
  to: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  include_inactive: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
type RequestListQuery = Record<string, any>;

const RequestTypeQuerySchema = Type.Object({
  group_id: Type.Optional(Type.String()),
  category_id: Type.Optional(Type.String()),
  include_inactive: Type.Optional(Type.String()),
});
type RequestTypeQuery = { group_id?: string; category_id?: string; include_inactive?: string };

const VoucherParamsSchema = Type.Object({ id: Type.String(), voucherId: Type.String() });
type VoucherParams = { id: string; voucherId: string };

/** Mounted at `/v1/requests`. */
export const RequestsRoutes: FastifyPluginAsync = async (fastify) => {
  const requests = () => fastify.container.requests;
  const read = composeGuards(requireAuth, requirePermissions(requestsPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(requestsPermissions.write));
  const authenticated = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const id = (request: FastifyRequest) => requestParams<RequestsIdParams>(request).id;

  fastify.get('/groups', { preHandler: read }, async () => requests().listGroups());

  fastify.post('/groups', { preHandler: write, schema: { body: CreateGroupSchema } }, async (request) =>
    requests().createGroup(requestBody<CreateGroup>(request)),
  );

  fastify.put('/groups/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema, body: UpdateGroupSchema } }, async (request) =>
    requests().updateGroup(id(request), requestBody<UpdateGroup>(request)),
  );

  fastify.delete('/groups/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().deleteGroup(id(request)),
  );

  fastify.get('/categories', { preHandler: read, schema: { querystring: RequestTypeQuerySchema } }, async (request) =>
    requests().listCategories(requestQuery<RequestTypeQuery>(request).group_id),
  );

  fastify.post('/categories', { preHandler: write, schema: { body: CreateCategorySchema } }, async (request) =>
    requests().createCategory(requestBody<CreateCategory>(request)),
  );

  fastify.put('/categories/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema, body: UpdateCategorySchema } }, async (request) =>
    requests().updateCategory(id(request), requestBody<UpdateCategory>(request)),
  );

  fastify.delete('/categories/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().deleteCategory(id(request)),
  );

  fastify.get('/types', { preHandler: read, schema: { querystring: RequestTypeQuerySchema } }, async (request) => {
    const query = requestQuery<RequestTypeQuery>(request);
    return requests().listTypes(query.group_id, query.category_id, query.include_inactive === 'true', actor(request));
  });

  fastify.post('/types', { preHandler: write, schema: { body: CreateTypeSchema } }, async (request) =>
    requests().createType(requestBody<CreateType>(request), actor(request)),
  );

  fastify.get('/types/:id', { preHandler: read, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().getType(id(request)),
  );

  fastify.put('/types/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema, body: UpdateTypeSchema } }, async (request) =>
    requests().updateType(id(request), requestBody<UpdateType>(request), actor(request)),
  );

  fastify.delete('/types/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().deleteType(id(request), actor(request)),
  );

  fastify.post('/manual', { preHandler: write, schema: { body: CreateManualRequestSchema } }, async (request) =>
    requests().createManualEntry(actor(request), requestBody<CreateManualRequest>(request)),
  );

  fastify.put('/manual/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema, body: CreateManualRequestSchema } }, async (request) =>
    requests().updateManualEntry(id(request), actor(request), requestBody<CreateManualRequest>(request)),
  );

  fastify.delete('/manual/:id', { preHandler: write, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().deleteManualEntry(id(request), actor(request)),
  );

  fastify.get('/manual/check-request-number', { preHandler: write, schema: { querystring: RequestListQuerySchema } }, async (request) => {
    const query = requestQuery<RequestListQuery>(request);
    return requests().checkManualRequestNumber(query.request_id, query.request_type_id, query.exclude_id);
  });

  fastify.get('/manual/check-voucher-number', { preHandler: write, schema: { querystring: RequestListQuerySchema } }, async (request) => {
    const query = requestQuery<RequestListQuery>(request);
    return requests().checkManualVoucherNumber(query.voucher_number, query.exclude_request_id);
  });

  fastify.get('/approvals', { preHandler: authenticated, schema: { querystring: RequestListQuerySchema } }, async (request) =>
    requests().getApprovals(actor(request), requestQuery<RequestListQuery>(request)),
  );

  fastify.get('/leave-balance', { preHandler: authenticated, schema: { querystring: RequestListQuerySchema } }, async (request) =>
    requests().getMyLeaveBalance(actor(request), requestQuery<RequestListQuery>(request)),
  );

  fastify.get('/leave/balance', { preHandler: authenticated }, async (request) =>
    requests().getMyLeaveBalance(actor(request), requestQuery<any>(request)),
  );

  fastify.post('/', { preHandler: authenticated, schema: { body: CreateRequestSchema } }, async (request) =>
    requests().createRequest(actor(request), requestBody<CreateRequest>(request)),
  );

  fastify.get('/', { preHandler: authenticated, schema: { querystring: RequestListQuerySchema } }, async (request) =>
    requests().listRequests(requestQuery<RequestListQuery>(request), actor(request)),
  );

  fastify.put('/:id', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: UpdateRequestSchema } }, async (request) =>
    requests().updateRequest(id(request), actor(request), requestBody<UpdateRequest>(request)),
  );

  fastify.delete('/:id', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().deleteRequest(id(request), actor(request)),
  );

  fastify.get('/:id/history', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().getApprovalHistory(id(request), actor(request)),
  );

  fastify.get('/:id/thread', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().getRequestThread(id(request), actor(request)),
  );

  fastify.get('/:id/actions', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().getActions(id(request), actor(request)),
  );

  fastify.post('/:id/submit', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: SubmitRequestSchema } }, async (request) =>
    requests().submitRequest(id(request), actor(request), requestBody<SubmitRequest>(request)),
  );

  fastify.post('/:id/approve', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: ActionRequestSchema } }, async (request) =>
    requests().approveRequest(id(request), actor(request), requestBody<ActionRequest>(request)),
  );

  fastify.post('/:id/reject', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: ActionRequestSchema } }, async (request) =>
    requests().rejectRequest(id(request), actor(request), requestBody<ActionRequest>(request)),
  );

  fastify.post('/:id/return', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: ActionRequestSchema } }, async (request) =>
    requests().returnRequest(id(request), actor(request), requestBody<ActionRequest>(request)),
  );

  fastify.post('/:id/download', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: DownloadRequestSchema } }, async (request) =>
    requests().downloadByAction(id(request), actor(request), requestBody<DownloadRequest>(request)),
  );

  fastify.post('/:id/confirm-disbursement', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().confirmDisbursement(id(request), actor(request)),
  );

  fastify.post('/:id/vouchers/:voucherId/confirm', { preHandler: authenticated, schema: { params: VoucherParamsSchema } }, async (request) => {
    const params = requestParams<VoucherParams>(request);
    return requests().confirmPaymentVoucher(params.id, params.voucherId, actor(request));
  });

  fastify.post('/:id/retire', { preHandler: authenticated, schema: { params: RequestsIdParamsSchema, body: RetireRequestSchema } }, async (request) =>
    requests().retire(id(request), actor(request), requestBody<RetireRequest>(request)),
  );

  fastify.post('/:id/verify-retirement', { preHandler: write, schema: { params: RequestsIdParamsSchema } }, async (request) =>
    requests().verifyRetirement(id(request), actor(request)),
  );
};
