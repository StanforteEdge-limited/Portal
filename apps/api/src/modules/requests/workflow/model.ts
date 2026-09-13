import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

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

export const modules_requests_workflowRelations = defineRelationsPart({ workflow, workflowStep, workflowStepApprover, workflowTransition, workflowInstance, workflowHistory });
