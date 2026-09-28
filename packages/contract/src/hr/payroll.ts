import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IsoDateOrDateTimeSchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const PayrollComponentTypeSchema = Type.Union([
  Type.Literal('earning'),
  Type.Literal('deduction'),
  Type.Literal('employer_cost'),
]);
export type PayrollComponentType = Static<typeof PayrollComponentTypeSchema>;

export const PayrollCalculationTypeSchema = Type.Union([
  Type.Literal('fixed'),
  Type.Literal('formula'),
  Type.Literal('percentage'),
]);
export type PayrollCalculationType = Static<typeof PayrollCalculationTypeSchema>;

export const PayrollPaidBySchema = Type.Union([
  Type.Literal('employee'),
  Type.Literal('employer'),
  Type.Literal('shared'),
]);
export type PayrollPaidBy = Static<typeof PayrollPaidBySchema>;

export const PayrollWorkerTypeSchema = Type.Union([
  Type.Literal('employee'),
  Type.Literal('consultant'),
]);
export type PayrollWorkerType = Static<typeof PayrollWorkerTypeSchema>;

export const PayrollPayBasisSchema = Type.Union([
  Type.Literal('monthly_fixed'),
  Type.Literal('hourly_timesheet'),
  Type.Literal('daily_rate'),
  Type.Literal('retainer'),
  Type.Literal('manual'),
]);
export type PayrollPayBasis = Static<typeof PayrollPayBasisSchema>;

export const PayrollAllocationModeSchema = Type.Union([
  Type.Literal('fixed'),
  Type.Literal('timesheet'),
  Type.Literal('hybrid'),
]);
export type PayrollAllocationMode = Static<typeof PayrollAllocationModeSchema>;

/* -------------------------------------------------------------------------- */
/* Nested row shapes                                                          */
/* -------------------------------------------------------------------------- */

/** One labelled line on a generated payslip. */
export const PayrollTemplateLineSchema = Type.Object({
  label: Type.String(),
  amount: Type.Number(),
});
export type PayrollTemplateLine = Static<typeof PayrollTemplateLineSchema>;

/** One worker's totals on a generated run summary. */
export const PayrollSummaryWorkerLineSchema = Type.Object({
  worker_name: Type.String(),
  gross_pay: Type.Number(),
  total_deductions: Type.Number(),
  net_pay: Type.Number(),
});
export type PayrollSummaryWorkerLine = Static<typeof PayrollSummaryWorkerLineSchema>;

/** Fixed-percentage split of a cost across funding dimensions. */
export const PayrollRunAllocationRowSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  allocation_percent: Type.Number(),
  allocation_amount: Type.Optional(Type.Number()),
});
export type PayrollRunAllocationRow = Static<typeof PayrollRunAllocationRowSchema>;

/** Timesheet-driven split, which tracks hours rather than a fixed percent. */
export const PayrollRunTimesheetAllocationRowSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  hours: Type.Optional(Type.Number()),
  allocation_percent: Type.Optional(Type.Number()),
  source: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type PayrollRunTimesheetAllocationRow = Static<
  typeof PayrollRunTimesheetAllocationRowSchema
>;

/** Progressive tax band. `upper_bound` is null on the open-ended top band. */
export const PayrollTaxBandSchema = Type.Object({
  lower_bound: Type.Optional(Type.Number({ minimum: 0 })),
  upper_bound: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
  rate: Type.Number({ minimum: 0 }),
  sort_order: Type.Optional(Type.Number({ minimum: 0 })),
});
export type PayrollTaxBand = Static<typeof PayrollTaxBandSchema>;

/* -------------------------------------------------------------------------- */
/* Payroll runs                                                               */
/* -------------------------------------------------------------------------- */

export const CreatePayrollRunSchema = Type.Object({
  name: Type.String(),
  year: Type.Integer(),
  /** 1-12. */
  month: Type.Integer({ minimum: 1, maximum: 12 }),
  period_start: IsoDateOrDateTimeSchema,
  period_end: IsoDateOrDateTimeSchema,
  currency: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  paid_from_account_id: Type.Optional(Type.String()),
});
export type CreatePayrollRun = Static<typeof CreatePayrollRunSchema>;

export const AuthorizePayrollRunSchema = Type.Object({
  notes: Type.Optional(Type.String()),
});
export type AuthorizePayrollRun = Static<typeof AuthorizePayrollRunSchema>;

export const ReviewPayrollRunSchema = Type.Object({
  note: Type.Optional(Type.String()),
});
export type ReviewPayrollRun = Static<typeof ReviewPayrollRunSchema>;

