import { Type, type Static } from '@sinclair/typebox';
import {
  EmailSchema,
  IdSchema,
  IsoDateOrDateTimeSchema,
  LongTextSchema,
  UuidSchema,
} from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Shared line / allocation shapes                                            */
/* -------------------------------------------------------------------------- */

/** Debit/credit pair posted to a chart account. Used by journal and WHT entries. */
const JournalLineSchema = Type.Object({
  chart_account_id: Type.String(),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  debit: Type.Number({ minimum: 0 }),
  credit: Type.Number({ minimum: 0 }),
  description: Type.Optional(Type.String({ maxLength: 255 })),
});

/** Quantity x unit price line on a bill or sales invoice. */
const PricedLineSchema = Type.Object({
  chart_account_id: Type.String(),
  description: Type.String(),
  quantity: Type.Optional(Type.Number()),
  unit_price: Type.Number(),
});

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export const ActionFinanceBudgetRevisionSchema = Type.Object({
  action: Type.Optional(
    Type.Union([
      Type.Literal('approve'),
      Type.Literal('reject'),
      Type.Literal('return'),
    ]),
  ),
  comment: Type.Optional(Type.String()),
});
export type ActionFinanceBudgetRevision = Static<typeof ActionFinanceBudgetRevisionSchema>;

export const PVDeductionLineSchema = Type.Object({
  deduction_type_id: UuidSchema,
  rate: Type.Number(),
  gross_amount: Type.Number(),
  deduction_amount: Type.Number(),
});
export type PVDeductionLine = Static<typeof PVDeductionLineSchema>;

export const ApplyPVDeductionsSchema = Type.Object({
  deductions: Type.Array(PVDeductionLineSchema),
});
export type ApplyPVDeductions = Static<typeof ApplyPVDeductionsSchema>;

export const CopyFinanceBudgetSchema = Type.Object({
  mode: Type.Optional(
    Type.Union([
      Type.Literal('full'),
      Type.Literal('header_only'),
      Type.Literal('header_lines_assumptions'),
    ]),
  ),
  period_shift: Type.Optional(
    Type.Union([
      Type.Literal('same_period'),
      Type.Literal('next_month'),
      Type.Literal('next_quarter'),
      Type.Literal('next_fiscal_year'),
    ]),
  ),
});
export type CopyFinanceBudget = Static<typeof CopyFinanceBudgetSchema>;

export const CreateFinanceAssetDisposalSchema = Type.Object({
  disposal_date: IsoDateOrDateTimeSchema,
  disposal_method: Type.String(),
  proceeds: Type.Optional(Type.Number({ minimum: 0 })),
  approved_by: Type.Optional(Type.String()),
  donor_asset: Type.Optional(Type.Boolean()),
  notes: Type.Optional(Type.String()),
});
export type CreateFinanceAssetDisposal = Static<typeof CreateFinanceAssetDisposalSchema>;

