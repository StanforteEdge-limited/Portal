import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const procurementCase = pgTable("sta_procurement_cases", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull().unique(),
  requisitionId: uuid("requisition_id").unique(),
  assignedOfficerId: bigint("assigned_officer_id", { mode: 'bigint' }),
  status: varchar("status", { length: 30 }).default("new").notNull(),
  category: varchar("category", { length: 20 }),
  note: text("note"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("procurementCase_index_status").on(table.status),
    index("procurementCase_index_assignedOfficerId").on(table.assignedOfficerId),
]);

export type ProcurementCase = typeof procurementCase.$inferSelect;
export type NewProcurementCase = typeof procurementCase.$inferInsert;

export const procurementRequisition = pgTable("sta_procurement_requisitions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  requisitionNumber: varchar("requisition_number", { length: 30 }).notNull().unique(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  requestedBy: bigint("requested_by", { mode: 'bigint' }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: procurementCategoryEnum("category").notNull(),
  paymentPattern: paymentPatternEnum("payment_pattern").default("post_delivery").notNull(),
  items: jsonb("items").notNull(),
  estimatedTotal: numeric("estimated_total", { precision: 15, scale: 2 }).notNull(),
  justification: text("justification"),
  budgetLineId: uuid("budget_line_id"),
  workflowInstanceId: uuid("workflow_instance_id"),
  status: procurementStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("procurementRequisition_index_requestedBy").on(table.requestedBy),
    index("procurementRequisition_index_status").on(table.status),
    index("procurementRequisition_index_tenantId").on(table.tenantId),
    index("procurementRequisition_index_organizationId").on(table.organizationId),
]);

export type ProcurementRequisition = typeof procurementRequisition.$inferSelect;
export type NewProcurementRequisition = typeof procurementRequisition.$inferInsert;

export const procurementOrder = pgTable("sta_procurement_orders", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  poNumber: varchar("po_number", { length: 30 }).notNull().unique(),
  requisitionId: uuid("requisition_id").notNull(),
  vendorId: uuid("vendor_id").notNull(),
  preparedBy: bigint("prepared_by", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  items: jsonb("items").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentPattern: paymentPatternEnum("payment_pattern").default("post_delivery").notNull(),
  milestones: jsonb("milestones"),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  deliveryDate: date("delivery_date", { mode: 'date' }),
  deliveryAddress: text("delivery_address"),
  workflowInstanceId: uuid("workflow_instance_id"),
  status: poStatusEnum("status").default("draft").notNull(),
  vendorAcknowledgedAt: timestamp("vendor_acknowledged_at", { mode: 'date', precision: 6 }),
  vendorAcknowledgeNote: text("vendor_acknowledge_note"),
  pdfFileId: uuid("pdf_file_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("procurementOrder_index_requisitionId").on(table.requisitionId),
    index("procurementOrder_index_vendorId").on(table.vendorId),
    index("procurementOrder_index_tenantId").on(table.tenantId),
    index("procurementOrder_index_status").on(table.status),
]);

export type ProcurementOrder = typeof procurementOrder.$inferSelect;
export type NewProcurementOrder = typeof procurementOrder.$inferInsert;

export const procurementGRN = pgTable("sta_procurement_grns", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  grnNumber: varchar("grn_number", { length: 30 }).notNull().unique(),
  poId: uuid("po_id").notNull(),
  raisedBy: bigint("raised_by", { mode: 'bigint' }).notNull(),
  receivedDate: date("received_date", { mode: 'date' }).notNull(),
  items: jsonb("items").notNull(),
  overallCondition: varchar("overall_condition", { length: 20 }).default("satisfactory").notNull(),
  notes: text("notes"),
  confirmedByOfficer: boolean("confirmed_by_officer").default(false).notNull(),
  confirmedAt: timestamp("confirmed_at", { mode: 'date', precision: 6 }),
  confirmedBy: bigint("confirmed_by", { mode: 'bigint' }),
  status: grnStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("procurementGRN_index_poId").on(table.poId),
    index("procurementGRN_index_status").on(table.status),
]);

export type ProcurementGRN = typeof procurementGRN.$inferSelect;
export type NewProcurementGRN = typeof procurementGRN.$inferInsert;

export const procurementAttachment = pgTable("sta_procurement_attachments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  caseId: uuid("case_id"),
  orderId: uuid("order_id"),
  fileId: uuid("file_id").notNull(),
  label: varchar("label", { length: 150 }),
  visibility: varchar("visibility", { length: 20 }).default("internal").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("procurementAttachment_index_caseId").on(table.caseId),
    index("procurementAttachment_index_orderId").on(table.orderId),
    index("procurementAttachment_index_fileId").on(table.fileId),
    index("procurementAttachment_index_visibility").on(table.visibility),
]);

export type ProcurementAttachment = typeof procurementAttachment.$inferSelect;
export type NewProcurementAttachment = typeof procurementAttachment.$inferInsert;

export const vendorPortalUser = pgTable("sta_vendor_portal_users", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  vendorId: uuid("vendor_id").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: varchar("name", { length: 120 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  lastLoginAt: timestamp("last_login_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("vendorPortalUser_index_vendorId").on(table.vendorId),
]);

export type VendorPortalUser = typeof vendorPortalUser.$inferSelect;
export type NewVendorPortalUser = typeof vendorPortalUser.$inferInsert;

export const modules_finance_procurementRelations = defineRelationsPart({ procurementCase, procurementRequisition, procurementOrder, procurementGRN, procurementAttachment, vendorPortalUser });