export const PayPayrollRunSchema = Type.Object({
  paid_from_account_id: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
});
export type PayPayrollRun = Static<typeof PayPayrollRunSchema>;

/** All-optional: the service merges only the keys present in the payload. */
export const UpdatePayrollRunItemSchema = Type.Object({
  gross_pay: Type.Optional(Type.Number({ minimum: 0 })),
  total_deductions: Type.Optional(Type.Number({ minimum: 0 })),
  employer_cost_total: Type.Optional(Type.Number({ minimum: 0 })),
  net_pay: Type.Optional(Type.Number({ minimum: 0 })),
  actual_net_pay: Type.Optional(Type.Number({ minimum: 0 })),
  net_adjustment_reason: Type.Optional(Type.String()),
  payment_status: Type.Optional(Type.String()),
  payment_reference: Type.Optional(Type.String()),
});
export type UpdatePayrollRunItem = Static<typeof UpdatePayrollRunItemSchema>;

export const UpdatePayrollRunAllocationsSchema = Type.Object({
  allocations: Type.Array(PayrollRunAllocationRowSchema),
});
export type UpdatePayrollRunAllocations = Static<typeof UpdatePayrollRunAllocationsSchema>;

export const UpdatePayrollRunTimesheetAllocationsSchema = Type.Object({
  allocations: Type.Array(PayrollRunTimesheetAllocationRowSchema),
});
export type UpdatePayrollRunTimesheetAllocations = Static<
  typeof UpdatePayrollRunTimesheetAllocationsSchema
>;

/* -------------------------------------------------------------------------- */
/* Template generation                                                        */
/* -------------------------------------------------------------------------- */

export const GeneratePayrollPayslipTemplateSchema = Type.Object({
  worker_name: Type.String(),
  worker_type: Type.Optional(Type.String()),
  organization_name: Type.Optional(Type.String()),
  period_label: Type.Optional(Type.String()),
  currency: Type.Optional(Type.String()),
  earnings: Type.Optional(Type.Array(PayrollTemplateLineSchema)),
  deductions: Type.Optional(Type.Array(PayrollTemplateLineSchema)),
  employer_costs: Type.Optional(Type.Array(PayrollTemplateLineSchema)),
  note: Type.Optional(Type.String()),
});
export type GeneratePayrollPayslipTemplate = Static<
  typeof GeneratePayrollPayslipTemplateSchema
>;

export const GeneratePayrollSummaryTemplateSchema = Type.Object({
  title: Type.String(),
  period_label: Type.Optional(Type.String()),
  currency: Type.Optional(Type.String()),
  workers: Type.Array(PayrollSummaryWorkerLineSchema),
  note: Type.Optional(Type.String()),
});
export type GeneratePayrollSummaryTemplate = Static<
  typeof GeneratePayrollSummaryTemplateSchema
>;

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

export const UpsertPayrollComponentSchema = Type.Object({
  chart_account_id: Type.Optional(Type.String()),
  code: Type.String({ maxLength: 60 }),
  name: Type.String({ maxLength: 180 }),
  component_type: PayrollComponentTypeSchema,
  calculation_type: Type.Optional(PayrollCalculationTypeSchema),
  paid_by: Type.Optional(PayrollPaidBySchema),
  employer_share_percent: Type.Optional(Type.Number({ minimum: 0 })),
  is_taxable: Type.Optional(Type.Boolean()),
  affects_net_pay: Type.Optional(Type.Boolean()),
  is_statutory: Type.Optional(Type.Boolean()),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpsertPayrollComponent = Static<typeof UpsertPayrollComponentSchema>;

export const UpsertPayrollSettingSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  default_expense_account_id: Type.Optional(Type.String()),
  default_cash_account_id: Type.Optional(Type.String()),
  employee_tax_table_id: Type.Optional(Type.String()),
  config: Type.Optional(MetadataSchema),
});
export type UpsertPayrollSetting = Static<typeof UpsertPayrollSettingSchema>;

export const UpsertPayrollTaxTableSchema = Type.Object({
  name: Type.String({ maxLength: 180 }),
  code: Type.String({ maxLength: 60 }),
  organization_id: Type.Optional(Type.String()),
  worker_type: Type.Optional(
    Type.Union([
      Type.Literal('employee'),
      Type.Literal('consultant'),
      Type.Literal('all'),
    ]),
  ),
  periodicity: Type.Optional(
    Type.Union([Type.Literal('monthly'), Type.Literal('annual')]),
  ),
  status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('inactive')])),
  effective_from: IsoDateOrDateTimeSchema,
  effective_to: Type.Optional(IsoDateOrDateTimeSchema),
  fixed_relief_amount: Type.Optional(Type.Number({ minimum: 0 })),
  gross_relief_rate: Type.Optional(Type.Number({ minimum: 0 })),
  minimum_relief_amount: Type.Optional(Type.Number({ minimum: 0 })),
  pension_relief_enabled: Type.Optional(Type.Boolean()),
  bands: Type.Optional(Type.Array(PayrollTaxBandSchema)),
});
export type UpsertPayrollTaxTable = Static<typeof UpsertPayrollTaxTableSchema>;

