import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  AuthorizePayrollRunSchema,
  CreatePayrollRunSchema,
  GeneratePayrollPayslipTemplateSchema,
  GeneratePayrollSummaryTemplateSchema,
  PayPayrollRunSchema,
  PayrollIdParamsSchema,
  PayrollImportSchema,
  PayrollListQuerySchema,
  ReviewPayrollRunSchema,
  UpdatePayrollRunAllocationsSchema,
  UpdatePayrollRunItemSchema,
  UpdatePayrollRunTimesheetAllocationsSchema,
  UpsertPayrollComponentSchema,
  UpsertPayrollLoanSchema,
  UpsertPayrollSettingSchema,
  UpsertPayrollTaxTableSchema,
  UpsertPayrollWorkerSchema,
  type AuthorizePayrollRun,
  type CreatePayrollRun,
  type GeneratePayrollPayslipTemplate,
  type GeneratePayrollSummaryTemplate,
  type PayPayrollRun,
  type PayrollIdParams,
  type PayrollImport,
  type PayrollListQuery,
  type ReviewPayrollRun,
  type UpdatePayrollRunAllocations,
  type UpdatePayrollRunItem,
  type UpdatePayrollRunTimesheetAllocations,
  type UpsertPayrollComponent,
  type UpsertPayrollLoan,
  type UpsertPayrollSetting,
  type UpsertPayrollTaxTable,
  type UpsertPayrollWorker,
} from '@stanforte/contract';
import { composeGuards, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody, requestParams, requestQuery } from '$core/routes';
import { payrollPermissions } from './permissions';

const RunItemParamsSchema = Type.Object({ runId: Type.String(), itemId: Type.String() });
type RunItemParams = { runId: string; itemId: string };

const RunWorkerParamsSchema = Type.Object({ runId: Type.String(), workerId: Type.String() });
type RunWorkerParams = { runId: string; workerId: string };

const LoanRepaymentSchema = Type.Object({
  amount: Type.Number({ minimum: 0 }),
  notes: Type.Optional(Type.String()),
});
type LoanRepayment = { amount: number; notes?: string };

/**
 * Mounted at `/v1/payroll`.
 *
 * Reads timesheet allocations that `$apps/hr/timesheets` projects into a run;
 * the entries themselves and their approval queue are served there.
 */
