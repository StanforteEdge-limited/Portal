import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

export const requestGroup = pgTable("sta_request_groups", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type RequestGroup = typeof requestGroup.$inferSelect;
export type NewRequestGroup = typeof requestGroup.$inferInsert;

export const requestCategory = pgTable("sta_request_categories", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  groupId: uuid("group_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type RequestCategory = typeof requestCategory.$inferSelect;
export type NewRequestCategory = typeof requestCategory.$inferInsert;

export const requestType = pgTable("sta_request_types", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  categoryId: uuid("category_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  codePrefix: varchar("code_prefix", { length: 10 }).notNull(),
  taxonomyKeys: jsonb("taxonomy_keys"),
  description: text("description"),
  storageType: varchar("storage_type", { length: 20 }),
  formSchema: jsonb("form_schema"),
  approvalFlowJson: jsonb("approval_flow_json"),
  approvalLimit: numeric("approval_limit", { precision: 15, scale: 2 }),
  visibleToRoles: jsonb("visible_to_roles"),
  sequenceCounter: integer("sequence_counter").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  workflowType: varchar("workflow_type", { length: 20 }),
  handlerRoleLabel: varchar("handler_role_label", { length: 100 }),
  formId: uuid("form_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_category_code_prefix").on(table.categoryId, table.codePrefix),
]);

export type RequestType = typeof requestType.$inferSelect;
export type NewRequestType = typeof requestType.$inferInsert;

export const requestInstance = pgTable("sta_request_instances", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  requestTypeId: uuid("request_type_id").notNull(),
  groupId: uuid("group_id").notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  teamId: bigint("team_id", { mode: 'bigint' }),
  workflowInstanceId: uuid("workflow_instance_id"),
  status: requestStatusEnum("status").default("draft").notNull(),
  data: jsonb("data"),
  currentApprovalStep: integer("current_approval_step").default(0).notNull(),
  auditLogId: uuid("audit_log_id"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  contactId: uuid("contact_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("requestInstance_index_requestTypeId").on(table.requestTypeId),
    index("requestInstance_index_groupId").on(table.groupId),
    index("requestInstance_index_createdBy").on(table.createdBy),
    index("requestInstance_index_teamId").on(table.teamId),
    index("requestInstance_index_status").on(table.status),
    index("requestInstance_index_workflowInstanceId").on(table.workflowInstanceId),
]);

export type RequestInstance = typeof requestInstance.$inferSelect;
export type NewRequestInstance = typeof requestInstance.$inferInsert;

export const requestItem = pgTable("sta_request_items", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestId: bigint("request_id", { mode: 'bigint' }).notNull(),
  fileId: uuid("file_id"),
  categoryId: uuid("category_id"),
  subcategoryId: uuid("subcategory_id"),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  dueDate: date("due_date", { mode: 'date' }),
  notes: text("notes"),
  bankName: varchar("bank_name", { length: 120 }),
  accountNumber: varchar("account_number", { length: 50 }),
  accountName: varchar("account_name", { length: 120 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("requestItem_index_requestId").on(table.requestId),
    index("requestItem_index_fileId").on(table.fileId),
    index("requestItem_index_categoryId").on(table.categoryId),
    index("requestItem_index_subcategoryId").on(table.subcategoryId),
]);

export type RequestItem = typeof requestItem.$inferSelect;
export type NewRequestItem = typeof requestItem.$inferInsert;

export const requestItemFile = pgTable("sta_request_item_files", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  requestItemId: uuid("request_item_id").notNull(),
  fileId: uuid("file_id").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("unique_request_item_file").on(table.requestItemId, table.fileId),
    index("requestItemFile_index_requestItemId_sortOrder").on(table.requestItemId, table.sortOrder),
    index("requestItemFile_index_fileId").on(table.fileId),
]);

export type RequestItemFile = typeof requestItemFile.$inferSelect;
export type NewRequestItemFile = typeof requestItemFile.$inferInsert;

export const modules_requests_requestsRelations = defineRelationsPart({ requestGroup, requestCategory, requestType, requestInstance, requestItem, requestItemFile });
