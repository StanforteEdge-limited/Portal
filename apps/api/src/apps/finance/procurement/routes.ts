import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams } from '$core/routes';
import { procurementPermissions } from './permissions';

export const ProcurementRoutes: FastifyPluginAsync = async (fastify) => {
  const procurement = () => fastify.container.procurement;
  const authenticated = composeGuards(requireAuth);
  const read = composeGuards(
    requireAuth,
    requirePermissions(procurementPermissions.read, 'procurement.view', 'procurement.read'),
  );
  const write = composeGuards(
    requireAuth,
    requirePermissions(procurementPermissions.write, 'procurement.manage', 'procurement.write'),
  );
  const approve = composeGuards(
    requireAuth,
    requirePermissions(procurementPermissions.write, 'procurement.approve'),
  );

  const actor = (req: FastifyRequest) => (req.user as any)?.id as string;
  const userRole = (req: FastifyRequest) => {
    const user = req.user as any;
    if (
      user?.isTenantOwner ||
      user?.roles?.some((r: string) =>
        ['admin', 'owner', 'procurement_officer', 'finance_admin'].includes(String(r).toLowerCase()),
      )
    ) {
      return 'admin';
    }
    return 'staff';
  };
  const inTenant = (req: FastifyRequest, op: () => Promise<unknown> | unknown) =>
    fastify.container.tenantContext.run(currentTenant(req), op);

  // Intake
  fastify.get('/intake', { preHandler: authenticated }, async (req) =>
    inTenant(req, () => procurement().listIntake(actor(req), userRole(req))),
  );

  fastify.post('/intake/:requestId/create-case', { preHandler: write }, async (req) => {
    const { requestId } = requestParams<{ requestId: string }>(req);
    return inTenant(req, () => procurement().createCaseFromApprovedRequest(requestId, actor(req), requestBody(req)));
  });

  // Requisitions (staff can list/create/submit their own; approvals & tenant-wide reads require RBAC)
  fastify.get('/requisitions', { preHandler: authenticated }, async (req) =>
    inTenant(req, () => procurement().listPrs(actor(req), userRole(req))),
  );

  fastify.get('/requisitions/:id', { preHandler: read }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().getPr(id));
  });

  fastify.post('/requisitions', { preHandler: authenticated }, async (req) =>
    inTenant(req, () => procurement().createPr(actor(req), requestBody(req))),
  );

  fastify.post('/requisitions/:id/submit', { preHandler: authenticated }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().submitPr(id, actor(req)));
  });

  fastify.post('/requisitions/:id/approve', { preHandler: approve }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    const body = requestBody<{ comment?: string }>(req);
    return inTenant(req, () => procurement().approvePr(id, actor(req), body?.comment));
  });

  fastify.post('/requisitions/:id/reject', { preHandler: approve }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    const body = requestBody<{ comment?: string }>(req);
    return inTenant(req, () => procurement().rejectPr(id, actor(req), body?.comment));
  });

  fastify.post('/requisitions/:id/attachments', { preHandler: write }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().attachToRequisition(id, requestBody(req)));
  });

  // Purchase Orders
  fastify.get('/orders', { preHandler: read }, async (req) =>
    inTenant(req, () => procurement().listPos(actor(req))),
  );

  fastify.get('/orders/:id', { preHandler: read }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().getPo(id));
  });

  fastify.post('/orders', { preHandler: write }, async (req) =>
    inTenant(req, () => procurement().createPo(actor(req), requestBody(req))),
  );

  fastify.post('/orders/:id/approve', { preHandler: approve }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    const body = requestBody<{ comment?: string }>(req);
    return inTenant(req, () => procurement().approvePo(id, actor(req), body?.comment));
  });

  fastify.post('/orders/:id/reject', { preHandler: approve }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    const body = requestBody<{ comment?: string }>(req);
    return inTenant(req, () => procurement().rejectPo(id, actor(req), body?.comment));
  });

  fastify.post('/orders/:id/download', { preHandler: read }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().downloadPo(id, actor(req)));
  });

  fastify.post('/orders/:id/attachments', { preHandler: write }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().attachToOrder(id, requestBody(req)));
  });

  // Goods Receipt Notes (GRN)
  fastify.post('/grns', { preHandler: write }, async (req) =>
    inTenant(req, () => procurement().createGrn(actor(req), requestBody(req))),
  );

  fastify.post('/grns/:id/confirm', { preHandler: approve }, async (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => procurement().confirmGrn(id, actor(req), requestBody(req)));
  });
};
