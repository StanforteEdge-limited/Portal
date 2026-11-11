import type { FastifyPluginAsync } from 'fastify';
import { composeGuards, requireAuth } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';

export const FinanceRoutes: FastifyPluginAsync = async (fastify) => {
  const finance = () => fastify.container.finance;
  const authenticated = composeGuards(requireAuth);

  // Dashboard summary
  fastify.get('/summary', { preHandler: authenticated }, async (request) => {
    return finance().summary(requestQuery(request));
  });

  // Requests queue
  fastify.get('/requests', { preHandler: authenticated }, async (request) => {
    return finance().listRequests(requestQuery(request));
  });

  fastify.get('/requests/export', { preHandler: authenticated }, async (request) => {
    return finance().exportRequests(requestQuery(request));
  });

  fastify.post('/requests/:id/disburse', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().disburseRequest(id, requestBody(request));
  });

  fastify.get('/requests/:id/payment-vouchers', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().listPaymentVouchers(id);
  });

  fastify.post('/requests/:id/payment-vouchers/:voucherId', { preHandler: authenticated }, async (request) => {
    const { id, voucherId } = requestParams<{ id: string; voucherId: string }>(request);
    return finance().updatePaymentVoucher(id, voucherId, requestBody(request));
  });

  // Payment Vouchers
  fastify.get('/payment-vouchers', { preHandler: authenticated }, async (request) => {
    return finance().listAllPaymentVouchers(requestQuery(request));
  });

  fastify.get('/payment-vouchers/:id', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    const result = await finance().listAllPaymentVouchers({ voucher_number: id });
    return result?.data?.[0] ?? null;
  });

  // Settings
  fastify.get('/settings', { preHandler: authenticated }, async () => {
    return finance().getSettings();
  });

  fastify.put('/settings', { preHandler: authenticated }, async (request) => {
    return finance().updateSettings(requestBody(request));
  });

  // Accounts
  fastify.get('/accounts', { preHandler: authenticated }, async (request) => {
    return finance().listAccounts(requestQuery(request));
  });

  fastify.get('/accounts/:id', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().getAccount(id);
  });

  // Ledger
  fastify.get('/ledger', { preHandler: authenticated }, async (request) => {
    return finance().listLedger(requestQuery(request));
  });

  fastify.get('/ledger/export', { preHandler: authenticated }, async (request) => {
    return finance().exportLedger(requestQuery(request));
  });

  // Budgets
  fastify.get('/budgets', { preHandler: authenticated }, async (request) => {
    return finance().listBudgets(requestQuery(request));
  });

  fastify.get('/budgets/approved-lines', { preHandler: authenticated }, async (request) => {
    return finance().listApprovedBudgetLines(requestQuery(request));
  });

  fastify.get('/budgets/:id', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().getBudget(id);
  });

  fastify.post('/budgets', { preHandler: authenticated }, async (request) => {
    return finance().createBudget(requestBody(request), (request.user as any)?.id);
  });

  fastify.put('/budgets/:id', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().updateBudget(id, requestBody(request), (request.user as any)?.id);
  });

  fastify.post('/budgets/:id/approve', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().approveBudget(id, (request.user as any)?.id);
  });

  fastify.post('/budgets/:id/reopen', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().reopenBudget(id, (request.user as any)?.id);
  });

  fastify.post('/budgets/:id/recalculate', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().recalculateBudget(id);
  });

  fastify.post('/budgets/:id/copy', { preHandler: authenticated }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return finance().copyBudget(id, requestBody(request), (request.user as any)?.id);
  });
};

export const AccountingRoutes = FinanceRoutes;