export const PayrollRoutes: FastifyPluginAsync = async (fastify) => {
  const payroll = () => fastify.container.payroll;
  const read = composeGuards(requireAuth, requirePermissions(payrollPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(payrollPermissions.write));
  const authenticated = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const permissions = (request: { user?: { permissions?: string[] } }) => request.user?.permissions ?? [];
  const id = (request: FastifyRequest) => requestParams<PayrollIdParams>(request).id;

  fastify.get('/summary', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().summary(requestQuery<PayrollListQuery>(request)),
  );

  fastify.get('/inbox', { preHandler: authenticated, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().getInbox(actor(request), permissions(request), requestQuery<PayrollListQuery>(request)),
  );

  fastify.get('/my/payslips', { preHandler: authenticated, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listMyPayslips(actor(request), requestQuery<PayrollListQuery>(request)),
  );

  fastify.get('/my/payslips/:runId/:itemId', { preHandler: authenticated, schema: { params: RunItemParamsSchema } }, async (request) => {
    const { runId, itemId } = requestParams<RunItemParams>(request);
    return payroll().getMyPayslipDetails(actor(request), runId, itemId);
  });

  fastify.post('/my/payslips/:runId/:itemId', { preHandler: authenticated, schema: { params: RunItemParamsSchema } }, async (request) => {
    const { runId, itemId } = requestParams<RunItemParams>(request);
    return payroll().generateMyPayslip(actor(request), runId, itemId);
  });

  fastify.get('/settings', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().getSettings(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/settings', { preHandler: write, schema: { body: UpsertPayrollSettingSchema } }, async (request) =>
    payroll().upsertSettings(requestBody<UpsertPayrollSetting>(request), actor(request)),
  );

  fastify.get('/notification-preferences', { preHandler: authenticated }, async (request) =>
    payroll().getNotificationPreferences(actor(request)),
  );

  fastify.post('/notification-preferences', { preHandler: authenticated }, async (request) =>
    payroll().upsertNotificationPreferences(actor(request), requestBody<Record<string, any>>(request)),
  );

  fastify.get('/tax-tables', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listTaxTables(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/tax-tables', { preHandler: write, schema: { body: UpsertPayrollTaxTableSchema } }, async (request) =>
    payroll().createTaxTable(requestBody<UpsertPayrollTaxTable>(request)),
  );

  fastify.post('/tax-tables/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: UpsertPayrollTaxTableSchema } }, async (request) =>
    payroll().updateTaxTable(id(request), requestBody<UpsertPayrollTaxTable>(request)),
  );

  fastify.get('/workers', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listWorkers(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/workers', { preHandler: write, schema: { body: UpsertPayrollWorkerSchema } }, async (request) =>
    payroll().createWorker(requestBody<UpsertPayrollWorker>(request), actor(request)),
  );

  fastify.get('/workers/:id', { preHandler: read, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().getWorker(id(request)),
  );

  fastify.post('/workers/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: UpsertPayrollWorkerSchema } }, async (request) =>
    payroll().updateWorker(id(request), requestBody<UpsertPayrollWorker>(request), actor(request)),
  );

  fastify.delete('/workers/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().deleteWorker(id(request)),
  );

  fastify.get('/loans', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listLoans(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/loans', { preHandler: write, schema: { body: UpsertPayrollLoanSchema } }, async (request) =>
    payroll().createLoan(requestBody<UpsertPayrollLoan>(request)),
  );

  fastify.post('/loans/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: UpsertPayrollLoanSchema } }, async (request) =>
    payroll().updateLoan(id(request), requestBody<UpsertPayrollLoan>(request)),
  );

  fastify.post('/loans/:id/repayments', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: LoanRepaymentSchema } }, async (request) => {
    const body = requestBody<LoanRepayment>(request);
    return payroll().logManualRepayment(id(request), body.amount, body.notes);
  });

  fastify.get('/components', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listComponents(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/components', { preHandler: write, schema: { body: UpsertPayrollComponentSchema } }, async (request) =>
    payroll().createComponent(requestBody<UpsertPayrollComponent>(request)),
  );

  fastify.post('/components/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: UpsertPayrollComponentSchema } }, async (request) =>
    payroll().updateComponent(id(request), requestBody<UpsertPayrollComponent>(request)),
  );

  fastify.delete('/components/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().deleteComponent(id(request)),
  );

  fastify.get('/runs', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listRuns(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/runs', { preHandler: write, schema: { body: CreatePayrollRunSchema } }, async (request) =>
    payroll().createRun(requestBody<CreatePayrollRun>(request), actor(request)),
  );

  fastify.get('/runs/:id', { preHandler: read, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().getRun(id(request)),
  );

  fastify.post('/runs/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: CreatePayrollRunSchema } }, async (request) =>
    payroll().updateRun(id(request), requestBody<CreatePayrollRun>(request), actor(request)),
  );

  fastify.delete('/runs/:id', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().deleteRun(id(request)),
  );

  fastify.post('/runs/:id/generate', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().generateRun(id(request), actor(request)),
  );

  fastify.post('/runs/:id/submit', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().submitRun(id(request), actor(request)),
  );

  fastify.post('/runs/:id/review', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: ReviewPayrollRunSchema } }, async (request) =>
    payroll().reviewRun(id(request), requestBody<ReviewPayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/approve', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: ReviewPayrollRunSchema } }, async (request) =>
    payroll().approveRun(id(request), requestBody<ReviewPayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/authorize', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: AuthorizePayrollRunSchema } }, async (request) =>
    payroll().authorizeRun(id(request), requestBody<AuthorizePayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/reject', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: ReviewPayrollRunSchema } }, async (request) =>
    payroll().rejectRun(id(request), requestBody<ReviewPayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/reopen', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().reopenRun(id(request), requestBody<ReviewPayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/close', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().closeRun(id(request), requestBody<ReviewPayrollRun>(request), actor(request)),
  );

  fastify.post('/runs/:id/pay', { preHandler: write, schema: { params: PayrollIdParamsSchema, body: PayPayrollRunSchema } }, async (request) =>
    payroll().payRun(id(request), requestBody<PayPayrollRun>(request), actor(request)),
  );

  fastify.get('/runs/:id/monthly-breakdown', { preHandler: read, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().monthlyBreakdown(id(request)),
  );

  fastify.get('/runs/:id/bank-schedule', { preHandler: read, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().generateBankSchedule(id(request)),
  );

  fastify.post('/runs/:id/payslips-package', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().generateRunPayslipsPackage(id(request)),
  );

  fastify.post('/runs/:id/payslips-package-asset', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().generateRunPayslipsPackageToAsset(id(request), actor(request)),
  );

  fastify.post('/runs/:id/distribute-payslips', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().distributeRunPayslips(id(request), actor(request)),
  );

  fastify.get('/runs/:runId/items/:itemId/payslip', { preHandler: read, schema: { params: RunItemParamsSchema } }, async (request) => {
    const { runId, itemId } = requestParams<RunItemParams>(request);
    return payroll().generateRunItemPayslip(runId, itemId);
  });

  fastify.post('/runs/:runId/items/:itemId', { preHandler: write, schema: { params: RunItemParamsSchema, body: UpdatePayrollRunItemSchema } }, async (request) => {
    const { runId, itemId } = requestParams<RunItemParams>(request);
    return payroll().updateRunItem(runId, itemId, requestBody<UpdatePayrollRunItem>(request), actor(request));
  });

  fastify.post('/runs/:runId/items/:itemId/allocations', { preHandler: write, schema: { params: RunItemParamsSchema, body: UpdatePayrollRunAllocationsSchema } }, async (request) => {
    const { runId, itemId } = requestParams<RunItemParams>(request);
    return payroll().updateRunItemAllocations(runId, itemId, requestBody<UpdatePayrollRunAllocations>(request), actor(request));
  });

  fastify.post('/runs/:runId/workers/:workerId/timesheet-allocations', { preHandler: write, schema: { params: RunWorkerParamsSchema, body: UpdatePayrollRunTimesheetAllocationsSchema } }, async (request) => {
    const { runId, workerId } = requestParams<RunWorkerParams>(request);
    return payroll().updateRunWorkerTimesheetAllocations(runId, workerId, requestBody<UpdatePayrollRunTimesheetAllocations>(request), actor(request));
  });

  fastify.get('/reports/overview', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().reportsOverview(requestQuery<PayrollListQuery>(request)),
  );

  fastify.post('/imports/validate', { preHandler: write, schema: { body: PayrollImportSchema } }, async (request) =>
    payroll().validateImport(requestBody<PayrollImport>(request)),
  );

  fastify.get('/imports', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listImportJobs(requestQuery<PayrollListQuery>(request)),
  );

  fastify.get('/imports/:id', { preHandler: read, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().getImportJob(id(request)),
  );

  fastify.post('/imports', { preHandler: write, schema: { body: PayrollImportSchema } }, async (request) =>
    payroll().commitImport(requestBody<PayrollImport>(request), actor(request)),
  );

  fastify.post('/imports/:id/retry', { preHandler: write, schema: { params: PayrollIdParamsSchema } }, async (request) =>
    payroll().retryFailedImport(id(request), actor(request)),
  );

  fastify.post('/templates/payslip', { preHandler: write, schema: { body: GeneratePayrollPayslipTemplateSchema } }, async (request) =>
    payroll().generatePayslipTemplate(requestBody<GeneratePayrollPayslipTemplate>(request)),
  );

  fastify.post('/templates/summary', { preHandler: write, schema: { body: GeneratePayrollSummaryTemplateSchema } }, async (request) =>
    payroll().generateSummaryTemplate(requestBody<GeneratePayrollSummaryTemplate>(request)),
  );

  fastify.get('/', { preHandler: read, schema: { querystring: PayrollListQuerySchema } }, async (request) =>
    payroll().listRuns(requestQuery<PayrollListQuery>(request)),
  );
};
