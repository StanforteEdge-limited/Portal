import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import {
  authenticatedUserId,
  paginateRows,
  requestBody,
  requestParams,
  requestQuery,
  runInTenant,
} from '$core/routes';
import { accountingPermissions } from './permissions';
import {
  financeAsset,
  financeAssetDisposal,
  financeBillHeader,
  financeBudget,
  financeChartAccount,
  financeContact,
  financeExpense,
  financeItem,
  financeJournalEntry,
  financePledge,
  financeSalesInvoice,
} from './model';

export const FinanceRoutes: FastifyPluginAsync = async (fastify) => {
  const finance = () => fastify.container.finance;
  const deduction = () => fastify.container.deduction;
  const db = () => fastify.container.db.client;

  const read = composeGuards(requireAuth, requirePermissions(accountingPermissions.read, 'finance.read', 'finance.view'));
  const write = composeGuards(requireAuth, requirePermissions(accountingPermissions.write, 'finance.write', 'finance.manage'));
  const approve = composeGuards(requireAuth, requirePermissions(accountingPermissions.write, 'finance.approve', 'budgets.approve'));
  const disburse = composeGuards(requireAuth, requirePermissions(accountingPermissions.write, 'finance.disburse', 'finance.manage'));

  const inTenant = <T>(req: FastifyRequest, op: () => Promise<T> | T) => runInTenant(fastify, req, op);
  const actorId = (req: FastifyRequest) => authenticatedUserId(req);
  const actorNum = (req: FastifyRequest) => Number(actorId(req) || 0);

  /** Register a paginated Drizzle list route without repeating boilerplate. */
  const registerListRoute = (
    path: string,
    queryFn: (req: FastifyRequest) => Promise<Record<string, any>[]>,
  ) => {
    fastify.get(path, { preHandler: read }, async (request) => {
      const rows = await queryFn(request);
      return paginateRows(rows, requestQuery(request));
    });
  };

  // Dashboard summary & Settings
  fastify.get('/summary', { preHandler: read }, (req) => inTenant(req, () => finance().summary(requestQuery(req))));
  fastify.get('/settings', { preHandler: read }, (req) => inTenant(req, () => finance().getSettings()));
  fastify.put('/settings', { preHandler: write }, (req) => inTenant(req, () => finance().updateSettings(requestBody(req))));

  // Finance Requests & Payment Vouchers
  fastify.get('/requests', { preHandler: read }, (req) => inTenant(req, () => finance().listRequests(requestQuery(req))));
  fastify.get('/requests/export', { preHandler: read }, (req) => inTenant(req, () => finance().exportRequests(requestQuery(req))));
  fastify.post('/requests/:id/disburse', { preHandler: disburse }, (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => finance().disburseRequest(id, requestBody(req), (req.user as any)?.id));
  });
  fastify.get('/requests/:id/payment-vouchers', { preHandler: read }, (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, () => finance().listPaymentVouchers(id));
  });
  fastify.post('/requests/:id/payment-vouchers/:voucherId', { preHandler: write }, (req) => {
    const { id, voucherId } = requestParams<{ id: string; voucherId: string }>(req);
    return inTenant(req, () => finance().updatePaymentVoucher(id, voucherId, requestBody(req)));
  });
  fastify.get('/payment-vouchers', { preHandler: read }, (req) => inTenant(req, () => finance().listAllPaymentVouchers(requestQuery(req))));
  fastify.get('/payment-vouchers/:id', { preHandler: read }, (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return inTenant(req, async () => (await finance().listAllPaymentVouchers({ voucher_number: id }))?.data?.[0] ?? null);
  });

  // Bank & Cash Accounts
  fastify.get('/accounts', { preHandler: read }, (req) => inTenant(req, () => finance().listAccounts(requestQuery(req))));
  fastify.get('/accounts/:id', { preHandler: read }, (req) => inTenant(req, () => finance().getAccount(requestParams<{ id: string }>(req).id)));
  fastify.post('/accounts', { preHandler: write }, (req) => inTenant(req, () => finance().createAccount(requestBody(req), actorId(req))));
  fastify.post('/accounts/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateAccount(requestParams<{ id: string }>(req).id, requestBody(req))));

  // Chart of Accounts
  registerListRoute('/chart-accounts', () => db().select().from(financeChartAccount));
  fastify.get('/chart-accounts/:id', { preHandler: read }, (req) => inTenant(req, () => finance().getChartAccount(requestParams<{ id: string }>(req).id)));
  fastify.post('/chart-accounts', { preHandler: write }, (req) => inTenant(req, () => finance().createChartAccount(requestBody(req), actorId(req))));
  fastify.post('/chart-accounts/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateChartAccount(requestParams<{ id: string }>(req).id, requestBody(req))));

  // Reporting Periods
  fastify.get('/reporting-periods', { preHandler: read }, (req) => inTenant(req, () => finance().listReportingPeriods(requestQuery(req))));
  fastify.post('/reporting-periods', { preHandler: write }, (req) => inTenant(req, () => finance().createReportingPeriod(requestBody(req), actorId(req))));
  fastify.post('/reporting-periods/:id/close', { preHandler: write }, (req) => inTenant(req, () => finance().closeReportingPeriod(requestParams<{ id: string }>(req).id)));
  fastify.post('/reporting-periods/:id/reopen', { preHandler: write }, (req) => inTenant(req, () => finance().reopenReportingPeriod(requestParams<{ id: string }>(req).id)));

  // Ledger & Manual Journal Entries
  fastify.get('/ledger', { preHandler: read }, (req) => inTenant(req, () => finance().listLedger(requestQuery(req))));
  fastify.get('/ledger/export', { preHandler: read }, (req) => inTenant(req, () => finance().exportLedger(requestQuery(req))));
  registerListRoute('/manual-entry', () => db().select().from(financeJournalEntry).orderBy(desc(financeJournalEntry.createdAt)));
  registerListRoute('/manual-entry/statutory-deductions', () => db().select().from(financeJournalEntry).orderBy(desc(financeJournalEntry.createdAt)));
  fastify.post('/manual-entry', { preHandler: write }, (req) => inTenant(req, () => finance().createManualJournalEntry(requestBody(req), actorId(req))));
  fastify.put('/manual-entry/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateManualJournalEntry(requestParams<{ id: string }>(req).id, requestBody(req), actorId(req))));
  fastify.post('/manual-entry/statutory-deductions', { preHandler: write }, (req) => inTenant(req, () => finance().createStatutoryDeductionManualEntry(requestBody(req), actorId(req))));

  // Income, Transfers & Expenses
  fastify.get('/income', { preHandler: read }, (req) => inTenant(req, () => finance().listIncome(requestQuery(req))));
  fastify.post('/income', { preHandler: write }, (req) => inTenant(req, () => finance().createIncome(requestBody(req), actorId(req))));
  fastify.post('/transfers', { preHandler: write }, (req) => inTenant(req, () => finance().createTransfer(requestBody(req), actorId(req))));
  registerListRoute('/expenses', (req) =>
    db().select().from(financeExpense).where(eq(financeExpense.tenantId, currentTenant(req).tenantId)).orderBy(desc(financeExpense.createdAt)),
  );
  fastify.post('/expenses', { preHandler: write }, (req) => inTenant(req, () => finance().createExpense(actorId(req), requestBody(req))));
  fastify.put('/expenses/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateExpense(actorId(req), requestParams<{ id: string }>(req).id, requestBody(req))));

  // Bills & Sales Invoices
  registerListRoute('/bills', () => db().select().from(financeBillHeader).orderBy(desc(financeBillHeader.createdAt)));
  fastify.get('/bills/:id', { preHandler: read }, (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return !id || id === 'null' || id === 'undefined' ? null : inTenant(req, () => finance().getBill(id));
  });
  fastify.post('/bills', { preHandler: write }, (req) => inTenant(req, () => finance().createBill(requestBody(req), actorId(req))));
  fastify.post('/vendor-payments', { preHandler: write }, (req) => inTenant(req, () => finance().createVendorPayment(requestBody(req), actorId(req))));

  registerListRoute('/sales-invoices', () => db().select().from(financeSalesInvoice).orderBy(desc(financeSalesInvoice.createdAt)));
  fastify.get('/sales-invoices/:id', { preHandler: read }, (req) => {
    const { id } = requestParams<{ id: string }>(req);
    return !id || id === 'null' || id === 'undefined' ? null : inTenant(req, () => finance().getSalesInvoice(id));
  });
  fastify.post('/sales-invoices', { preHandler: write }, (req) => inTenant(req, () => finance().createSalesInvoice(requestBody(req), actorId(req))));
  fastify.post('/receipts', { preHandler: write }, (req) => inTenant(req, () => finance().createReceipt(requestBody(req), actorId(req))));

  // Fixed Assets & Disposals
  registerListRoute('/assets', () => db().select().from(financeAsset).orderBy(desc(financeAsset.createdAt)));
  registerListRoute('/assets/disposals', () => db().select().from(financeAssetDisposal).orderBy(desc(financeAssetDisposal.createdAt)));
  fastify.get('/assets/:id', { preHandler: read }, (req) => inTenant(req, () => finance().getAsset(requestParams<{ id: string }>(req).id)));
  fastify.post('/assets', { preHandler: write }, (req) => inTenant(req, () => finance().createAsset(requestBody(req), actorId(req))));
  fastify.post('/assets/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateAsset(requestParams<{ id: string }>(req).id, requestBody(req), actorId(req))));
  fastify.post('/assets/:id/verify', { preHandler: write }, (req) => inTenant(req, () => finance().verifyAsset(requestParams<{ id: string }>(req).id, requestBody(req), actorId(req))));
  fastify.post('/assets/:id/dispose', { preHandler: write }, (req) => inTenant(req, () => finance().disposeAsset(requestParams<{ id: string }>(req).id, requestBody(req), actorId(req))));

  // Contacts, Customers, Vendors & Items
  registerListRoute('/contacts', (req) => {
    const type = requestQuery(req).contact_type;
    return type
      ? db().select().from(financeContact).where(eq(financeContact.contactType, String(type))).orderBy(desc(financeContact.createdAt))
      : db().select().from(financeContact).orderBy(desc(financeContact.createdAt));
  });
  fastify.get('/contacts/:id', { preHandler: read }, (req) => inTenant(req, () => finance().getContact(requestParams<{ id: string }>(req).id)));
  fastify.post('/contacts', { preHandler: write }, (req) => inTenant(req, () => finance().createContact(requestBody(req), actorId(req))));
  fastify.post('/contacts/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateContact(requestParams<{ id: string }>(req).id, requestBody(req), actorId(req))));
  fastify.get('/contacts/:id/transactions', { preHandler: read }, (req) => inTenant(req, () => finance().contactStatement(requestParams<{ id: string }>(req).id, requestQuery(req))));

  registerListRoute('/customers', () => db().select().from(financeContact).where(eq(financeContact.contactType, 'customer')).orderBy(desc(financeContact.createdAt)));
  fastify.post('/customers', { preHandler: write }, (req) => inTenant(req, () => finance().createCustomer(requestBody(req), actorId(req))));

  registerListRoute('/vendors', () => db().select().from(financeContact).where(eq(financeContact.contactType, 'vendor')).orderBy(desc(financeContact.createdAt)));
  fastify.post('/vendors', { preHandler: write }, (req) => inTenant(req, () => finance().createVendor(requestBody(req), actorId(req))));

  registerListRoute('/items', () => db().select().from(financeItem).orderBy(desc(financeItem.createdAt)));
  fastify.post('/items', { preHandler: write }, (req) => inTenant(req, () => finance().createItem(actorId(req), requestBody(req))));
  fastify.put('/items/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateItem(actorId(req), requestParams<{ id: string }>(req).id, requestBody(req))));

  // Donors, Funds, Grants & Pledges
  fastify.get('/donors', { preHandler: read }, (req) => inTenant(req, () => finance().listDonors(requestQuery(req))));
  fastify.get('/funds', { preHandler: read }, (req) => inTenant(req, () => finance().listFunds(requestQuery(req))));
  fastify.get('/grants', { preHandler: read }, (req) => inTenant(req, () => finance().listGrants(requestQuery(req))));
  registerListRoute('/pledges', () => db().select().from(financePledge).orderBy(desc(financePledge.createdAt)));

  // Financial Reports
  const reportRoutes: Array<[string, (q: Record<string, any>) => Promise<unknown>]> = [
    ['/reports/executive-summary', (q) => finance().executiveSummary(q)],
    ['/reports/income-summary', (q) => finance().incomeSummary(q)],
    ['/reports/expense-summary', (q) => finance().expenseSummary(q)],
    ['/reports/profit-loss', (q) => finance().profitLoss(q)],
    ['/reports/balances', (q) => finance().balances(q)],
    ['/reports/receivables', (q) => finance().receivables(q)],
    ['/reports/payables', (q) => finance().payables(q)],
    ['/reports/budget-vs-actual', (q) => finance().budgetVsActual(q)],
    ['/reports/grant-utilization', (q) => finance().grantUtilization(q)],
    ['/reports/notes', (q) => finance().listReportNotes(q)],
  ];
  for (const [path, handler] of reportRoutes) {
    fastify.get(path, { preHandler: read }, (req) => inTenant(req, () => handler(requestQuery(req))));
  }

  // Statutory Deductions & WHT Remittances
  fastify.get('/deduction-types', { preHandler: read }, (req) => inTenant(req, () => deduction().listDeductionTypes(requestQuery(req))));
  fastify.post('/deduction-types', { preHandler: write }, (req) => inTenant(req, () => deduction().upsertDeductionType(undefined, requestBody(req), actorNum(req))));
  fastify.post('/deduction-types/:id', { preHandler: write }, (req) => inTenant(req, () => deduction().upsertDeductionType(requestParams<{ id: string }>(req).id, requestBody(req), actorNum(req))));
  fastify.get('/payment-vouchers/:pvId/deductions', { preHandler: read }, (req) => inTenant(req, () => deduction().listPVDeductions(requestParams<{ pvId: string }>(req).pvId)));
  fastify.post('/payment-vouchers/:pvId/deductions', { preHandler: write }, (req) => inTenant(req, () => deduction().applyPVDeductions(requestParams<{ pvId: string }>(req).pvId, requestBody(req), actorNum(req))));
  fastify.get('/vendors/:vendorId/wht-accruals', { preHandler: read }, (req) => inTenant(req, () => deduction().listVendorAccruals(requestParams<{ vendorId: string }>(req).vendorId, requestQuery(req))));
  fastify.get('/wht-remittances', { preHandler: read }, (req) => inTenant(req, () => deduction().listWHTRemittances(requestQuery(req))));
  fastify.get('/wht-remittances/:id', { preHandler: read }, (req) => inTenant(req, () => deduction().getWHTRemittance(requestParams<{ id: string }>(req).id)));
  fastify.post('/wht-remittances', { preHandler: write }, (req) => inTenant(req, () => deduction().createWHTRemittance(requestBody(req), actorNum(req))));
  fastify.get('/statutory-deductions', { preHandler: read }, (req) => inTenant(req, () => deduction().listRequestDeductions(requestQuery(req) as any)));
  fastify.get('/request-remittances', { preHandler: read }, (req) => inTenant(req, () => deduction().listRequestRemittances(requestQuery(req) as any)));
  fastify.post('/request-remittances', { preHandler: write }, (req) => inTenant(req, () => deduction().batchRemitDeductions(requestBody(req), actorNum(req))));

  // Budgets
  registerListRoute('/budgets', (req) =>
    db().select().from(financeBudget).where(eq(financeBudget.tenantId, currentTenant(req).tenantId)).orderBy(desc(financeBudget.createdAt)),
  );
  fastify.get('/budgets/approved-lines', { preHandler: read }, (req) => inTenant(req, () => finance().listApprovedBudgetLines(requestQuery(req))));
  fastify.get('/budgets/:id', { preHandler: read }, (req) => inTenant(req, () => finance().getBudget(requestParams<{ id: string }>(req).id)));
  fastify.post('/budgets', { preHandler: write }, (req) => inTenant(req, () => finance().createBudget(requestBody(req), (req.user as any)?.id)));
  fastify.put('/budgets/:id', { preHandler: write }, (req) => inTenant(req, () => finance().updateBudget(requestParams<{ id: string }>(req).id, requestBody(req), (req.user as any)?.id)));
  fastify.post('/budgets/:id/approve', { preHandler: approve }, (req) => inTenant(req, () => finance().approveBudget(requestParams<{ id: string }>(req).id, (req.user as any)?.id)));
  fastify.post('/budgets/:id/reopen', { preHandler: approve }, (req) => inTenant(req, () => finance().reopenBudget(requestParams<{ id: string }>(req).id, (req.user as any)?.id)));
  fastify.post('/budgets/:id/recalculate', { preHandler: write }, (req) => inTenant(req, () => finance().recalculateBudget(requestParams<{ id: string }>(req).id)));
  fastify.post('/budgets/:id/copy', { preHandler: write }, (req) => inTenant(req, () => finance().copyBudget(requestParams<{ id: string }>(req).id, requestBody(req), (req.user as any)?.id)));
  fastify.get('/budgets/:id/revisions', { preHandler: read }, (req) => inTenant(req, () => finance().listBudgetRevisions(requestParams<{ id: string }>(req).id)));
};

export const AccountingRoutes = FinanceRoutes;
