import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

export const financeSetting = pgTable("sta_finance_settings", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  config: jsonb("config"),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type FinanceSetting = typeof financeSetting.$inferSelect;
export type NewFinanceSetting = typeof financeSetting.$inferInsert;

export const financeAccount = pgTable("sta_finance_accounts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 60 }),
  accountType: varchar("account_type", { length: 30 }).default("bank").notNull(),
  bankName: varchar("bank_name", { length: 150 }),
  accountName: varchar("account_name", { length: 150 }),
  accountNumber: varchar("account_number", { length: 50 }),
  branchName: varchar("branch_name", { length: 120 }),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_account_name_per_org").on(table.organizationId, table.name),
    index("financeAccount_index_tenantId").on(table.tenantId),
    index("financeAccount_index_organizationId").on(table.organizationId),
    index("financeAccount_index_accountType").on(table.accountType),
    index("financeAccount_index_isActive").on(table.isActive),
]);

export type FinanceAccount = typeof financeAccount.$inferSelect;
export type NewFinanceAccount = typeof financeAccount.$inferInsert;

export const financeDonor = pgTable("sta_finance_donors", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 150 }).notNull(),
  donorType: varchar("donor_type", { length: 40 }).default("grantor").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeDonor_index_organizationId").on(table.organizationId),
    index("financeDonor_index_isActive").on(table.isActive),
]);

export type FinanceDonor = typeof financeDonor.$inferSelect;
export type NewFinanceDonor = typeof financeDonor.$inferInsert;

export const financeFund = pgTable("sta_finance_funds", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  donorId: uuid("donor_id"),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  fundType: varchar("fund_type", { length: 40 }).default("operating").notNull(),
  restrictionType: varchar("restriction_type", { length: 40 }).default("unrestricted").notNull(),
  purpose: text("purpose"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_fund_code_per_org").on(table.organizationId, table.code),
    index("financeFund_index_tenantId").on(table.tenantId),
    index("financeFund_index_organizationId").on(table.organizationId),
    index("financeFund_index_projectId").on(table.projectId),
    index("financeFund_index_restrictionType").on(table.restrictionType),
    index("financeFund_index_isActive").on(table.isActive),
]);

export type FinanceFund = typeof financeFund.$inferSelect;
export type NewFinanceFund = typeof financeFund.$inferInsert;

export const financeGrant = pgTable("sta_finance_grants", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  donorId: uuid("donor_id"),
  fundId: uuid("fund_id"),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  restrictionType: varchar("restriction_type", { length: 40 }).default("restricted").notNull(),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  committedAmount: numeric("committed_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  recognizedAmount: numeric("recognized_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  deferredAmount: numeric("deferred_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  purpose: text("purpose"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_grant_code_per_org").on(table.organizationId, table.code),
    index("financeGrant_index_organizationId").on(table.organizationId),
    index("financeGrant_index_projectId").on(table.projectId),
    index("financeGrant_index_donorId").on(table.donorId),
    index("financeGrant_index_fundId").on(table.fundId),
    index("financeGrant_index_status").on(table.status),
]);

export type FinanceGrant = typeof financeGrant.$inferSelect;
export type NewFinanceGrant = typeof financeGrant.$inferInsert;

