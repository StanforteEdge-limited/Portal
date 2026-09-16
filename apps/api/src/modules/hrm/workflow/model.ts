import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { tenant } from '$modules/tenancy/model';
import { profile } from '$modules/identity/users/model';

export const workflow = pgTable("sta_workflows", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  config: jsonb("config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflow_index_entityType").on(table.entityType),
    index("workflow_index_isActive").on(table.isActive),
    index("workflow_index_tenantId").on(table.tenantId),
]);

export type Workflow = typeof workflow.$inferSelect;
export type NewWorkflow = typeof workflow.$inferInsert;

export const workflowStep = pgTable("sta_workflow_steps", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  workflowId: uuid("workflow_id").notNull().references(() => workflow.id, { onDelete: 'cascade' }),
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
    index("workflowStep_index_tenantId").on(table.tenantId),
]);

export type WorkflowStep = typeof workflowStep.$inferSelect;
export type NewWorkflowStep = typeof workflowStep.$inferInsert;

export const workflowStepApprover = pgTable("sta_workflow_step_approvers", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  stepId: uuid("step_id").notNull().references(() => workflowStep.id, { onDelete: 'cascade' }),
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
    index("workflowStepApprover_index_tenantId").on(table.tenantId),
]);

export type WorkflowStepApprover = typeof workflowStepApprover.$inferSelect;
export type NewWorkflowStepApprover = typeof workflowStepApprover.$inferInsert;

export const workflowTransition = pgTable("sta_workflow_transitions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  workflowId: uuid("workflow_id").notNull().references(() => workflow.id, { onDelete: 'cascade' }),
  fromStepId: uuid("from_step_id").notNull().references(() => workflowStep.id, { onDelete: 'cascade' }),
  toStepId: uuid("to_step_id").notNull().references(() => workflowStep.id, { onDelete: 'cascade' }),
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
    index("workflowTransition_index_tenantId").on(table.tenantId),
]);

export type WorkflowTransition = typeof workflowTransition.$inferSelect;
export type NewWorkflowTransition = typeof workflowTransition.$inferInsert;

export const workflowInstance = pgTable("sta_workflow_instances", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  workflowId: uuid("workflow_id").notNull().references(() => workflow.id, { onDelete: 'restrict' }),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  currentStepId: uuid("current_step_id").references(() => workflowStep.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  initiatedBy: bigint("initiated_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  completedAt: timestamp("completed_at", { mode: 'date', precision: 6 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowInstance_index_workflowId").on(table.workflowId),
    index("workflowInstance_index_status").on(table.status),
    index("workflowInstance_index_tenantId").on(table.tenantId),
]);

export type WorkflowInstance = typeof workflowInstance.$inferSelect;
export type NewWorkflowInstance = typeof workflowInstance.$inferInsert;

export const workflowHistory = pgTable("sta_workflow_history", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  instanceId: uuid("instance_id").notNull().references(() => workflowInstance.id, { onDelete: 'cascade' }),
  transitionId: uuid("transition_id").references(() => workflowTransition.id, { onDelete: 'set null' }),
  fromStepId: uuid("from_step_id").references(() => workflowStep.id, { onDelete: 'set null' }),
  toStepId: uuid("to_step_id").references(() => workflowStep.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 50 }).notNull(),
  performedBy: bigint("performed_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  comment: text("comment"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("workflowHistory_index_instanceId").on(table.instanceId),
    index("workflowHistory_index_tenantId").on(table.tenantId),
]);

export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type NewWorkflowHistory = typeof workflowHistory.$inferInsert;

export const modules_requests_workflowRelations = defineRelationsPart({ workflow, workflowStep, workflowStepApprover, workflowTransition, workflowInstance, workflowHistory, profile }, (r) => ({
  workflow: {
    creator: r.one.profile({ from: r.workflow.createdBy, to: r.profile.id, alias: 'workflow_creator' }),
    updater: r.one.profile({ from: r.workflow.updatedBy, to: r.profile.id, alias: 'workflow_updater' }),
    steps: r.many.workflowStep(),
    transitions: r.many.workflowTransition(),
    instances: r.many.workflowInstance(),
  },
  workflowStep: {
    workflow: r.one.workflow({ from: r.workflowStep.workflowId, to: r.workflow.id, optional: false }),
    approvers: r.many.workflowStepApprover(),
  },
  workflowStepApprover: {
    step: r.one.workflowStep({ from: r.workflowStepApprover.stepId, to: r.workflowStep.id, optional: false }),
  },
  workflowTransition: {
    workflow: r.one.workflow({ from: r.workflowTransition.workflowId, to: r.workflow.id, optional: false }),
    fromStep: r.one.workflowStep({ from: r.workflowTransition.fromStepId, to: r.workflowStep.id, alias: 'transition_from_step', optional: false }),
    toStep: r.one.workflowStep({ from: r.workflowTransition.toStepId, to: r.workflowStep.id, alias: 'transition_to_step', optional: false }),
  },
  workflowInstance: {
    workflow: r.one.workflow({ from: r.workflowInstance.workflowId, to: r.workflow.id, optional: false }),
    currentStep: r.one.workflowStep({ from: r.workflowInstance.currentStepId, to: r.workflowStep.id }),
    initiator: r.one.profile({ from: r.workflowInstance.initiatedBy, to: r.profile.id }),
    history: r.many.workflowHistory(),
  },
  workflowHistory: {
    instance: r.one.workflowInstance({ from: r.workflowHistory.instanceId, to: r.workflowInstance.id, optional: false }),
    transition: r.one.workflowTransition({ from: r.workflowHistory.transitionId, to: r.workflowTransition.id }),
    fromStep: r.one.workflowStep({ from: r.workflowHistory.fromStepId, to: r.workflowStep.id, alias: 'history_from_step' }),
    toStep: r.one.workflowStep({ from: r.workflowHistory.toStepId, to: r.workflowStep.id, alias: 'history_to_step' }),
    performer: r.one.profile({ from: r.workflowHistory.performedBy, to: r.profile.id }),
  },
}));