export const CreateFinanceAssetVerificationSchema = Type.Object({
  verified_at: IsoDateOrDateTimeSchema,
  condition: Type.String(),
  location_project: Type.Optional(Type.String()),
  assigned_to_user_id: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type CreateFinanceAssetVerification = Static<typeof CreateFinanceAssetVerificationSchema>;

export const CreateFinanceBillSchema = Type.Object({
  bill_number: Type.Optional(Type.String()),
  contact_id: UuidSchema,
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(UuidSchema),
  grant_id: Type.Optional(UuidSchema),
  bill_date: IsoDateOrDateTimeSchema,
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
  currency: Type.Optional(Type.String()),
  tax_amount: Type.Optional(Type.Number({ minimum: 0 })),
  notes: Type.Optional(Type.String()),
  lines: Type.Array(PricedLineSchema),
});
export type CreateFinanceBill = Static<typeof CreateFinanceBillSchema>;

/**
 * Expense command. Note the camelCase keys — this is the one finance command
 * that kept the original Nest DTO's casing rather than the snake_case used
 * everywhere else in the module.
 */
export const CreateFinanceExpenseSchema = Type.Object({
  contactId: Type.Optional(UuidSchema),
  accountId: Type.String(),
  chartAccountId: Type.Optional(Type.String()),
  organizationId: Type.Optional(Type.String()),
  teamId: Type.Optional(Type.String()),
  fundId: Type.Optional(Type.String()),
  grantId: Type.Optional(Type.String()),
  expenseDate: IsoDateOrDateTimeSchema,
  category: Type.Optional(Type.String({ maxLength: 60 })),
  description: Type.Optional(Type.String()),
  amount: Type.Number(),
  currency: Type.Optional(Type.String()),
  taxAmount: Type.Optional(Type.Number()),
  reference: Type.Optional(Type.String({ maxLength: 120 })),
  receiptFileId: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  status: Type.Optional(
    Type.Union([
      Type.Literal('draft'),
      Type.Literal('submitted'),
      Type.Literal('approved'),
      Type.Literal('paid'),
      Type.Literal('void'),
    ]),
  ),
});
export type CreateFinanceExpense = Static<typeof CreateFinanceExpenseSchema>;

export const CreateFinanceIncomeSchema = Type.Object({
  account_id: UuidSchema,
  amount: Type.Number(),
  currency: Type.Optional(Type.String()),
  received_at: Type.Optional(IsoDateOrDateTimeSchema),
  reference: Type.Optional(Type.String()),
  payer: Type.Optional(Type.String()),
  revenue_account_id: Type.Optional(UuidSchema),
  fund_id: Type.Optional(UuidSchema),
  grant_id: Type.Optional(UuidSchema),
  notes: Type.Optional(Type.String()),
  file_id: Type.Optional(UuidSchema),
  pledge_id: Type.Optional(UuidSchema),
  donor_id: Type.Optional(UuidSchema),
});
export type CreateFinanceIncome = Static<typeof CreateFinanceIncomeSchema>;

export const CreateFinanceReceiptSchema = Type.Object({
  receipt_number: Type.Optional(Type.String()),
  contact_id: Type.Optional(UuidSchema),
  sales_invoice_id: Type.Optional(UuidSchema),
  account_id: UuidSchema,
  /** Must clear 0.01 — a zero-value receipt is not a receipt. */
  amount: Type.Number({ minimum: 0.01 }),
  currency: Type.Optional(Type.String()),
  received_at: Type.Optional(IsoDateOrDateTimeSchema),
  reference: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  /** Splits the receipt across sales invoices for partial settlement. */
  allocations: Type.Optional(
    Type.Array(
      Type.Object({
        sales_invoice_id: UuidSchema,
        amount: Type.Number(),
      }),
    ),
  ),
});
export type CreateFinanceReceipt = Static<typeof CreateFinanceReceiptSchema>;

export const CreateFinanceSalesInvoiceSchema = Type.Object({
  invoice_number: Type.Optional(Type.String()),
  contact_id: UuidSchema,
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(UuidSchema),
  grant_id: Type.Optional(UuidSchema),
  invoice_date: IsoDateOrDateTimeSchema,
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
  currency: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('sent')])),
  tax_amount: Type.Optional(Type.Number({ minimum: 0 })),
  notes: Type.Optional(Type.String()),
  lines: Type.Array(PricedLineSchema),
});
export type CreateFinanceSalesInvoice = Static<typeof CreateFinanceSalesInvoiceSchema>;