export const financePledge = pgTable("sta_finance_pledges", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  pledgeNumber: varchar("pledge_number", { length: 60 }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  donorId: uuid("donor_id").notNull(),
  grantId: uuid("grant_id"),
  fundId: uuid("fund_id"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  receivedAmount: numeric("received_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  pledgedAt: timestamp("pledged_at", { mode: 'date', precision: 6 }).notNull(),
  expectedAt: timestamp("expected_at", { mode: 'date', precision: 6 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  purpose: text("purpose"),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_pledge_number_per_org").on(table.organizationId, table.pledgeNumber),
    index("financePledge_index_donorId").on(table.donorId),
    index("financePledge_index_grantId").on(table.grantId),
    index("financePledge_index_status").on(table.status),
]);

export type FinancePledge = typeof financePledge.$inferSelect;
export type NewFinancePledge = typeof financePledge.$inferInsert;

export const financeChartAccount = pgTable("sta_finance_chart_accounts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  financeAccountId: uuid("finance_account_id").unique(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  normalBalance: varchar("normal_balance", { length: 10 }).notNull(),
  isControlAccount: boolean("is_control_account").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_chart_account_code_per_org").on(table.organizationId, table.code),
    index("financeChartAccount_index_type").on(table.type),
    index("financeChartAccount_index_category").on(table.category),
    index("financeChartAccount_index_isActive").on(table.isActive),
]);

export type FinanceChartAccount = typeof financeChartAccount.$inferSelect;
export type NewFinanceChartAccount = typeof financeChartAccount.$inferInsert;

export const financeReportingPeriod = pgTable("sta_finance_reporting_periods", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  quarter: integer("quarter").notNull(),
  label: varchar("label", { length: 40 }).notNull(),
  startDate: date("start_date", { mode: 'date' }).notNull(),
  endDate: date("end_date", { mode: 'date' }).notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_reporting_period").on(table.tenantId, table.year, table.month),
    index("financeReportingPeriod_index_tenantId").on(table.tenantId),
    index("financeReportingPeriod_index_quarter").on(table.quarter),
    index("financeReportingPeriod_index_status").on(table.status),
]);

export type FinanceReportingPeriod = typeof financeReportingPeriod.$inferSelect;
export type NewFinanceReportingPeriod = typeof financeReportingPeriod.$inferInsert;

export const financeJournalEntry = pgTable("sta_finance_journal_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  entryNo: varchar("entry_no", { length: 60 }).notNull(),
  entryDate: timestamp("entry_date", { mode: 'date', precision: 6 }).notNull(),
  periodId: uuid("period_id").notNull(),
  sourceType: varchar("source_type", { length: 60 }),
  sourceId: varchar("source_id", { length: 120 }),
  memo: varchar("memo", { length: 255 }),
  status: varchar("status", { length: 20 }).default("posted").notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  totalDebit: numeric("total_debit", { precision: 15, scale: 2 }).default("0").notNull(),
  totalCredit: numeric("total_credit", { precision: 15, scale: 2 }).default("0").notNull(),
  postedBy: bigint("posted_by", { mode: 'bigint' }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_journal_entry_no_per_tenant").on(table.tenantId, table.entryNo),
    index("financeJournalEntry_index_tenantId").on(table.tenantId),
    index("financeJournalEntry_index_periodId").on(table.periodId),
    index("financeJournalEntry_index_entryDate").on(table.entryDate),
    index("financeJournalEntry_index_sourceType_sourceId").on(table.sourceType, table.sourceId),
]);

export type FinanceJournalEntry = typeof financeJournalEntry.$inferSelect;
export type NewFinanceJournalEntry = typeof financeJournalEntry.$inferInsert;

export const financeJournalSequence = pgTable("sta_finance_journal_sequences", {
  id: varchar("id", { length: 32 }).primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  prefix: varchar("prefix", { length: 10 }).notNull(),
  sequenceYear: integer("sequence_year").notNull(),
  lastNumber: integer("last_number").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_journal_sequence_prefix_year").on(table.tenantId, table.prefix, table.sequenceYear),
    index("financeJournalSequence_index_tenantId").on(table.tenantId),
]);

export type FinanceJournalSequence = typeof financeJournalSequence.$inferSelect;
export type NewFinanceJournalSequence = typeof financeJournalSequence.$inferInsert;

export const financeJournalLine = pgTable("sta_finance_journal_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  journalEntryId: uuid("journal_entry_id").notNull(),
  chartAccountId: uuid("chart_account_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  description: varchar("description", { length: 255 }),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0").notNull(),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeJournalLine_index_tenantId").on(table.tenantId),
    index("financeJournalLine_index_journalEntryId").on(table.journalEntryId),
    index("financeJournalLine_index_chartAccountId").on(table.chartAccountId),
    index("financeJournalLine_index_organizationId").on(table.organizationId),
    index("financeJournalLine_index_teamId").on(table.teamId),
    index("financeJournalLine_index_fundId").on(table.fundId),
    index("financeJournalLine_index_grantId").on(table.grantId),
]);

export type FinanceJournalLine = typeof financeJournalLine.$inferSelect;
export type NewFinanceJournalLine = typeof financeJournalLine.$inferInsert;

export const financeLedgerEntry = pgTable("sta_finance_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  accountId: uuid("account_id").notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  entryDate: timestamp("entry_date", { mode: 'date', precision: 6 }).notNull(),
  description: varchar("description", { length: 255 }),
  sourceType: varchar("source_type", { length: 60 }),
  sourceId: varchar("source_id", { length: 120 }),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeLedgerEntry_index_tenantId").on(table.tenantId),
    index("financeLedgerEntry_index_accountId").on(table.accountId),
    index("financeLedgerEntry_index_entryDate").on(table.entryDate),
    index("financeLedgerEntry_index_sourceType_sourceId").on(table.sourceType, table.sourceId),
    index("financeLedgerEntry_index_direction").on(table.direction),
]);

export type FinanceLedgerEntry = typeof financeLedgerEntry.$inferSelect;
export type NewFinanceLedgerEntry = typeof financeLedgerEntry.$inferInsert;