/** Recovers against a worker over a series of periods. */
export const UpsertPayrollLoanSchema = Type.Object({
  worker_id: Type.String(),
  component_id: Type.Optional(Type.String()),
  /** Links the loan back to the approved request that created it. */
  request_id: Type.Optional(Type.String()),
  loan_type: Type.Union([Type.Literal('loan'), Type.Literal('salary_advance')]),
  title: Type.String({ maxLength: 180 }),
  principal_amount: Type.Number({ minimum: 0 }),
  issued_date: IsoDateOrDateTimeSchema,
  start_recovery_date: IsoDateOrDateTimeSchema,
  monthly_recovery_amount: Type.Optional(Type.Number({ minimum: 0 })),
  recovery_rate: Type.Optional(Type.Number({ minimum: 0 })),
  status: Type.Optional(
    Type.Union([
      Type.Literal('active'),
      Type.Literal('paused'),
      Type.Literal('closed'),
    ]),
  ),
  notes: Type.Optional(Type.String()),
});
export type UpsertPayrollLoan = Static<typeof UpsertPayrollLoanSchema>;

/* -------------------------------------------------------------------------- */
/* Workers and timesheets                                                     */
/* -------------------------------------------------------------------------- */

/** One component on a worker's pay profile. */
export const PayrollWorkerProfileComponentSchema = Type.Object({
  component_id: Type.Optional(Type.String()),
  amount: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  rate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  formula: Type.Optional(Type.String()),
  is_enabled: Type.Optional(Type.Boolean()),
});
export type PayrollWorkerProfileComponent = Static<
  typeof PayrollWorkerProfileComponentSchema
>;

/**
 * The legacy DTO types `profile` as `Record<string, unknown>`, but the service
 * reads a fixed set of keys off it. Typed here so those accesses stay checked.
 */
export const PayrollWorkerProfileSchema = Type.Object({
  pay_frequency: Type.Optional(Type.String()),
  payment_mode: Type.Optional(Type.String()),
  base_amount: Type.Optional(Type.Number()),
  effective_from: Type.Optional(Type.String()),
  effective_to: Type.Optional(Type.String()),
  components: Type.Optional(Type.Array(PayrollWorkerProfileComponentSchema)),
});
export type PayrollWorkerProfile = Static<typeof PayrollWorkerProfileSchema>;

/**
 * Worker-level funding split. Unlike `PayrollRunAllocationRow`, the percent is
 * optional here and defaults to 100 when a single row is supplied.
 */
export const PayrollWorkerAllocationSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  allocation_percent: Type.Optional(Type.Number()),
  allocation_amount: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});
export type PayrollWorkerAllocation = Static<typeof PayrollWorkerAllocationSchema>;

export const UpsertPayrollWorkerSchema = Type.Object({
  profile_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  default_fund_id: Type.Optional(Type.String()),
  default_grant_id: Type.Optional(Type.String()),
  tax_table_id: Type.Optional(Type.String()),
  worker_type: PayrollWorkerTypeSchema,
  pay_basis: Type.Optional(PayrollPayBasisSchema),
  allocation_mode: Type.Optional(PayrollAllocationModeSchema),
  hybrid_fixed_percent: Type.Optional(Type.Number({ minimum: 0 })),
  standard_hours_per_day: Type.Optional(Type.Number({ minimum: 0 })),
  full_name: Type.String({ maxLength: 180 }),
  email: Type.Optional(EmailSchema),
  staff_code: Type.Optional(Type.String({ maxLength: 60 })),
  currency: Type.Optional(Type.String({ maxLength: 3 })),
  status: Type.Optional(Type.String({ maxLength: 30 })),
  bank_name: Type.Optional(Type.String()),
  bank_account_name: Type.Optional(Type.String()),
  bank_account_number: Type.Optional(Type.String()),
  tax_identifier: Type.Optional(Type.String()),
  pension_identifier: Type.Optional(Type.String()),
  start_date: Type.Optional(IsoDateOrDateTimeSchema),
  end_date: Type.Optional(IsoDateOrDateTimeSchema),
  notes: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
  profile: Type.Optional(PayrollWorkerProfileSchema),
  allocations: Type.Optional(Type.Array(PayrollWorkerAllocationSchema)),
});
export type UpsertPayrollWorker = Static<typeof UpsertPayrollWorkerSchema>;