export const CreateFinanceVendorPaymentSchema = Type.Object({
  payment_number: Type.Optional(Type.String()),
  contact_id: Type.Optional(UuidSchema),
  bill_id: Type.Optional(UuidSchema),
  account_id: UuidSchema,
  amount: Type.Number({ minimum: 0.01 }),
  currency: Type.Optional(Type.String()),
  paid_at: Type.Optional(IsoDateOrDateTimeSchema),
  reference: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type CreateFinanceVendorPayment = Static<typeof CreateFinanceVendorPaymentSchema>;

export const CreateManualJournalEntrySchema = Type.Object({
  entry_date: IsoDateOrDateTimeSchema,
  memo: Type.Optional(Type.String({ maxLength: 255 })),
  currency: Type.Optional(Type.String()),
  lines: Type.Array(JournalLineSchema),
});
export type CreateManualJournalEntry = Static<typeof CreateManualJournalEntrySchema>;

/**
 * Journal entry raised automatically for a statutory (e.g. PAYE/WHT) deduction.
 * Carries the deduction totals alongside the lines that post them.
 */
export const CreateStatutoryDeductionManualEntrySchema = Type.Object({
  entry_date: IsoDateOrDateTimeSchema,
  memo: Type.Optional(Type.String({ maxLength: 255 })),
  currency: Type.Optional(Type.String()),
  deduction_type_id: Type.String(),
  gross_amount: Type.Number({ minimum: 0 }),
  withheld_amount: Type.Number({ minimum: 0 }),
  lines: Type.Array(JournalLineSchema),
});
export type CreateStatutoryDeductionManualEntry = Static<
  typeof CreateStatutoryDeductionManualEntrySchema
>;

export const CreateTransferSchema = Type.Object({
  from_account_id: UuidSchema,
  to_account_id: UuidSchema,
  amount: Type.Number(),
  currency: Type.Optional(Type.String()),
  reference: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
  fund_id: Type.Optional(UuidSchema),
  grant_id: Type.Optional(UuidSchema),
  transfer_at: Type.Optional(Type.String()),
});
export type CreateTransfer = Static<typeof CreateTransferSchema>;

export const CreateWHTRemittanceSchema = Type.Object({
  deduction_type_id: UuidSchema,
  /** Wide range on purpose: it guards against typos, not business rules. */
  period_year: Type.Number({ minimum: 2000, maximum: 2100 }),
  period_month: Type.Number({ minimum: 1, maximum: 12 }),
  total_amount: Type.Number(),
  paid_from_account_id: UuidSchema,
  remittance_date: IsoDateOrDateTimeSchema,
  reference: Type.Optional(Type.String()),
  receipt_file_id: Type.Optional(UuidSchema),
  notes: Type.Optional(Type.String()),
  /** FinanceRequestDeduction ids attached to this remittance. */
  accrual_ids: Type.Array(UuidSchema),
});
export type CreateWHTRemittance = Static<typeof CreateWHTRemittanceSchema>;

export const DisburseDeductionLineSchema = Type.Object({
  deduction_type_id: UuidSchema,
  rate: Type.Number(),
  gross_amount: Type.Number(),
  amount: Type.Number(),
});
export type DisburseDeductionLine = Static<typeof DisburseDeductionLineSchema>;

export const DisburseRequestSchema = Type.Object({
  note: Type.Optional(Type.String()),
  method: Type.Optional(Type.String()),
  transaction_ref: Type.Optional(Type.String()),
  amount: Type.Optional(Type.Number()),
  evidence_file_id: Type.Optional(UuidSchema),
  evidence_file_ids: Type.Optional(Type.Array(UuidSchema)),
  paid_from_account_id: Type.Optional(UuidSchema),
  disbursed_at: Type.Optional(IsoDateOrDateTimeSchema),
  contact_id: Type.Optional(UuidSchema),
  item_ids: Type.Optional(Type.Array(UuidSchema)),
  deductions: Type.Optional(Type.Array(DisburseDeductionLineSchema)),
});
export type DisburseRequest = Static<typeof DisburseRequestSchema>;

export const RemitStatutoryDeductionAllocationSchema = Type.Object({
  deduction_id: UuidSchema,
  allocated_amount: Type.Number({ minimum: 0.01 }),
});
export type RemitStatutoryDeductionAllocation = Static<
  typeof RemitStatutoryDeductionAllocationSchema
>;

export const RemitStatutoryDeductionsSchema = Type.Object({
  /** FinanceRequestDeduction ids to attach to this remittance. */
  deduction_ids: Type.Array(UuidSchema),
  remitted_at: Type.Optional(IsoDateOrDateTimeSchema),
  /** Payment reference, e.g. `FIRS/WHT/2026/Q1`. */
  reference: Type.String(),
  /** Manual TRM number. Generated as `TRM/<year>/<seq>` when omitted. */
  remittance_number: Type.Optional(Type.String()),
  paid_from_account_id: Type.Optional(UuidSchema),
  remittance_total_amount: Type.Optional(Type.Number({ minimum: 0.01 })),
  payment_voucher_id: Type.Optional(UuidSchema),
  remitted_by: Type.Optional(Type.String()),
  evidence_file_id: Type.Optional(UuidSchema),
  evidence_file_ids: Type.Optional(Type.Array(UuidSchema)),
  notes: Type.Optional(Type.String()),
  /** Explicit per-deduction split, for partial remittances. */
  allocations: Type.Optional(Type.Array(RemitStatutoryDeductionAllocationSchema)),
});
export type RemitStatutoryDeductions = Static<typeof RemitStatutoryDeductionsSchema>;

export const SubmitFinanceBudgetRevisionSchema = Type.Object({
  comment: Type.Optional(Type.String()),
});
export type SubmitFinanceBudgetRevision = Static<typeof SubmitFinanceBudgetRevisionSchema>;

/** Assignment of a remitted amount to one deduction. */
export const UpdateRemittanceAllocationSchema = Type.Object({
  id: Type.Optional(IdSchema),
  allocated_amount: Type.Optional(Type.Number({ minimum: 0.01 })),
});
export type UpdateRemittanceAllocation = Static<typeof UpdateRemittanceAllocationSchema>;

export const UpdatePendingDeductionSchema = Type.Object({
  deduction_type_id: Type.Optional(Type.String()),
  gross_amount: Type.Optional(Type.Number({ minimum: 0 })),
  amount: Type.Optional(Type.Number({ minimum: 0 })),
  rate: Type.Optional(Type.Number({ minimum: 0 })),
  notes: Type.Optional(Type.String({ maxLength: 1000 })),
});
export type UpdatePendingDeduction = Static<typeof UpdatePendingDeductionSchema>;

export const UpdateRemittanceRecordSchema = Type.Object({
  remittance_number: Type.Optional(Type.String({ maxLength: 60 })),
  remittance_ref: Type.Optional(Type.String({ maxLength: 255 })),
  remitted_at: Type.Optional(Type.String()),
  remittance_total_amount: Type.Optional(Type.Number({ minimum: 0.01 })),
  paid_from_account_id: Type.Optional(Type.String()),
  payment_voucher_id: Type.Optional(Type.String()),
  remitted_by: Type.Optional(Type.String()),
  evidence_file_id: Type.Optional(Type.String()),
  evidence_file_ids: Type.Optional(Type.Array(UuidSchema)),
  notes: Type.Optional(Type.String({ maxLength: 1000 })),
  allocations: Type.Optional(Type.Array(UpdateRemittanceAllocationSchema)),
});
export type UpdateRemittanceRecord = Static<typeof UpdateRemittanceRecordSchema>;

export const AddRemittanceAllocationsSchema = Type.Object({
  deduction_ids: Type.Array(UuidSchema),
  allocations: Type.Optional(Type.Array(UpdateRemittanceAllocationSchema)),
});
export type AddRemittanceAllocations = Static<typeof AddRemittanceAllocationsSchema>;

/** Signatory shown next to the approval controls on the settings form. */
const SignatorySchema = Type.Object({
  name: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  signature_file_id: Type.Optional(UuidSchema),
});

export const UpdateFinanceSettingsSchema = Type.Object({
  prepared_by: Type.Optional(SignatorySchema),
  reviewed_by: Type.Optional(SignatorySchema),
  approved_by: Type.Optional(SignatorySchema),
  /** Free-form document settings, e.g. `{ request_footer: '...' }`. */
  meta: Type.Optional(MetadataSchema),
});
export type UpdateFinanceSettings = Static<typeof UpdateFinanceSettingsSchema>;

export const UpdateJournalEntrySchema = Type.Object({
  lines: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Optional(Type.String()),
        chart_account_id: Type.Optional(Type.String()),
        debit: Type.Optional(Type.Number()),
        credit: Type.Optional(Type.Number()),
        description: Type.Optional(Type.String()),
      }),
    ),
  ),
});
export type UpdateJournalEntry = Static<typeof UpdateJournalEntrySchema>;