export const financeIncomeEntry = pgTable("sta_finance_income_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  accountId: uuid("account_id").notNull(),
  revenueAccountId: uuid("revenue_account_id"),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  pledgeId: uuid("pledge_id"),
  receiptNumber: varchar("receipt_number", { length: 60 }).unique(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  receivedAt: timestamp("received_at", { mode: 'date', precision: 6 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  payer: varchar("payer", { length: 150 }),
  categoryId: uuid("category_id"),
  notes: text("notes"),
  fileId: uuid("file_id"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeIncomeEntry_index_accountId").on(table.accountId),
    index("financeIncomeEntry_index_receivedAt").on(table.receivedAt),
    index("financeIncomeEntry_index_categoryId").on(table.categoryId),
    index("financeIncomeEntry_index_revenueAccountId").on(table.revenueAccountId),
    index("financeIncomeEntry_index_fundId").on(table.fundId),
    index("financeIncomeEntry_index_grantId").on(table.grantId),
    index("financeIncomeEntry_index_pledgeId").on(table.pledgeId),
]);

export type FinanceIncomeEntry = typeof financeIncomeEntry.$inferSelect;
export type NewFinanceIncomeEntry = typeof financeIncomeEntry.$inferInsert;

export const financeAsset = pgTable("sta_finance_assets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  assetId: varchar("asset_id", { length: 50 }).notNull().unique(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  assetDescription: varchar("asset_description", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  serialTagNo: varchar("serial_tag_no", { length: 120 }),
  locationProject: varchar("location_project", { length: 150 }),
  assignedToUserId: bigint("assigned_to_user_id", { mode: 'bigint' }),
  purchaseDate: date("purchase_date", { mode: 'date' }).notNull(),
  supplier: varchar("supplier", { length: 150 }),
  purchaseCost: numeric("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  usefulLifeYears: integer("useful_life_years").notNull(),
  salvageValue: numeric("salvage_value", { precision: 15, scale: 2 }).default("0").notNull(),
  condition: varchar("condition", { length: 40 }).default("good").notNull(),
  status: varchar("status", { length: 40 }).default("active").notNull(),
  lastVerifiedDate: date("last_verified_date", { mode: 'date' }),
  lastVerifiedBy: bigint("last_verified_by", { mode: 'bigint' }),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeAsset_index_organizationId").on(table.organizationId),
    index("financeAsset_index_teamId").on(table.teamId),
    index("financeAsset_index_assignedToUserId").on(table.assignedToUserId),
    index("financeAsset_index_category").on(table.category),
    index("financeAsset_index_status").on(table.status),
    index("financeAsset_index_purchaseDate").on(table.purchaseDate),
]);

export type FinanceAsset = typeof financeAsset.$inferSelect;
export type NewFinanceAsset = typeof financeAsset.$inferInsert;

export const financeAssetVerification = pgTable("sta_finance_asset_verifications", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  assetRecordId: uuid("asset_record_id").notNull(),
  verifiedAt: date("verified_at", { mode: 'date' }).notNull(),
  condition: varchar("condition", { length: 40 }).notNull(),
  locationProject: varchar("location_project", { length: 150 }),
  assignedToUserId: bigint("assigned_to_user_id", { mode: 'bigint' }),
  verifiedBy: bigint("verified_by", { mode: 'bigint' }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeAssetVerification_index_assetRecordId").on(table.assetRecordId),
    index("financeAssetVerification_index_verifiedAt").on(table.verifiedAt),
]);

export type FinanceAssetVerification = typeof financeAssetVerification.$inferSelect;
export type NewFinanceAssetVerification = typeof financeAssetVerification.$inferInsert;

export const financeAssetDisposal = pgTable("sta_finance_asset_disposals", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  assetRecordId: uuid("asset_record_id").notNull().unique(),
  disposalDate: date("disposal_date", { mode: 'date' }).notNull(),
  disposalMethod: varchar("disposal_method", { length: 100 }).notNull(),
  proceeds: numeric("proceeds", { precision: 15, scale: 2 }).default("0").notNull(),
  bookValueAtDisposal: numeric("book_value_at_disposal", { precision: 15, scale: 2 }).default("0").notNull(),
  gainLoss: numeric("gain_loss", { precision: 15, scale: 2 }).default("0").notNull(),
  approvedBy: bigint("approved_by", { mode: 'bigint' }),
  donorAsset: boolean("donor_asset").default(false).notNull(),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeAssetDisposal_index_disposalDate").on(table.disposalDate),
]);

export type FinanceAssetDisposal = typeof financeAssetDisposal.$inferSelect;
export type NewFinanceAssetDisposal = typeof financeAssetDisposal.$inferInsert;

export const financeContact = pgTable("sta_finance_contacts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  contactType: varchar("contact_type", { length: 20 }).default("customer").notNull(),
  subType: varchar("sub_type", { length: 20 }).default("business").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  companyName: varchar("company_name", { length: 150 }),
  legalName: varchar("legal_name", { length: 150 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  billingAddress: jsonb("billing_address"),
  shippingAddress: jsonb("shipping_address"),
  taxNumber: varchar("tax_number", { length: 80 }),
  isTaxable: boolean("is_taxable").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  paymentTerms: integer("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }),
  website: varchar("website", { length: 255 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  primaryContactId: uuid("primary_contact_id").unique(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_finance_contact_name_per_org").on(table.organizationId, table.name),
    index("financeContact_index_contactType").on(table.contactType),
    index("financeContact_index_isActive").on(table.isActive),
]);

export type FinanceContact = typeof financeContact.$inferSelect;
export type NewFinanceContact = typeof financeContact.$inferInsert;

export const financeContactPerson = pgTable("sta_finance_contact_persons", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  contactId: uuid("contact_id").notNull(),
  salutation: varchar("salutation", { length: 10 }),
  firstName: varchar("first_name", { length: 80 }),
  lastName: varchar("last_name", { length: 80 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  mobile: varchar("mobile", { length: 40 }),
  designation: varchar("designation", { length: 80 }),
  department: varchar("department", { length: 80 }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeContactPerson_index_contactId").on(table.contactId),
]);

export type FinanceContactPerson = typeof financeContactPerson.$inferSelect;
export type NewFinanceContactPerson = typeof financeContactPerson.$inferInsert;

export const financeSalesInvoice = pgTable("sta_finance_sales_invoices", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  invoiceNumber: varchar("invoice_number", { length: 60 }).notNull().unique(),
  contactId: uuid("contact_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  invoiceDate: date("invoice_date", { mode: 'date' }).notNull(),
  dueDate: date("due_date", { mode: 'date' }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  sentAt: timestamp("sent_at", { mode: 'date', precision: 6 }),
  voidedAt: timestamp("voided_at", { mode: 'date', precision: 6 }),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeSalesInvoice_index_contactId").on(table.contactId),
    index("financeSalesInvoice_index_organizationId").on(table.organizationId),
    index("financeSalesInvoice_index_teamId").on(table.teamId),
    index("financeSalesInvoice_index_fundId").on(table.fundId),
    index("financeSalesInvoice_index_grantId").on(table.grantId),
    index("financeSalesInvoice_index_status").on(table.status),
    index("financeSalesInvoice_index_invoiceDate").on(table.invoiceDate),
    index("financeSalesInvoice_index_dueDate").on(table.dueDate),
]);

export type FinanceSalesInvoice = typeof financeSalesInvoice.$inferSelect;
export type NewFinanceSalesInvoice = typeof financeSalesInvoice.$inferInsert;

export const financeSalesInvoiceLine = pgTable("sta_finance_sales_invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  invoiceId: uuid("invoice_id").notNull(),
  chartAccountId: uuid("chart_account_id").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeSalesInvoiceLine_index_invoiceId").on(table.invoiceId),
    index("financeSalesInvoiceLine_index_chartAccountId").on(table.chartAccountId),
]);

export type FinanceSalesInvoiceLine = typeof financeSalesInvoiceLine.$inferSelect;
export type NewFinanceSalesInvoiceLine = typeof financeSalesInvoiceLine.$inferInsert;

export const financeReceipt = pgTable("sta_finance_receipts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  receiptNumber: varchar("receipt_number", { length: 60 }).notNull().unique(),
  contactId: uuid("contact_id"),
  salesInvoiceId: uuid("sales_invoice_id"),
  accountId: uuid("account_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  receivedAt: timestamp("received_at", { mode: 'date', precision: 6 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeReceipt_index_contactId").on(table.contactId),
    index("financeReceipt_index_accountId").on(table.accountId),
    index("financeReceipt_index_receivedAt").on(table.receivedAt),
]);

export type FinanceReceipt = typeof financeReceipt.$inferSelect;
export type NewFinanceReceipt = typeof financeReceipt.$inferInsert;

export const financeReceiptAllocation = pgTable("sta_finance_receipt_allocations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  receiptId: uuid("receipt_id").notNull(),
  salesInvoiceId: uuid("sales_invoice_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_receipt_invoice_allocation").on(table.receiptId, table.salesInvoiceId),
    index("financeReceiptAllocation_index_receiptId").on(table.receiptId),
    index("financeReceiptAllocation_index_salesInvoiceId").on(table.salesInvoiceId),
]);

export type FinanceReceiptAllocation = typeof financeReceiptAllocation.$inferSelect;
export type NewFinanceReceiptAllocation = typeof financeReceiptAllocation.$inferInsert;

export const financeBillHeader = pgTable("sta_finance_bill_headers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  billNumber: varchar("bill_number", { length: 60 }).notNull().unique(),
  contactId: uuid("contact_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  billDate: date("bill_date", { mode: 'date' }).notNull(),
  dueDate: date("due_date", { mode: 'date' }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBillHeader_index_contactId").on(table.contactId),
    index("financeBillHeader_index_organizationId").on(table.organizationId),
    index("financeBillHeader_index_teamId").on(table.teamId),
    index("financeBillHeader_index_fundId").on(table.fundId),
    index("financeBillHeader_index_grantId").on(table.grantId),
    index("financeBillHeader_index_status").on(table.status),
    index("financeBillHeader_index_billDate").on(table.billDate),
    index("financeBillHeader_index_dueDate").on(table.dueDate),
]);

export type FinanceBillHeader = typeof financeBillHeader.$inferSelect;
export type NewFinanceBillHeader = typeof financeBillHeader.$inferInsert;

export const financeBillLine = pgTable("sta_finance_bill_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  billId: uuid("bill_id").notNull(),
  chartAccountId: uuid("chart_account_id").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBillLine_index_billId").on(table.billId),
    index("financeBillLine_index_chartAccountId").on(table.chartAccountId),
]);

export type FinanceBillLine = typeof financeBillLine.$inferSelect;
export type NewFinanceBillLine = typeof financeBillLine.$inferInsert;

export const financeVendorPayment = pgTable("sta_finance_vendor_payments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  paymentNumber: varchar("payment_number", { length: 60 }).notNull().unique(),
  contactId: uuid("contact_id"),
  billId: uuid("bill_id"),
  accountId: uuid("account_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  paidAt: timestamp("paid_at", { mode: 'date', precision: 6 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeVendorPayment_index_contactId").on(table.contactId),
    index("financeVendorPayment_index_billId").on(table.billId),
    index("financeVendorPayment_index_accountId").on(table.accountId),
    index("financeVendorPayment_index_paidAt").on(table.paidAt),
]);

export type FinanceVendorPayment = typeof financeVendorPayment.$inferSelect;
export type NewFinanceVendorPayment = typeof financeVendorPayment.$inferInsert;

export const financeReportNote = pgTable("sta_finance_report_notes", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  periodId: uuid("period_id").notNull(),
  reportKey: varchar("report_key", { length: 80 }).notNull(),
  kind: varchar("kind", { length: 20 }).default("generated").notNull(),
  severity: varchar("severity", { length: 20 }).default("info").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  sourceRule: varchar("source_rule", { length: 120 }),
  isOverridden: boolean("is_overridden").default(false).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeReportNote_index_periodId_reportKey").on(table.periodId, table.reportKey),
]);

export type FinanceReportNote = typeof financeReportNote.$inferSelect;
export type NewFinanceReportNote = typeof financeReportNote.$inferInsert;

export const financeBudget = pgTable("sta_finance_budgets", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  parentBudgetId: uuid("parent_budget_id"),
  name: varchar("name", { length: 180 }).notNull(),
  scopeType: varchar("scope_type", { length: 30 }).default("project").notNull(),
  budgetType: varchar("budget_type", { length: 30 }).default("project").notNull(),
  periodType: varchar("period_type", { length: 30 }).default("annual").notNull(),
  fiscalYear: integer("fiscal_year"),
  quarter: integer("quarter"),
  month: integer("month"),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 15, scale: 4 }),
  startDate: date("start_date", { mode: 'date' }).notNull(),
  endDate: date("end_date", { mode: 'date' }).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  totalBudget: numeric("total_budget", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  approvedBy: bigint("approved_by", { mode: 'bigint' }),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
  currentActiveRevisionId: uuid("current_active_revision_id").unique(),
  draftRevisionId: uuid("draft_revision_id").unique(),
  ownerType: varchar("owner_type", { length: 30 }),
  ownerId: bigint("owner_id", { mode: 'bigint' }),
  preparedBy: bigint("prepared_by", { mode: 'bigint' }),
}, (table) => [
    index("financeBudget_index_tenantId").on(table.tenantId),
    index("financeBudget_index_organizationId").on(table.organizationId),
    index("financeBudget_index_teamId").on(table.teamId),
    index("financeBudget_index_projectId").on(table.projectId),
    index("financeBudget_index_fundId").on(table.fundId),
    index("financeBudget_index_grantId").on(table.grantId),
    index("financeBudget_index_parentBudgetId").on(table.parentBudgetId),
    index("financeBudget_index_budgetType_status").on(table.budgetType, table.status),
    index("financeBudget_index_scopeType_periodType").on(table.scopeType, table.periodType),
    index("financeBudget_index_fiscalYear_quarter_month").on(table.fiscalYear, table.quarter, table.month),
    index("financeBudget_index_startDate_endDate").on(table.startDate, table.endDate),
]);

export type FinanceBudget = typeof financeBudget.$inferSelect;
export type NewFinanceBudget = typeof financeBudget.$inferInsert;

export const financeBudgetLine = pgTable("sta_finance_budget_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetId: uuid("budget_id").notNull(),
  chartAccountId: uuid("chart_account_id"),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  section: varchar("section", { length: 20 }).default("expenditure").notNull(),
  groupName: varchar("group_name", { length: 120 }),
  lineLabel: varchar("line_label", { length: 180 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  period1Amount: numeric("period_1_amount", { precision: 15, scale: 2 }),
  period2Amount: numeric("period_2_amount", { precision: 15, scale: 2 }),
  period3Amount: numeric("period_3_amount", { precision: 15, scale: 2 }),
  period4Amount: numeric("period_4_amount", { precision: 15, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  revisedTotalAmount: numeric("revised_total_amount", { precision: 15, scale: 2 }),
  actualTotalAmount: numeric("actual_total_amount", { precision: 15, scale: 2 }),
  varianceAmount: numeric("variance_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBudgetLine_index_budgetId_sortOrder").on(table.budgetId, table.sortOrder),
    index("financeBudgetLine_index_chartAccountId").on(table.chartAccountId),
    index("financeBudgetLine_index_projectId").on(table.projectId),
    index("financeBudgetLine_index_fundId").on(table.fundId),
    index("financeBudgetLine_index_grantId").on(table.grantId),
    index("financeBudgetLine_index_section").on(table.section),
]);

export type FinanceBudgetLine = typeof financeBudgetLine.$inferSelect;
export type NewFinanceBudgetLine = typeof financeBudgetLine.$inferInsert;

export const financeBudgetAssumption = pgTable("sta_finance_budget_assumptions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetId: uuid("budget_id").notNull(),
  section: varchar("section", { length: 60 }),
  label: varchar("label", { length: 120 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBudgetAssumption_index_budgetId_sortOrder").on(table.budgetId, table.sortOrder),
]);

export type FinanceBudgetAssumption = typeof financeBudgetAssumption.$inferSelect;
export type NewFinanceBudgetAssumption = typeof financeBudgetAssumption.$inferInsert;

export const financeBudgetPortfolio = pgTable("sta_finance_budget_portfolio", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetId: uuid("budget_id").notNull(),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull(),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  funderName: varchar("funder_name", { length: 180 }),
  status: varchar("status", { length: 40 }),
  period1Amount: numeric("period_1_amount", { precision: 15, scale: 2 }),
  period2Amount: numeric("period_2_amount", { precision: 15, scale: 2 }),
  period3Amount: numeric("period_3_amount", { precision: 15, scale: 2 }),
  period4Amount: numeric("period_4_amount", { precision: 15, scale: 2 }),
  periodTotal: numeric("period_total", { precision: 15, scale: 2 }),
  totalBudget: numeric("total_budget", { precision: 15, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBudgetPortfolio_index_budgetId_sortOrder").on(table.budgetId, table.sortOrder),
    index("financeBudgetPortfolio_index_projectId").on(table.projectId),
    index("financeBudgetPortfolio_index_fundId").on(table.fundId),
    index("financeBudgetPortfolio_index_grantId").on(table.grantId),
]);

export type FinanceBudgetPortfolio = typeof financeBudgetPortfolio.$inferSelect;
export type NewFinanceBudgetPortfolio = typeof financeBudgetPortfolio.$inferInsert;

export const financeBudgetRevision = pgTable("sta_finance_budget_revisions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetId: uuid("budget_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  submissionNote: text("submission_note"),
  justification: text("justification"),
  materialChangeSummary: text("material_change_summary"),
  copiedFromRevisionId: uuid("copied_from_revision_id"),
  submittedBy: bigint("submitted_by", { mode: 'bigint' }),
  submittedAt: timestamp("submitted_at", { mode: 'date', precision: 6 }),
  approvedBy: bigint("approved_by", { mode: 'bigint' }),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  workflowInstanceId: uuid("workflow_instance_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("uniqueIndex_budgetId_revisionNumber").on(table.budgetId, table.revisionNumber),
    index("financeBudgetRevision_index_budgetId_status").on(table.budgetId, table.status),
]);

export type FinanceBudgetRevision = typeof financeBudgetRevision.$inferSelect;
export type NewFinanceBudgetRevision = typeof financeBudgetRevision.$inferInsert;

export const financeBudgetRevisionLine = pgTable("sta_finance_budget_revision_lines", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetRevisionId: uuid("budget_revision_id").notNull(),
  chartAccountId: uuid("chart_account_id"),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  section: varchar("section", { length: 20 }).default("expenditure").notNull(),
  groupName: varchar("group_name", { length: 120 }),
  lineLabel: varchar("line_label", { length: 180 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  period1Amount: numeric("period_1_amount", { precision: 15, scale: 2 }),
  period2Amount: numeric("period_2_amount", { precision: 15, scale: 2 }),
  period3Amount: numeric("period_3_amount", { precision: 15, scale: 2 }),
  period4Amount: numeric("period_4_amount", { precision: 15, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeBudgetRevisionLine_index_budgetRevisionId_sortOrder").on(table.budgetRevisionId, table.sortOrder),
]);

export type FinanceBudgetRevisionLine = typeof financeBudgetRevisionLine.$inferSelect;
export type NewFinanceBudgetRevisionLine = typeof financeBudgetRevisionLine.$inferInsert;

export const financeBudgetCommitment = pgTable("sta_finance_budget_commitments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  budgetId: uuid("budget_id").notNull(),
  budgetRevisionId: uuid("budget_revision_id").notNull(),
  budgetLineId: uuid("budget_line_id"),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull(),
  requestItemKey: varchar("request_item_key", { length: 100 }),
  status: varchar("status", { length: 30 }).default("reserved").notNull(),
  committedAmount: numeric("committed_amount", { precision: 15, scale: 2 }).notNull(),
  actualizedAmount: numeric("actualized_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_request_budget_line_commitment").on(table.requestId, table.budgetLineId),
    index("financeBudgetCommitment_index_budgetId_status").on(table.budgetId, table.status),
    index("financeBudgetCommitment_index_requestId").on(table.requestId),
]);

export type FinanceBudgetCommitment = typeof financeBudgetCommitment.$inferSelect;
export type NewFinanceBudgetCommitment = typeof financeBudgetCommitment.$inferInsert;

export const financePaymentVoucher = pgTable("sta_finance_payment_vouchers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull(),
  paidFromAccountId: uuid("paid_from_account_id"),
  expenseAccountId: uuid("expense_account_id"),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  voucherNumber: varchar("voucher_number", { length: 60 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  retiredAmount: numeric("retired_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  retirementStatus: varchar("retirement_status", { length: 20 }).default("not_retired").notNull(),
  method: varchar("method", { length: 40 }),
  transactionRef: varchar("transaction_ref", { length: 120 }),
  note: text("note"),
  evidenceFileId: uuid("evidence_file_id"),
  disbursedAt: timestamp("disbursed_at", { mode: 'date', precision: 6 }).notNull(),
  retiredAt: timestamp("retired_at", { mode: 'date', precision: 6 }),
  verifiedAt: timestamp("verified_at", { mode: 'date', precision: 6 }),
  metadata: jsonb("metadata"),
  contactId: uuid("contact_id"),
  grossAmount: numeric("gross_amount", { precision: 15, scale: 2 }),
  netAmount: numeric("net_amount", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financePaymentVoucher_index_requestId").on(table.requestId),
    index("financePaymentVoucher_index_paidFromAccountId").on(table.paidFromAccountId),
    index("financePaymentVoucher_index_expenseAccountId").on(table.expenseAccountId),
    index("financePaymentVoucher_index_fundId").on(table.fundId),
    index("financePaymentVoucher_index_grantId").on(table.grantId),
    index("financePaymentVoucher_index_voucherNumber").on(table.voucherNumber),
    index("financePaymentVoucher_index_retirementStatus").on(table.retirementStatus),
    index("financePaymentVoucher_index_contactId").on(table.contactId),
]);

export type FinancePaymentVoucher = typeof financePaymentVoucher.$inferSelect;
export type NewFinancePaymentVoucher = typeof financePaymentVoucher.$inferInsert;

export const financePaymentVoucherItem = pgTable("sta_finance_payment_voucher_items", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  paymentVoucherId: uuid("payment_voucher_id").notNull(),
  requestItemId: uuid("request_item_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_voucher_item").on(table.paymentVoucherId, table.requestItemId),
    index("financePaymentVoucherItem_index_paymentVoucherId").on(table.paymentVoucherId),
    index("financePaymentVoucherItem_index_requestItemId").on(table.requestItemId),
]);

export type FinancePaymentVoucherItem = typeof financePaymentVoucherItem.$inferSelect;
export type NewFinancePaymentVoucherItem = typeof financePaymentVoucherItem.$inferInsert;

export const financePaymentVoucherFile = pgTable("sta_finance_payment_voucher_files", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  voucherId: uuid("voucher_id").notNull(),
  fileId: uuid("file_id").notNull(),
  fileKind: varchar("file_kind", { length: 30 }).default("evidence").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_finance_payment_voucher_file").on(table.voucherId, table.fileId, table.fileKind),
    index("financePaymentVoucherFile_index_voucherId_fileKind_sortOrder").on(table.voucherId, table.fileKind, table.sortOrder),
    index("financePaymentVoucherFile_index_fileId").on(table.fileId),
]);

export type FinancePaymentVoucherFile = typeof financePaymentVoucherFile.$inferSelect;
export type NewFinancePaymentVoucherFile = typeof financePaymentVoucherFile.$inferInsert;

export const financePaymentVoucherCorrection = pgTable("sta_finance_payment_voucher_corrections", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  voucherId: uuid("voucher_id").notNull(),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reason: text("reason"),
  currentSnapshot: jsonb("current_snapshot").notNull(),
  proposedSnapshot: jsonb("proposed_snapshot").notNull(),
  proposedBy: bigint("proposed_by", { mode: 'bigint' }).notNull(),
  reviewedBy: bigint("reviewed_by", { mode: 'bigint' }),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', precision: 6 }),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financePaymentVoucherCorrection_index_voucherId_status").on(table.voucherId, table.status),
    index("financePaymentVoucherCorrection_index_requestId_status").on(table.requestId, table.status),
    index("financePaymentVoucherCorrection_index_proposedBy").on(table.proposedBy),
    index("financePaymentVoucherCorrection_index_reviewedBy").on(table.reviewedBy),
]);

export type FinancePaymentVoucherCorrection = typeof financePaymentVoucherCorrection.$inferSelect;
export type NewFinancePaymentVoucherCorrection = typeof financePaymentVoucherCorrection.$inferInsert;

export const financeItem = pgTable("sta_finance_items", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 60 }),
  description: text("description"),
  itemType: varchar("item_type", { length: 30 }).default("service").notNull(),
  unit: varchar("unit", { length: 30 }),
  unitPrice: numeric("unit_price", { precision: 15, scale: 4 }).default("0").notNull(),
  costPrice: numeric("cost_price", { precision: 15, scale: 4 }),
  currency: varchar("currency", { length: 5 }).default("NGN").notNull(),
  chartAccountId: uuid("chart_account_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeItem_index_itemType").on(table.itemType),
    index("financeItem_index_isActive").on(table.isActive),
    index("financeItem_index_organizationId").on(table.organizationId),
]);

export type FinanceItem = typeof financeItem.$inferSelect;
export type NewFinanceItem = typeof financeItem.$inferInsert;

export const financeExpense = pgTable("sta_finance_expenses", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  expenseNumber: varchar("expense_number", { length: 60 }).notNull().unique(),
  contactId: uuid("contact_id"),
  accountId: uuid("account_id").notNull(),
  chartAccountId: uuid("chart_account_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  expenseDate: date("expense_date", { mode: 'date' }).notNull(),
  category: varchar("category", { length: 60 }),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).default("NGN").notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  reference: varchar("reference", { length: 120 }),
  receiptFileId: uuid("receipt_file_id"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeExpense_index_status").on(table.status),
    index("financeExpense_index_expenseDate").on(table.expenseDate),
    index("financeExpense_index_contactId").on(table.contactId),
    index("financeExpense_index_accountId").on(table.accountId),
    index("financeExpense_index_tenantId").on(table.tenantId),
    index("financeExpense_index_organizationId").on(table.organizationId),
]);

export type FinanceExpense = typeof financeExpense.$inferSelect;
export type NewFinanceExpense = typeof financeExpense.$inferInsert;

export const financeDeductionType = pgTable("sta_finance_deduction_types", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 30 }).notNull(),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  appliesTo: varchar("applies_to", { length: 50 }).default("vendor").notNull(),
  glAccountId: uuid("gl_account_id"),
  isActive: boolean("is_active").default(true).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeDeductionType_index_isActive").on(table.isActive),
]);

export type FinanceDeductionType = typeof financeDeductionType.$inferSelect;
export type NewFinanceDeductionType = typeof financeDeductionType.$inferInsert;

export const financePVDeduction = pgTable("sta_finance_pv_deductions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  paymentVoucherId: uuid("payment_voucher_id").notNull(),
  deductionTypeId: uuid("deduction_type_id").notNull(),
  requestDeductionId: uuid("request_deduction_id").unique(),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  grossAmount: numeric("gross_amount", { precision: 15, scale: 2 }).notNull(),
  deductionAmount: numeric("deduction_amount", { precision: 15, scale: 2 }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 60 }),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financePVDeduction_index_paymentVoucherId").on(table.paymentVoucherId),
]);

export type FinancePVDeduction = typeof financePVDeduction.$inferSelect;
export type NewFinancePVDeduction = typeof financePVDeduction.$inferInsert;

export const financeRequestDeduction = pgTable("sta_finance_request_deductions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull(),
  deductionTypeId: uuid("deduction_type_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  grossAmount: numeric("gross_amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeRequestDeduction_index_requestId").on(table.requestId),
    index("financeRequestDeduction_index_status").on(table.status),
    index("financeRequestDeduction_index_deductionTypeId").on(table.deductionTypeId),
]);

export type FinanceRequestDeduction = typeof financeRequestDeduction.$inferSelect;
export type NewFinanceRequestDeduction = typeof financeRequestDeduction.$inferInsert;

export const financeRequestRemittance = pgTable("sta_finance_request_remittances", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  remittanceNumber: varchar("remittance_number", { length: 60 }).notNull().unique(),
  reference: varchar("reference", { length: 255 }),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  remittedAt: timestamp("remitted_at", { mode: 'date', precision: 6 }),
  paymentVoucherId: uuid("payment_voucher_id"),
  remittedBy: bigint("remitted_by", { mode: 'bigint' }),
  paidFromAccountId: uuid("paid_from_account_id"),
  evidenceFileId: uuid("evidence_file_id"),
  evidenceFileIds: jsonb("evidence_file_ids"),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeRequestRemittance_index_reference").on(table.reference),
    index("financeRequestRemittance_index_paymentVoucherId").on(table.paymentVoucherId),
    index("financeRequestRemittance_index_remittedBy").on(table.remittedBy),
]);

export type FinanceRequestRemittance = typeof financeRequestRemittance.$inferSelect;
export type NewFinanceRequestRemittance = typeof financeRequestRemittance.$inferInsert;

export const financeRequestDeductionRemittanceAllocation = pgTable("sta_finance_request_deduction_remittance_allocations", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestDeductionId: uuid("request_deduction_id").notNull(),
  requestRemittanceId: uuid("request_remittance_id").notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 15, scale: 2 }).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeRequestDeductionRemittanceAllocation_index_requestDeductionId").on(table.requestDeductionId),
    index("financeRequestDeductionRemittanceAllocation_index_requestRemittanceId").on(table.requestRemittanceId),
]);

