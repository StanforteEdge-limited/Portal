import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

export const requestGroup = pgTable("sta_request_groups", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
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

export const workflow = pgTable("sta_workflows", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  config: jsonb("config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflow_index_entityType").on(table.entityType),
    index("workflow_index_isActive").on(table.isActive),
]);

export type Workflow = typeof workflow.$inferSelect;
export type NewWorkflow = typeof workflow.$inferInsert;

export const workflowStep = pgTable("sta_workflow_steps", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workflowId: uuid("workflow_id").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  stepType: varchar("step_type", { length: 50 }).default("approval").notNull(),
  order: integer("order").default(0).notNull(),
  isInitial: boolean("is_initial").default(false).notNull(),
  isFinal: boolean("is_final").default(false).notNull(),
  config: jsonb("config"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowStep_index_workflowId").on(table.workflowId),
    index("workflowStep_index_order").on(table.order),
]);

export type WorkflowStep = typeof workflowStep.$inferSelect;
export type NewWorkflowStep = typeof workflowStep.$inferInsert;

export const workflowStepApprover = pgTable("sta_workflow_step_approvers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  stepId: uuid("step_id").notNull(),
  approverType: varchar("approver_type", { length: 10 }).notNull(),
  approverId: varchar("approver_id", { length: 64 }).notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  approvalOrder: integer("approval_order").default(0).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowStepApprover_index_stepId").on(table.stepId),
]);

export type WorkflowStepApprover = typeof workflowStepApprover.$inferSelect;
export type NewWorkflowStepApprover = typeof workflowStepApprover.$inferInsert;

export const workflowTransition = pgTable("sta_workflow_transitions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workflowId: uuid("workflow_id").notNull(),
  fromStepId: uuid("from_step_id").notNull(),
  toStepId: uuid("to_step_id").notNull(),
  name: text("name"),
  description: text("description"),
  action: varchar("action", { length: 50 }).notNull(),
  conditions: jsonb("conditions"),
  config: jsonb("config"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowTransition_index_workflowId").on(table.workflowId),
    index("workflowTransition_index_fromStepId").on(table.fromStepId),
    index("workflowTransition_index_toStepId").on(table.toStepId),
]);

export type WorkflowTransition = typeof workflowTransition.$inferSelect;
export type NewWorkflowTransition = typeof workflowTransition.$inferInsert;

export const workflowInstance = pgTable("sta_workflow_instances", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  workflowId: uuid("workflow_id").notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  currentStepId: uuid("current_step_id"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  initiatedBy: bigint("initiated_by", { mode: 'bigint' }),
  completedAt: timestamp("completed_at", { mode: 'date', precision: 6 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowInstance_index_workflowId").on(table.workflowId),
    index("workflowInstance_index_status").on(table.status),
]);

export type WorkflowInstance = typeof workflowInstance.$inferSelect;
export type NewWorkflowInstance = typeof workflowInstance.$inferInsert;

export const workflowHistory = pgTable("sta_workflow_history", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  instanceId: uuid("instance_id").notNull(),
  transitionId: uuid("transition_id"),
  fromStepId: uuid("from_step_id"),
  toStepId: uuid("to_step_id"),
  action: varchar("action", { length: 50 }).notNull(),
  performedBy: bigint("performed_by", { mode: 'bigint' }),
  comment: text("comment"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowHistory_index_instanceId").on(table.instanceId),
]);

export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type NewWorkflowHistory = typeof workflowHistory.$inferInsert;

export const acknowledgement = pgTable("sta_acknowledgements", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  subjectType: varchar("subject_type", { length: 60 }).notNull(),
  subjectId: varchar("subject_id", { length: 191 }).notNull(),
  subjectLabel: varchar("subject_label", { length: 255 }),
  version: varchar("version", { length: 60 }),
  status: varchar("status", { length: 20 }).default("acknowledged").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { mode: 'date', precision: 6 }),
  sourceFormSubmissionId: uuid("source_form_submission_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_ack_subject_version").on(table.userId, table.subjectType, table.subjectId, table.version),
    index("acknowledgement_index_subjectType_subjectId").on(table.subjectType, table.subjectId),
    index("acknowledgement_index_status").on(table.status),
]);

export type Acknowledgement = typeof acknowledgement.$inferSelect;
export type NewAcknowledgement = typeof acknowledgement.$inferInsert;

export const modules_requests_requestsSchema = {
  requestGroup,
  requestCategory,
  requestType,
  requestInstance,
  requestItem,
  requestItemFile,
  workflow,
  workflowStep,
  workflowStepApprover,
  workflowTransition,
  workflowInstance,
  workflowHistory,
  acknowledgement,
};
