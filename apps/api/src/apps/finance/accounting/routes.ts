import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
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

function serializeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const val = typeof v === 'bigint' ? v.toString() : v;
    out[k] = val;
    const snake = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (snake !== k) out[snake] = val;
  }
  return out;
}

function paginateRows(rows: Record<string, any>[], query: Record<string, any>) {
  const page = Math.max(1, Number(query.page || 1));
  const perPage = Math.min(200, Math.max(1, Number(query.per_page || 50)));
  const total = rows.length;
  const start = (page - 1) * perPage;
  const items = rows.slice(start, start + perPage).map(serializeRow);
  return {
    items,
    result: items,
    total,
    meta: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)) },
  };
}

export const FinanceRoutes: FastifyPluginAsync = async (fastify) => {
  const finance = () => fastify.container.finance;
  const deduction = () => fastify.container.deduction;
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

  // Bank & Cash Accounts
  fastify.get('/accounts', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listAccounts(requestQuery(request)));
  });

  fastify.get('/accounts/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getAccount(id));
  });

  fastify.post('/accounts', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createAccount(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/accounts/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().updateAccount(id, requestBody(request)));
  });

  // Chart of Accounts
  fastify.get('/chart-accounts', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client.select().from(financeChartAccount);
    return paginateRows(rows, requestQuery(request));
  });

  fastify.get('/chart-accounts/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getChartAccount(id));
  });

  fastify.post('/chart-accounts', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createChartAccount(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/chart-accounts/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().updateChartAccount(id, requestBody(request)));
  });

  // Reporting Periods
  fastify.get('/reporting-periods', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listReportingPeriods(requestQuery(request)));
  });

  fastify.post('/reporting-periods', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createReportingPeriod(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/reporting-periods/:id/close', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().closeReportingPeriod(id));
  });

  fastify.post('/reporting-periods/:id/reopen', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().reopenReportingPeriod(id));
  });

  // Ledger & Manual Entries
  fastify.get('/ledger', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listLedger(requestQuery(request)));
  });

  fastify.get('/ledger/export', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().exportLedger(requestQuery(request)));
  });

  fastify.get('/manual-entry', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeJournalEntry)
      .orderBy(desc(financeJournalEntry.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/manual-entry', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createManualJournalEntry(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.put('/manual-entry/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateManualJournalEntry(id, requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/manual-entry/statutory-deductions', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeJournalEntry)
      .orderBy(desc(financeJournalEntry.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/manual-entry/statutory-deductions', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createStatutoryDeductionManualEntry(
        requestBody(request),
        String((request.user as any)?.id ?? ''),
      ),
    );
  });

  // Income, Transfers & Expenses
  fastify.get('/income', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listIncome(requestQuery(request)));
  });

  fastify.post('/income', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createIncome(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/transfers', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createTransfer(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/expenses', { preHandler: read }, async (request) => {
    const tenantId = currentTenant(request).tenantId;
    const rows = await fastify.container.db.client
      .select()
      .from(financeExpense)
      .where(eq(financeExpense.tenantId, tenantId))
      .orderBy(desc(financeExpense.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/expenses', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createExpense(String((request.user as any)?.id ?? ''), requestBody(request)),
    );
  });

  fastify.put('/expenses/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateExpense(String((request.user as any)?.id ?? ''), id, requestBody(request)),
    );
  });

  // Bills & Sales Invoices
  fastify.get('/bills', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeBillHeader)
      .orderBy(desc(financeBillHeader.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.get('/bills/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    if (!id || id === 'null' || id === 'undefined') return null;
    return inTenant(request, () => finance().getBill(id));
  });

  fastify.post('/bills', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createBill(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/vendor-payments', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createVendorPayment(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/sales-invoices', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeSalesInvoice)
      .orderBy(desc(financeSalesInvoice.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.get('/sales-invoices/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    if (!id || id === 'null' || id === 'undefined') return null;
    return inTenant(request, () => finance().getSalesInvoice(id));
  });

  fastify.post('/sales-invoices', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createSalesInvoice(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/receipts', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createReceipt(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  // Fixed Assets & Disposals
  fastify.get('/assets', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeAsset)
      .orderBy(desc(financeAsset.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.get('/assets/disposals', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeAssetDisposal)
      .orderBy(desc(financeAssetDisposal.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.get('/assets/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getAsset(id));
  });

  fastify.post('/assets', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createAsset(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/assets/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateAsset(id, requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/assets/:id/verify', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().verifyAsset(id, requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/assets/:id/dispose', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().disposeAsset(id, requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  // Contacts, Customers, Vendors & Items
  fastify.get('/contacts', { preHandler: read }, async (request) => {
    const q = requestQuery(request);
    const rows = q.contact_type
      ? await fastify.container.db.client
          .select()
          .from(financeContact)
          .where(eq(financeContact.contactType, String(q.contact_type)))
          .orderBy(desc(financeContact.createdAt))
      : await fastify.container.db.client
          .select()
          .from(financeContact)
          .orderBy(desc(financeContact.createdAt));
    return paginateRows(rows, q);
  });

  fastify.get('/contacts/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().getContact(id));
  });

  fastify.post('/contacts', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createContact(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.post('/contacts/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateContact(id, requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/contacts/:id/transactions', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().contactStatement(id, requestQuery(request)));
  });

  fastify.get('/customers', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeContact)
      .where(eq(financeContact.contactType, 'customer'))
      .orderBy(desc(financeContact.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/customers', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createCustomer(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/vendors', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeContact)
      .where(eq(financeContact.contactType, 'vendor'))
      .orderBy(desc(financeContact.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/vendors', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createVendor(requestBody(request), String((request.user as any)?.id ?? '')),
    );
  });

  fastify.get('/items', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financeItem)
      .orderBy(desc(financeItem.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  fastify.post('/items', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      finance().createItem(String((request.user as any)?.id ?? ''), requestBody(request)),
    );
  });

  fastify.put('/items/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      finance().updateItem(String((request.user as any)?.id ?? ''), id, requestBody(request)),
    );
  });

  // Donors, Funds, Grants & Pledges
  fastify.get('/donors', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listDonors(requestQuery(request)));
  });

  fastify.get('/funds', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listFunds(requestQuery(request)));
  });

  fastify.get('/grants', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listGrants(requestQuery(request)));
  });

  fastify.get('/pledges', { preHandler: read }, async (request) => {
    const rows = await fastify.container.db.client
      .select()
      .from(financePledge)
      .orderBy(desc(financePledge.createdAt));
    return paginateRows(rows, requestQuery(request));
  });

  // Financial Reports
  fastify.get('/reports/executive-summary', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().executiveSummary(requestQuery(request)));
  });

  fastify.get('/reports/income-summary', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().incomeSummary(requestQuery(request)));
  });

  fastify.get('/reports/expense-summary', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().expenseSummary(requestQuery(request)));
  });

  fastify.get('/reports/profit-loss', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().profitLoss(requestQuery(request)));
  });

  fastify.get('/reports/balances', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().balances(requestQuery(request)));
  });

  fastify.get('/reports/receivables', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().receivables(requestQuery(request)));
  });

  fastify.get('/reports/payables', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().payables(requestQuery(request)));
  });

  fastify.get('/reports/budget-vs-actual', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().budgetVsActual(requestQuery(request)));
  });

  fastify.get('/reports/grant-utilization', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().grantUtilization(requestQuery(request)));
  });

  fastify.get('/reports/notes', { preHandler: read }, async (request) => {
    return inTenant(request, () => finance().listReportNotes(requestQuery(request)));
  });

  // Statutory Deductions & WHT Remittances
  fastify.get('/deduction-types', { preHandler: read }, async (request) => {
    return inTenant(request, () => deduction().listDeductionTypes(requestQuery(request)));
  });

  fastify.post('/deduction-types', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      deduction().upsertDeductionType(undefined, requestBody(request), Number((request.user as any)?.id ?? 0)),
    );
  });

  fastify.post('/deduction-types/:id', { preHandler: write }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () =>
      deduction().upsertDeductionType(id, requestBody(request), Number((request.user as any)?.id ?? 0)),
    );
  });

  fastify.get('/payment-vouchers/:pvId/deductions', { preHandler: read }, async (request) => {
    const { pvId } = requestParams<{ pvId: string }>(request);
    return inTenant(request, () => deduction().listPVDeductions(pvId));
  });

  fastify.post('/payment-vouchers/:pvId/deductions', { preHandler: write }, async (request) => {
    const { pvId } = requestParams<{ pvId: string }>(request);
    return inTenant(request, () =>
      deduction().applyPVDeductions(pvId, requestBody(request), Number((request.user as any)?.id ?? 0)),
    );
  });

  fastify.get('/vendors/:vendorId/wht-accruals', { preHandler: read }, async (request) => {
    const { vendorId } = requestParams<{ vendorId: string }>(request);
    return inTenant(request, () => deduction().listVendorAccruals(vendorId, requestQuery(request)));
  });

  fastify.get('/wht-remittances', { preHandler: read }, async (request) => {
    return inTenant(request, () => deduction().listWHTRemittances(requestQuery(request)));
  });

  fastify.get('/wht-remittances/:id', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => deduction().getWHTRemittance(id));
  });

  fastify.post('/wht-remittances', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      deduction().createWHTRemittance(requestBody(request), Number((request.user as any)?.id ?? 0)),
    );
  });

  fastify.get('/statutory-deductions', { preHandler: read }, async (request) => {
    return inTenant(request, () => deduction().listRequestDeductions(requestQuery(request) as any));
  });

  fastify.get('/request-remittances', { preHandler: read }, async (request) => {
    return inTenant(request, () => deduction().listRequestRemittances(requestQuery(request) as any));
  });

  fastify.post('/request-remittances', { preHandler: write }, async (request) => {
    return inTenant(request, () =>
      deduction().batchRemitDeductions(requestBody(request), Number((request.user as any)?.id ?? 0)),
    );
  });

  // Budgets
  fastify.get('/budgets', { preHandler: read }, async (request) => {
    const tenantId = currentTenant(request).tenantId;
    const rows = await fastify.container.db.client
      .select()
      .from(financeBudget)
      .where(eq(financeBudget.tenantId, tenantId))
      .orderBy(desc(financeBudget.createdAt));
    return paginateRows(rows, requestQuery(request));
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

  fastify.get('/budgets/:id/revisions', { preHandler: read }, async (request) => {
    const { id } = requestParams<{ id: string }>(request);
    return inTenant(request, () => finance().listBudgetRevisions(id));
  });
};

export const AccountingRoutes = FinanceRoutes;
