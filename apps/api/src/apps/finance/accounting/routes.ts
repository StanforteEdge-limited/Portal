import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { accountingPermissions } from './permissions';

export const FinanceRoutes: FastifyPluginAsync = async (fastify) => {
  const finance = () => fastify.container.finance;
  const read = composeGuards(
    requireAuth,
    requirePermissions(accountingPermissions.read, 'finance.read', 'finance.view'),
  );
  const write = composeGuards(
    requireAuth,
    requirePermissions(accountingPermissions.write, 'finance.write', 'finance.manage'),
  );
  const approve = composeGuards(
    requireAuth,
    requirePermissions(accountingPermissions.write, 'finance.approve', 'budgets.approve'),
  );
  const disburse = composeGuards(
    requireAuth,
    requirePermissions(accountingPermissions.write, 'finance.disburse', 'finance.manage'),
  );
  const inTenant = <T>(req: FastifyRequest, op: () => Promise<T> | T) =>
    fastify.container.tenantContext.run(currentTenant(req), op);

  // Dashboard summary
  fastify.get('/summary', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().summary(requestQuery(request)));
  });

  // Requests queue
  fastify.get('/requests', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listRequests(requestQuery(request)));
  });

  fastify.get('/requests/export', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().exportRequests(requestQuery(request)));
  });

  fastify.post('/requests/:id/disburse', { preHandler: disburse }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().disburseRequest(id, requestBody(request), (request.user as any)?.id),
    );
  });

  fastify.get('/requests/:id/payment-vouchers', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().listPaymentVouchers(id));
  });

  fastify.post('/requests/:id/payment-vouchers/:voucherId', { preHandler: write }, async (request) => {
    const { id, voucherId } = requestParams<{ id: string; voucherId: string }>(request);
    return inTenant(request, () =>
      finance().updatePaymentVoucher(id, voucherId, requestBody(request)),
    );
  });

  // Payment Vouchers
  fastify.get('/payment-vouchers', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listAllPaymentVouchers(requestQuery(request)));
  });

  fastify.get('/payment-vouchers/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, async () => {
      const result = await finance().listAllPaymentVouchers({ voucher_number: id });
      return result?.data?.[0] ?? null;
    });
  });

  // Settings
  fastify.get('/settings', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().getSettings());
  });

  fastify.put('/settings', { preHandler: write }, async (request) => {
    return inTenant(request, () => finance().updateSettings(requestBody(request)));
  });

  // Accounts
  fastify.get('/accounts', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listAccounts(requestQuery(request)));
  });

  fastify.get('/accounts/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getAccount(id));
  });

  // Ledger
  fastify.get('/ledger', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listLedger(requestQuery(request)));
  });

  fastify.get('/ledger/export', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().exportLedger(requestQuery(request)));
  });

  // Budgets
  fastify.get('/budgets', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listBudgets(requestQuery(request)));
  });

  fastify.get('/budgets/approved-lines', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listApprovedBudgetLines(requestQuery(request)));
  });

  fastify.get('/budgets/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getBudget(id));
  });

  fastify.post('/budgets', { preHandler: write }, async (request) => {
    return inTenant(request, () => finance().createBudget(requestBody(request), (request.user as any)?.id));
  });

  fastify.put('/budgets/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateBudget(id, requestBody(request), (request.user as any)?.id),
    );
  });

  fastify.post('/budgets/:id/approve', { preHandler: approve }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().approveBudget(id, (request.user as any)?.id));
  });

  fastify.post('/budgets/:id/reopen', { preHandler: approve }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().reopenBudget(id, (request.user as any)?.id));
  });

  fastify.post('/budgets/:id/recalculate', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().recalculateBudget(id));
  });

  fastify.post('/budgets/:id/copy', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().copyBudget(id, requestBody(request), (request.user as any)?.id),
    );
  });
};

export const AccountingRoutes = FinanceRoutes;