export const UpsertProjectTimesheetEntrySchema = Type.Object({
  worker_id: Type.String(),
  component_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  work_date: IsoDateOrDateTimeSchema,
  hours: Type.Number({ minimum: 0 }),
  description: Type.Optional(Type.String()),
  status: Type.Optional(
    Type.Union([
      Type.Literal('draft'),
      Type.Literal('submitted'),
      Type.Literal('approved'),
      Type.Literal('rejected'),
    ]),
  ),
});
export type UpsertProjectTimesheetEntry = Static<
  typeof UpsertProjectTimesheetEntrySchema
>;

/* -------------------------------------------------------------------------- */
/* Bulk import                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The import payload carries five spreadsheet-shaped row collections. The
 * generated schema flattened every row to `additionalProperties: true`; the
 * real row shapes are restored below. Every row field is optional, because a
 * spreadsheet column may legitimately be blank.
 */
export const PayrollImportRunRowSchema = Type.Object({
  run_name: Type.Optional(Type.String()),
  year: Type.Optional(Type.Integer()),
  /** 1-12. */
  month: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
  period_start: Type.Optional(Type.String()),
  period_end: Type.Optional(Type.String()),
  currency: Type.Optional(Type.String()),
  paid_from_account: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type PayrollImportRunRow = Static<typeof PayrollImportRunRowSchema>;

export const PayrollImportWorkerRowSchema = Type.Object({
  worker_ref: Type.Optional(Type.String()),
  profile_id: Type.Optional(Type.String()),
  worker_type: Type.Optional(Type.String()),
  full_name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  staff_code: Type.Optional(Type.String()),
  organization: Type.Optional(Type.String()),
  team: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund: Type.Optional(Type.String()),
  grant: Type.Optional(Type.String()),
  bank_name: Type.Optional(Type.String()),
  bank_account_name: Type.Optional(Type.String()),
  bank_account_number: Type.Optional(Type.String()),
  base_amount: Type.Optional(Type.Number()),
  effective_from: Type.Optional(Type.String()),
});
export type PayrollImportWorkerRow = Static<typeof PayrollImportWorkerRowSchema>;

export const PayrollImportLineRowSchema = Type.Object({
  run_name: Type.Optional(Type.String()),
  worker_ref: Type.Optional(Type.String()),
  component_code: Type.Optional(Type.String()),
  amount: Type.Optional(Type.Number()),
  notes: Type.Optional(Type.String()),
});
export type PayrollImportLineRow = Static<typeof PayrollImportLineRowSchema>;

export const PayrollImportAllocationRowSchema = Type.Object({
  run_name: Type.Optional(Type.String()),
  worker_ref: Type.Optional(Type.String()),
  organization: Type.Optional(Type.String()),
  team: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund: Type.Optional(Type.String()),
  grant: Type.Optional(Type.String()),
  allocation_percent: Type.Optional(Type.Number()),
});
export type PayrollImportAllocationRow = Static<typeof PayrollImportAllocationRowSchema>;

export const PayrollImportPaymentRowSchema = Type.Object({
  run_name: Type.Optional(Type.String()),
  worker_ref: Type.Optional(Type.String()),
  payment_status: Type.Optional(Type.String()),
  payment_reference: Type.Optional(Type.String()),
});
export type PayrollImportPaymentRow = Static<typeof PayrollImportPaymentRowSchema>;

export const PayrollImportSchema = Type.Object({
  update_existing: Type.Optional(Type.Boolean()),
  runs: Type.Optional(Type.Array(PayrollImportRunRowSchema)),
  workers: Type.Optional(Type.Array(PayrollImportWorkerRowSchema)),
  lines: Type.Optional(Type.Array(PayrollImportLineRowSchema)),
  allocations: Type.Optional(Type.Array(PayrollImportAllocationRowSchema)),
  payments: Type.Optional(Type.Array(PayrollImportPaymentRowSchema)),
});
export type PayrollImport = Static<typeof PayrollImportSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const PayrollIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type PayrollIdParams = Static<typeof PayrollIdParamsSchema>;

/** Filters read by the payroll run list service. */
export const PayrollListQuerySchema = Type.Object({
  year: Type.Optional(Type.String()),
  month: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type PayrollListQuery = Static<typeof PayrollListQuerySchema>;