export type FinanceRequestDeductionRemittanceAllocation = typeof financeRequestDeductionRemittanceAllocation.$inferSelect;
export type NewFinanceRequestDeductionRemittanceAllocation = typeof financeRequestDeductionRemittanceAllocation.$inferInsert;

export const financeVendorWHTAccrual = pgTable("sta_finance_vendor_wht_accruals", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  contactId: uuid("contact_id").notNull(),
  paymentVoucherId: uuid("payment_voucher_id").notNull(),
  pvDeductionId: uuid("pv_deduction_id").notNull().unique(),
  deductionTypeId: uuid("deduction_type_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  grossAmount: numeric("gross_amount", { precision: 15, scale: 2 }).notNull(),
  withheldAmount: numeric("withheld_amount", { precision: 15, scale: 2 }).notNull(),
  remittanceId: uuid("remittance_id"),
  remittedAt: timestamp("remitted_at", { mode: 'date', precision: 6 }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeVendorWHTAccrual_index_contactId").on(table.contactId),
    index("financeVendorWHTAccrual_index_periodYear_periodMonth").on(table.periodYear, table.periodMonth),
    index("financeVendorWHTAccrual_index_remittanceId").on(table.remittanceId),
]);

export type FinanceVendorWHTAccrual = typeof financeVendorWHTAccrual.$inferSelect;
export type NewFinanceVendorWHTAccrual = typeof financeVendorWHTAccrual.$inferInsert;

export const financeWHTRemittance = pgTable("sta_finance_wht_remittances", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  remittanceNumber: varchar("remittance_number", { length: 60 }).notNull().unique(),
  deductionTypeId: uuid("deduction_type_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidFromAccountId: uuid("paid_from_account_id").notNull(),
  remittanceDate: date("remittance_date", { mode: 'date' }).notNull(),
  reference: varchar("reference", { length: 120 }),
  receiptFileId: uuid("receipt_file_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  notes: text("notes"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("financeWHTRemittance_index_periodYear_periodMonth").on(table.periodYear, table.periodMonth),
    index("financeWHTRemittance_index_deductionTypeId").on(table.deductionTypeId),
]);

export type FinanceWHTRemittance = typeof financeWHTRemittance.$inferSelect;
export type NewFinanceWHTRemittance = typeof financeWHTRemittance.$inferInsert;

export const modules_finance_financeSchema = {
  financeSetting,
  financeAccount,
  financeDonor,
  financeFund,
  financeGrant,
  financePledge,
  financeChartAccount,
  financeReportingPeriod,
  financeJournalEntry,
  financeJournalSequence,
  financeJournalLine,
  financeLedgerEntry,
  financeIncomeEntry,
  financeAsset,
  financeAssetVerification,
  financeAssetDisposal,
  financeContact,
  financeContactPerson,
  financeSalesInvoice,
  financeSalesInvoiceLine,
  financeReceipt,
  financeReceiptAllocation,
  financeBillHeader,
  financeBillLine,
  financeVendorPayment,
  financeReportNote,
  financeBudget,
  financeBudgetLine,
  financeBudgetAssumption,
  financeBudgetPortfolio,
  financeBudgetRevision,
  financeBudgetRevisionLine,
  financeBudgetCommitment,
  financePaymentVoucher,
  financePaymentVoucherItem,
  financePaymentVoucherFile,
  financePaymentVoucherCorrection,
  financeItem,
  financeExpense,
  financeDeductionType,
  financePVDeduction,
  financeRequestDeduction,
  financeRequestRemittance,
  financeRequestDeductionRemittanceAllocation,
  financeVendorWHTAccrual,
  financeWHTRemittance,
};
