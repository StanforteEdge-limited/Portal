import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';

export const payrollWorker = pgTable("sta_payroll_workers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  profileId: bigint("profile_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  defaultFundId: uuid("default_fund_id"),
  defaultGrantId: uuid("default_grant_id"),
  taxTableId: uuid("tax_table_id"),
  workerType: varchar("worker_type", { length: 20 }).default("employee").notNull(),
  payBasis: varchar("pay_basis", { length: 30 }).default("monthly_fixed").notNull(),
  allocationMode: varchar("allocation_mode", { length: 20 }).default("fixed").notNull(),
  hybridFixedPercent: numeric("hybrid_fixed_percent", { precision: 8, scale: 4 }).default("0").notNull(),
  standardHoursPerDay: numeric("standard_hours_per_day", { precision: 8, scale: 2 }).default("8").notNull(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 255 }),
  staffCode: varchar("staff_code", { length: 60 }),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  bankName: varchar("bank_name", { length: 150 }),
  bankAccountName: varchar("bank_account_name", { length: 180 }),
  bankAccountNumber: varchar("bank_account_number", { length: 60 }),
  taxIdentifier: varchar("tax_identifier", { length: 120 }),
  pensionIdentifier: varchar("pension_identifier", { length: 120 }),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollWorker_index_profileId").on(table.profileId),
    index("payrollWorker_index_tenantId").on(table.tenantId),
    index("payrollWorker_index_organizationId").on(table.organizationId),
    index("payrollWorker_index_teamId").on(table.teamId),
    index("payrollWorker_index_projectId").on(table.projectId),
    index("payrollWorker_index_defaultFundId").on(table.defaultFundId),
    index("payrollWorker_index_defaultGrantId").on(table.defaultGrantId),
    index("payrollWorker_index_taxTableId").on(table.taxTableId),
    index("payrollWorker_index_workerType_status").on(table.workerType, table.status),
]);

export type PayrollWorker = typeof payrollWorker.$inferSelect;
export type NewPayrollWorker = typeof payrollWorker.$inferInsert;

export const payrollComponent = pgTable("sta_payroll_components", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  chartAccountId: uuid("chart_account_id"),
  code: varchar("code", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  componentType: varchar("component_type", { length: 20 }).notNull(),
  calculationType: varchar("calculation_type", { length: 20 }).default("fixed").notNull(),
  paidBy: varchar("paid_by", { length: 20 }).default("employee").notNull(),
  employerSharePercent: numeric("employer_share_percent", { precision: 8, scale: 4 }).default("0").notNull(),
  isTaxable: boolean("is_taxable").default(false).notNull(),
  affectsNetPay: boolean("affects_net_pay").default(true).notNull(),
  isStatutory: boolean("is_statutory").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollComponent_index_chartAccountId").on(table.chartAccountId),
    index("payrollComponent_index_componentType_isActive").on(table.componentType, table.isActive),
]);

export type PayrollComponent = typeof payrollComponent.$inferSelect;
export type NewPayrollComponent = typeof payrollComponent.$inferInsert;