export const UpdatePaymentVoucherSchema = Type.Object({
  note: Type.Optional(Type.String()),
  correction_reason: Type.Optional(Type.String()),
  method: Type.Optional(Type.String()),
  transaction_ref: Type.Optional(Type.String()),
  evidence_file_id: Type.Optional(UuidSchema),
  evidence_file_ids: Type.Optional(Type.Array(UuidSchema)),
  amount: Type.Optional(Type.Number({ minimum: 0.01 })),
  paid_from_account_id: Type.Optional(UuidSchema),
  disbursed_at: Type.Optional(IsoDateOrDateTimeSchema),
  contact_id: Type.Optional(UuidSchema),
});
export type UpdatePaymentVoucher = Static<typeof UpdatePaymentVoucherSchema>;

export const UpsertContactPersonSchema = Type.Object({
  salutation: Type.Optional(Type.String()),
  first_name: Type.Optional(Type.String()),
  last_name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  mobile: Type.Optional(Type.String()),
  designation: Type.Optional(Type.String()),
  department: Type.Optional(Type.String()),
  is_primary: Type.Optional(Type.Boolean()),
});
export type UpsertContactPerson = Static<typeof UpsertContactPersonSchema>;

export const UpsertContactSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  contact_type: Type.Union([
    Type.Literal('customer'),
    Type.Literal('vendor'),
    Type.Literal('both'),
  ]),
  sub_type: Type.Optional(Type.Union([Type.Literal('individual'), Type.Literal('business')])),
  name: Type.String(),
  company_name: Type.Optional(Type.String()),
  legal_name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  billing_address: Type.Optional(MetadataSchema),
  shipping_address: Type.Optional(MetadataSchema),
  tax_number: Type.Optional(Type.String()),
  is_taxable: Type.Optional(Type.Boolean()),
  is_active: Type.Optional(Type.Boolean()),
  /** Payment terms in days. */
  payment_terms: Type.Optional(Type.Integer()),
  credit_limit: Type.Optional(Type.Number()),
  opening_balance: Type.Optional(Type.Number()),
  website: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
  contact_persons: Type.Optional(Type.Array(UpsertContactPersonSchema)),
});
export type UpsertContact = Static<typeof UpsertContactSchema>;