export const payrollWorkerProfile = pgTable("sta_payroll_worker_profiles", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workerId: uuid("worker_id").notNull(),
  payFrequency: varchar("pay_frequency", { length: 20 }).default("monthly").notNull(),
  baseAmount: numeric("base_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentMode: varchar("payment_mode", { length: 30 }),
  effectiveFrom: date("effective_from", { mode: 'date' }).notNull(),
  effectiveTo: date("effective_to", { mode: 'date' }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollWorkerProfile_index_workerId_effectiveFrom_effectiveTo").on(table.workerId, table.effectiveFrom, table.effectiveTo),
]);

export type PayrollWorkerProfile = typeof payrollWorkerProfile.$inferSelect;
export type NewPayrollWorkerProfile = typeof payrollWorkerProfile.$inferInsert;

export const payrollWorkerProfileComponent = pgTable("sta_payroll_worker_profile_components", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  profileId: uuid("profile_id").notNull(),
  componentId: uuid("component_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  rate: numeric("rate", { precision: 8, scale: 4 }),
  formula: text("formula"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_payroll_profile_component").on(table.profileId, table.componentId),
    index("payrollWorkerProfileComponent_index_componentId").on(table.componentId),
]);

export type PayrollWorkerProfileComponent = typeof payrollWorkerProfileComponent.$inferSelect;
export type NewPayrollWorkerProfileComponent = typeof payrollWorkerProfileComponent.$inferInsert;

export const payrollWorkerAllocation = pgTable("sta_payroll_worker_allocations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workerId: uuid("worker_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  allocationPercent: numeric("allocation_percent", { precision: 8, scale: 4 }).default("100").notNull(),
  allocationAmount: numeric("allocation_amount", { precision: 15, scale: 2 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollWorkerAllocation_index_workerId_sortOrder").on(table.workerId, table.sortOrder),
    index("payrollWorkerAllocation_index_organizationId").on(table.organizationId),
    index("payrollWorkerAllocation_index_teamId").on(table.teamId),
    index("payrollWorkerAllocation_index_projectId").on(table.projectId),
    index("payrollWorkerAllocation_index_fundId").on(table.fundId),
    index("payrollWorkerAllocation_index_grantId").on(table.grantId),
]);

export type PayrollWorkerAllocation = typeof payrollWorkerAllocation.$inferSelect;
export type NewPayrollWorkerAllocation = typeof payrollWorkerAllocation.$inferInsert;

export const payrollRun = pgTable("sta_payroll_runs", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  paidFromAccountId: uuid("paid_from_account_id"),
  workflowInstanceId: uuid("workflow_instance_id"),
  name: varchar("name", { length: 180 }).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  periodStart: date("period_start", { mode: 'date' }).notNull(),
  periodEnd: date("period_end", { mode: 'date' }).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  notes: text("notes"),
  preparedById: bigint("prepared_by", { mode: 'bigint' }),
  reviewedById: bigint("reviewed_by", { mode: 'bigint' }),
  approvedById: bigint("approved_by", { mode: 'bigint' }),
  authorizedAt: timestamp("authorized_at", { mode: 'date', precision: 6 }),
  authorizedById: bigint("authorized_by", { mode: 'bigint' }),
  authorizationNotes: text("authorization_notes"),
  paidAt: timestamp("paid_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_payroll_run_period").on(table.organizationId, table.year, table.month),
    index("payrollRun_index_status").on(table.status),
    index("payrollRun_index_workflowInstanceId").on(table.workflowInstanceId),
    index("payrollRun_index_paidFromAccountId").on(table.paidFromAccountId),
    index("payrollRun_index_tenantId").on(table.tenantId),
    index("payrollRun_index_organizationId").on(table.organizationId),
]);

export type PayrollRun = typeof payrollRun.$inferSelect;
export type NewPayrollRun = typeof payrollRun.$inferInsert;

export const payrollRunItem = pgTable("sta_payroll_run_items", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  workerId: uuid("worker_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  workerType: varchar("worker_type", { length: 20 }).notNull(),
  payBasis: varchar("pay_basis", { length: 30 }).default("monthly_fixed").notNull(),
  allocationSource: varchar("allocation_source", { length: 30 }).default("fixed").notNull(),
  grossPay: numeric("gross_pay", { precision: 15, scale: 2 }).default("0").notNull(),
  totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 }).default("0").notNull(),
  employerCostTotal: numeric("employer_cost_total", { precision: 15, scale: 2 }).default("0").notNull(),
  computedNetPay: numeric("computed_net_pay", { precision: 15, scale: 2 }).default("0").notNull(),
  actualNetPay: numeric("actual_net_pay", { precision: 15, scale: 2 }).default("0").notNull(),
  netAdjustmentAmount: numeric("net_adjustment_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  netAdjustmentReason: text("net_adjustment_reason"),
  netPay: numeric("net_pay", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).default("pending").notNull(),
  paymentReference: varchar("payment_reference", { length: 120 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_payroll_run_worker").on(table.runId, table.workerId),
    index("payrollRunItem_index_runId_paymentStatus").on(table.runId, table.paymentStatus),
    index("payrollRunItem_index_organizationId").on(table.organizationId),
    index("payrollRunItem_index_teamId").on(table.teamId),
    index("payrollRunItem_index_projectId").on(table.projectId),
    index("payrollRunItem_index_fundId").on(table.fundId),
    index("payrollRunItem_index_grantId").on(table.grantId),
]);

export type PayrollRunItem = typeof payrollRunItem.$inferSelect;
export type NewPayrollRunItem = typeof payrollRunItem.$inferInsert;

export const payrollRunTimesheetAllocation = pgTable("sta_payroll_run_timesheet_allocations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  workerId: uuid("worker_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  hours: numeric("hours", { precision: 10, scale: 2 }).default("0").notNull(),
  allocationPercent: numeric("allocation_percent", { precision: 8, scale: 4 }).default("0").notNull(),
  source: varchar("source", { length: 20 }).default("manual").notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollRunTimesheetAllocation_index_runId_workerId_sortOrder").on(table.runId, table.workerId, table.sortOrder),
    index("payrollRunTimesheetAllocation_index_organizationId").on(table.organizationId),
    index("payrollRunTimesheetAllocation_index_teamId").on(table.teamId),
    index("payrollRunTimesheetAllocation_index_projectId").on(table.projectId),
    index("payrollRunTimesheetAllocation_index_fundId").on(table.fundId),
    index("payrollRunTimesheetAllocation_index_grantId").on(table.grantId),
]);

export type PayrollRunTimesheetAllocation = typeof payrollRunTimesheetAllocation.$inferSelect;
export type NewPayrollRunTimesheetAllocation = typeof payrollRunTimesheetAllocation.$inferInsert;

export const payrollRunItemLine = pgTable("sta_payroll_run_item_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runItemId: uuid("run_item_id").notNull(),
  componentId: uuid("component_id").notNull(),
  lineType: varchar("line_type", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  rate: numeric("rate", { precision: 10, scale: 4 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollRunItemLine_index_runItemId").on(table.runItemId),
    index("payrollRunItemLine_index_componentId").on(table.componentId),
]);

export type PayrollRunItemLine = typeof payrollRunItemLine.$inferSelect;
export type NewPayrollRunItemLine = typeof payrollRunItemLine.$inferInsert;

export const payrollRunItemAllocation = pgTable("sta_payroll_run_item_allocations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runItemId: uuid("run_item_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  allocationPercent: numeric("allocation_percent", { precision: 8, scale: 4 }).default("100").notNull(),
  allocationAmount: numeric("allocation_amount", { precision: 15, scale: 2 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollRunItemAllocation_index_runItemId_sortOrder").on(table.runItemId, table.sortOrder),
    index("payrollRunItemAllocation_index_organizationId").on(table.organizationId),
    index("payrollRunItemAllocation_index_teamId").on(table.teamId),
    index("payrollRunItemAllocation_index_projectId").on(table.projectId),
    index("payrollRunItemAllocation_index_fundId").on(table.fundId),
    index("payrollRunItemAllocation_index_grantId").on(table.grantId),
]);

export type PayrollRunItemAllocation = typeof payrollRunItemAllocation.$inferSelect;
export type NewPayrollRunItemAllocation = typeof payrollRunItemAllocation.$inferInsert;

export const payrollAccountingPosting = pgTable("sta_payroll_accounting_postings", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  journalEntryId: uuid("journal_entry_id").notNull(),
  postedBy: bigint("posted_by", { mode: 'bigint' }),
  postedAt: timestamp("posted_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_payroll_posting").on(table.runId, table.journalEntryId),
    index("payrollAccountingPosting_index_journalEntryId").on(table.journalEntryId),
]);

export type PayrollAccountingPosting = typeof payrollAccountingPosting.$inferSelect;
export type NewPayrollAccountingPosting = typeof payrollAccountingPosting.$inferInsert;

export const payrollLoan = pgTable("sta_payroll_loans", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workerId: uuid("worker_id").notNull(),
  componentId: uuid("component_id"),
  requestId: bigint("request_id", { mode: 'bigint' }),
  loanType: varchar("loan_type", { length: 20 }).default("loan").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  principalAmount: numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: numeric("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  issuedDate: date("issued_date", { mode: 'date' }).notNull(),
  startRecoveryDate: date("start_recovery_date", { mode: 'date' }).notNull(),
  monthlyRecoveryAmount: numeric("monthly_recovery_amount", { precision: 15, scale: 2 }),
  recoveryRate: numeric("recovery_rate", { precision: 8, scale: 4 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollLoan_index_workerId_status").on(table.workerId, table.status),
    index("payrollLoan_index_componentId").on(table.componentId),
    index("payrollLoan_index_requestId").on(table.requestId),
]);

export type PayrollLoan = typeof payrollLoan.$inferSelect;
export type NewPayrollLoan = typeof payrollLoan.$inferInsert;

export const payrollLoanRepayment = pgTable("sta_payroll_loan_repayments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  loanId: uuid("loan_id").notNull(),
  runId: uuid("run_id"),
  runItemId: uuid("run_item_id"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("posted").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollLoanRepayment_index_loanId").on(table.loanId),
    index("payrollLoanRepayment_index_runId").on(table.runId),
    index("payrollLoanRepayment_index_runItemId").on(table.runItemId),
]);

export type PayrollLoanRepayment = typeof payrollLoanRepayment.$inferSelect;
export type NewPayrollLoanRepayment = typeof payrollLoanRepayment.$inferInsert;

export const payrollTaxTable = pgTable("sta_payroll_tax_tables", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 180 }).notNull(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  workerType: varchar("worker_type", { length: 20 }).default("employee").notNull(),
  periodicity: varchar("periodicity", { length: 20 }).default("monthly").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  effectiveFrom: date("effective_from", { mode: 'date' }).notNull(),
  effectiveTo: date("effective_to", { mode: 'date' }),
  fixedReliefAmount: numeric("fixed_relief_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  grossReliefRate: numeric("gross_relief_rate", { precision: 8, scale: 4 }).default("0").notNull(),
  minimumReliefAmount: numeric("minimum_relief_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  pensionReliefEnabled: boolean("pension_relief_enabled").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollTaxTable_index_organizationId_workerType_status").on(table.organizationId, table.workerType, table.status),
    index("payrollTaxTable_index_effectiveFrom_effectiveTo").on(table.effectiveFrom, table.effectiveTo),
]);

export type PayrollTaxTable = typeof payrollTaxTable.$inferSelect;
export type NewPayrollTaxTable = typeof payrollTaxTable.$inferInsert;

export const payrollTaxBand = pgTable("sta_payroll_tax_bands", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tableId: uuid("table_id").notNull(),
  lowerBound: numeric("lower_bound", { precision: 15, scale: 2 }).default("0").notNull(),
  upperBound: numeric("upper_bound", { precision: 15, scale: 2 }),
  rate: numeric("rate", { precision: 8, scale: 4 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollTaxBand_index_tableId_sortOrder").on(table.tableId, table.sortOrder),
]);

export type PayrollTaxBand = typeof payrollTaxBand.$inferSelect;
export type NewPayrollTaxBand = typeof payrollTaxBand.$inferInsert;

export const payrollImportJob = pgTable("sta_payroll_import_jobs", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  retryOfJobId: uuid("retry_of_job_id"),
  uploadedBy: bigint("uploaded_by", { mode: 'bigint' }),
  retriedBy: bigint("retried_by", { mode: 'bigint' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).default("processing").notNull(),
  updateExisting: boolean("update_existing").default(false).notNull(),
  summary: jsonb("summary"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'date', precision: 6 }),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollImportJob_index_status_createdAt").on(table.status, table.createdAt),
    index("payrollImportJob_index_uploadedBy").on(table.uploadedBy),
    index("payrollImportJob_index_retryOfJobId").on(table.retryOfJobId),
]);

export type PayrollImportJob = typeof payrollImportJob.$inferSelect;
export type NewPayrollImportJob = typeof payrollImportJob.$inferInsert;

export const payrollImportRow = pgTable("sta_payroll_import_rows", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  jobId: uuid("job_id").notNull(),
  sheetName: varchar("sheet_name", { length: 30 }).notNull(),
  rowNumber: integer("row_number"),
  rowKey: varchar("row_key", { length: 255 }),
  action: varchar("action", { length: 20 }).default("create").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  payload: jsonb("payload").notNull(),
  linkedRunId: uuid("linked_run_id"),
  linkedRunItemId: uuid("linked_run_item_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollImportRow_index_jobId_sheetName").on(table.jobId, table.sheetName),
    index("payrollImportRow_index_status").on(table.status),
    index("payrollImportRow_index_linkedRunId").on(table.linkedRunId),
    index("payrollImportRow_index_linkedRunItemId").on(table.linkedRunItemId),
]);

export type PayrollImportRow = typeof payrollImportRow.$inferSelect;
export type NewPayrollImportRow = typeof payrollImportRow.$inferInsert;

export const payrollRunEvent = pgTable("sta_payroll_run_events", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  actorId: bigint("actor_id", { mode: 'bigint' }),
  eventType: varchar("event_type", { length: 40 }).notNull(),
  note: text("note"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollRunEvent_index_runId_createdAt").on(table.runId, table.createdAt),
    index("payrollRunEvent_index_eventType").on(table.eventType),
    index("payrollRunEvent_index_actorId").on(table.actorId),
]);

export type PayrollRunEvent = typeof payrollRunEvent.$inferSelect;
export type NewPayrollRunEvent = typeof payrollRunEvent.$inferInsert;

export const payrollPayslipDistribution = pgTable("sta_payroll_payslip_distributions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  runItemId: uuid("run_item_id"),
  workerId: uuid("worker_id"),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  sentBy: bigint("sent_by", { mode: 'bigint' }),
  sentAt: timestamp("sent_at", { mode: 'date', precision: 6 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollPayslipDistribution_index_runId_createdAt").on(table.runId, table.createdAt),
    index("payrollPayslipDistribution_index_runItemId").on(table.runItemId),
    index("payrollPayslipDistribution_index_workerId").on(table.workerId),
    index("payrollPayslipDistribution_index_status").on(table.status),
    index("payrollPayslipDistribution_index_sentBy").on(table.sentBy),
]);

export type PayrollPayslipDistribution = typeof payrollPayslipDistribution.$inferSelect;
export type NewPayrollPayslipDistribution = typeof payrollPayslipDistribution.$inferInsert;

export const payrollSetting = pgTable("sta_payroll_settings", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  defaultExpenseAccountId: uuid("default_expense_account_id"),
  defaultCashAccountId: uuid("default_cash_account_id"),
  employeeTaxTableId: uuid("employee_tax_table_id"),
  config: jsonb("config"),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_payroll_setting_org").on(table.organizationId),
    index("payrollSetting_index_defaultExpenseAccountId").on(table.defaultExpenseAccountId),
    index("payrollSetting_index_defaultCashAccountId").on(table.defaultCashAccountId),
    index("payrollSetting_index_employeeTaxTableId").on(table.employeeTaxTableId),
]);

export type PayrollSetting = typeof payrollSetting.$inferSelect;
export type NewPayrollSetting = typeof payrollSetting.$inferInsert;

export const payrollNotificationPreference = pgTable("sta_payroll_notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().unique(),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("payrollNotificationPreference_index_userId").on(table.userId),
]);

export type PayrollNotificationPreference = typeof payrollNotificationPreference.$inferSelect;
export type NewPayrollNotificationPreference = typeof payrollNotificationPreference.$inferInsert;

export const modules_hr_payrollRelations = defineRelationsPart({ payrollWorker, payrollComponent, payrollWorkerProfile, payrollWorkerProfileComponent, payrollWorkerAllocation, payrollRun, payrollRunItem, payrollRunTimesheetAllocation, payrollRunItemLine, payrollRunItemAllocation, payrollAccountingPosting, payrollLoan, payrollLoanRepayment, payrollTaxTable, payrollTaxBand, payrollImportJob, payrollImportRow, payrollRunEvent, payrollPayslipDistribution, payrollSetting, payrollNotificationPreference });