export const UpsertDeductionTypeSchema = Type.Object({
  name: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  /** Rate as a fraction, so 0.1 means 10%. */
  rate: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  applies_to: Type.Optional(Type.String()),
  gl_account_id: Type.Optional(UuidSchema),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpsertDeductionType = Static<typeof UpsertDeductionTypeSchema>;

export const UpsertFinanceAccountSchema = Type.Object({
  name: Type.String(),
  code: Type.Optional(Type.String()),
  bank_name: Type.Optional(Type.String()),
  account_name: Type.Optional(Type.String()),
  account_number: Type.Optional(Type.String()),
  branch_name: Type.Optional(Type.String()),
  account_type: Type.Optional(
    Type.Union([
      Type.Literal('bank'),
      Type.Literal('cash'),
      Type.Literal('wallet'),
      Type.Literal('other'),
    ]),
  ),
  currency: Type.Optional(Type.String()),
  opening_balance: Type.Optional(Type.Number()),
  is_active: Type.Optional(Type.Boolean()),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertFinanceAccount = Static<typeof UpsertFinanceAccountSchema>;

export const UpsertFinanceAssetSchema = Type.Object({
  asset_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  asset_description: Type.String(),
  category: Type.String(),
  serial_tag_no: Type.Optional(Type.String()),
  location_project: Type.Optional(Type.String()),
  assigned_to_user_id: Type.Optional(Type.String()),
  purchase_date: IsoDateOrDateTimeSchema,
  supplier: Type.Optional(Type.String()),
  /** Capitalization threshold, not a business preference. */
  purchase_cost: Type.Number({ minimum: 50000 }),
  useful_life_years: Type.Number({ minimum: 2 }),
  salvage_value: Type.Optional(Type.Number({ minimum: 0 })),
  condition: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type UpsertFinanceAsset = Static<typeof UpsertFinanceAssetSchema>;

export const UpsertFinanceBudgetSchema = Type.Object({
  name: Type.String(),
  scope_type: Type.Optional(Type.String()),
  budget_type: Type.Optional(Type.String()),
  period_type: Type.Optional(Type.String()),
  fiscal_year: Type.Optional(Type.Number()),
  quarter: Type.Optional(Type.Number({ minimum: 1, maximum: 4 })),
  month: Type.Optional(Type.Number({ minimum: 1, maximum: 12 })),
  currency: Type.Optional(Type.String()),
  exchange_rate: Type.Optional(Type.Number()),
  start_date: Type.Optional(IsoDateOrDateTimeSchema),
  end_date: Type.Optional(IsoDateOrDateTimeSchema),
  status: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  parent_budget_id: Type.Optional(UuidSchema),
  fund_id: Type.Optional(UuidSchema),
  grant_id: Type.Optional(UuidSchema),
  notes: Type.Optional(Type.String()),
  justification: Type.Optional(Type.String()),
  submission_note: Type.Optional(Type.String()),
  supporting_file_ids: Type.Optional(Type.Array(UuidSchema)),
  assumptions: Type.Optional(
    Type.Array(
      Type.Object({
        section: Type.Optional(Type.String()),
        label: Type.String(),
        value: Type.String(),
        notes: Type.Optional(Type.String()),
        sort_order: Type.Optional(Type.Number()),
      }),
    ),
  ),
  portfolio: Type.Optional(
    Type.Array(
      Type.Object({
        section: Type.Optional(Type.String()),
        group_name: Type.Optional(Type.String()),
        line_name: Type.Optional(Type.String()),
        line_label: Type.Optional(Type.String()),
        chart_account_id: Type.Optional(UuidSchema),
        project_id: Type.Optional(Type.String()),
        fund_id: Type.Optional(UuidSchema),
        grant_id: Type.Optional(UuidSchema),
        funder_name: Type.Optional(Type.String()),
        status: Type.Optional(Type.String()),
        amount: Type.Optional(Type.Number()),
        period_total: Type.Optional(Type.Number()),
        total_budget: Type.Optional(Type.Number()),
        notes: Type.Optional(Type.String()),
        sort_order: Type.Optional(Type.Number()),
      }),
    ),
  ),
  lines: Type.Array(
    Type.Object({
      section: Type.Optional(Type.String()),
      group_name: Type.Optional(Type.String()),
      line_name: Type.Optional(Type.String()),
      line_label: Type.Optional(Type.String()),
      chart_account_id: Type.Optional(UuidSchema),
      project_id: Type.Optional(Type.String()),
      fund_id: Type.Optional(UuidSchema),
      grant_id: Type.Optional(UuidSchema),
      amount: Type.Optional(Type.Number()),
      notes: Type.Optional(Type.String()),
      sort_order: Type.Optional(Type.Number()),
    }),
  ),
});
export type UpsertFinanceBudget = Static<typeof UpsertFinanceBudgetSchema>;

export const UpsertFinanceChartAccountSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  finance_account_id: Type.Optional(UuidSchema),
  code: Type.String(),
  name: Type.String(),
  type: Type.Union([
    Type.Literal('asset'),
    Type.Literal('liability'),
    Type.Literal('equity'),
    Type.Literal('income'),
    Type.Literal('expense'),
  ]),
  category: Type.String(),
  normal_balance: Type.Union([Type.Literal('debit'), Type.Literal('credit')]),
  is_control_account: Type.Optional(Type.Boolean()),
  is_active: Type.Optional(Type.Boolean()),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertFinanceChartAccount = Static<typeof UpsertFinanceChartAccountSchema>;

export const UpsertFinanceCustomerSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  name: Type.String(),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  tax_number: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertFinanceCustomer = Static<typeof UpsertFinanceCustomerSchema>;

export const UpsertFinanceDonorSchema = Type.Object({
  name: Type.String(),
  donor_type: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpsertFinanceDonor = Static<typeof UpsertFinanceDonorSchema>;

export const UpsertFinanceFundSchema = Type.Object({
  code: Type.String(),
  name: Type.String(),
  fund_type: Type.Optional(Type.String()),
  restriction_type: Type.Optional(Type.String()),
  purpose: Type.Optional(Type.String()),
  donor_id: Type.Optional(UuidSchema),
  project_id: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpsertFinanceFund = Static<typeof UpsertFinanceFundSchema>;

export const UpsertFinanceGrantSchema = Type.Object({
  code: Type.String(),
  name: Type.String(),
  restriction_type: Type.Optional(Type.String()),
  donor_id: Type.Optional(UuidSchema),
  fund_id: Type.Optional(UuidSchema),
  project_id: Type.Optional(Type.String()),
  start_date: Type.Optional(IsoDateOrDateTimeSchema),
  end_date: Type.Optional(IsoDateOrDateTimeSchema),
  committed_amount: Type.Optional(Type.Number({ minimum: 0 })),
  recognized_amount: Type.Optional(Type.Number({ minimum: 0 })),
  deferred_amount: Type.Optional(Type.Number({ minimum: 0 })),
  status: Type.Optional(Type.String()),
  purpose: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type UpsertFinanceGrant = Static<typeof UpsertFinanceGrantSchema>;

/** Catalogued purchasable item. camelCase keys mirror the legacy DTO. */
export const UpsertFinanceItemSchema = Type.Object({
  name: Type.String({ maxLength: 255 }),
  code: Type.Optional(Type.String({ maxLength: 60 })),
  description: Type.Optional(Type.String()),
  itemType: Type.Optional(
    Type.Union([
      Type.Literal('service'),
      Type.Literal('product'),
      Type.Literal('other'),
    ]),
  ),
  unit: Type.Optional(Type.String({ maxLength: 30 })),
  unitPrice: Type.Optional(Type.Number()),
  costPrice: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String()),
  chartAccountId: Type.Optional(Type.String()),
  isActive: Type.Optional(Type.Boolean()),
});
export type UpsertFinanceItem = Static<typeof UpsertFinanceItemSchema>;

export const UpsertFinancePledgeSchema = Type.Object({
  donor_id: UuidSchema,
  grant_id: Type.Optional(UuidSchema),
  fund_id: Type.Optional(UuidSchema),
  amount: Type.Number({ minimum: 0.01 }),
  currency: Type.Optional(Type.String()),
  pledged_at: IsoDateOrDateTimeSchema,
  expected_at: Type.Optional(IsoDateOrDateTimeSchema),
  status: Type.Optional(Type.String()),
  purpose: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
});
export type UpsertFinancePledge = Static<typeof UpsertFinancePledgeSchema>;

export const UpsertFinanceReportNoteSchema = Type.Object({
  period_id: UuidSchema,
  report_key: Type.String(),
  kind: Type.Optional(Type.Union([Type.Literal('generated'), Type.Literal('manual')])),
  severity: Type.Optional(
    Type.Union([
      Type.Literal('info'),
      Type.Literal('warning'),
      Type.Literal('critical'),
    ]),
  ),
  title: Type.String(),
  body: LongTextSchema,
  source_rule: Type.Optional(Type.String()),
  is_overridden: Type.Optional(Type.Boolean()),
});
export type UpsertFinanceReportNote = Static<typeof UpsertFinanceReportNoteSchema>;

export const UpsertFinanceReportingPeriodSchema = Type.Object({
  year: Type.Integer(),
  month: Type.Integer({ minimum: 1, maximum: 12 }),
  label: Type.Optional(Type.String()),
  start_date: IsoDateOrDateTimeSchema,
  end_date: IsoDateOrDateTimeSchema,
  status: Type.Optional(Type.Union([Type.Literal('open'), Type.Literal('closed')])),
  notes: Type.Optional(Type.String()),
});
export type UpsertFinanceReportingPeriod = Static<typeof UpsertFinanceReportingPeriodSchema>;

export const UpsertFinanceVendorSchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  name: Type.String(),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  tax_number: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertFinanceVendor = Static<typeof UpsertFinanceVendorSchema>;

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

export const StatutoryDeductionsQuerySchema = Type.Object({
  id: Type.Optional(UuidSchema),
  status: Type.Optional(
    Type.Union([
      Type.Literal('pending'),
      Type.Literal('partially_remitted'),
      Type.Literal('remitted'),
    ]),
  ),
  deduction_type_id: Type.Optional(UuidSchema),
  date_from: Type.Optional(IsoDateOrDateTimeSchema),
  date_to: Type.Optional(IsoDateOrDateTimeSchema),
  search: Type.Optional(Type.String()),
  request_id: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  /** Deductions remitted together under the same payment reference. */
  remittance_ref: Type.Optional(Type.String()),
  remittance_number: Type.Optional(Type.String()),
  payment_voucher_id: Type.Optional(UuidSchema),
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
});
export type StatutoryDeductionsQuery = Static<typeof StatutoryDeductionsQuerySchema>;

export const RequestRemittancesQuerySchema = Type.Object({
  id: Type.Optional(UuidSchema),
  remittance_number: Type.Optional(Type.String()),
  reference: Type.Optional(Type.String()),
  payment_voucher_id: Type.Optional(UuidSchema),
  search: Type.Optional(Type.String()),
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
});
export type RequestRemittancesQuery = Static<typeof RequestRemittancesQuerySchema>;
