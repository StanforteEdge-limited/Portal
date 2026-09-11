import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

export const form = pgTable("sta_forms", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 20 }).default("general").notNull(),
  storageType: varchar("storage_type", { length: 20 }),
  targetTable: varchar("target_table", { length: 100 }),
  columnMapping: jsonb("column_mapping"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurrencePattern: jsonb("recurrence_pattern"),
  workflowEnabled: boolean("workflow_enabled").default(false).notNull(),
  workflowStatuses: jsonb("workflow_statuses"),
  createdByProfileId: bigint("created_by_profile_id", { mode: 'bigint' }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type Form = typeof form.$inferSelect;
export type NewForm = typeof form.$inferInsert;

export const formField = pgTable("sta_form_fields", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  formId: uuid("form_id").notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  fieldLabel: varchar("field_label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  fieldOptions: jsonb("field_options"),
  isRequired: boolean("is_required").default(false).notNull(),
  validationRules: jsonb("validation_rules"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_form_field_key").on(table.formId, table.fieldKey),
]);

export type FormField = typeof formField.$inferSelect;
export type NewFormField = typeof formField.$inferInsert;

export const formAssignment = pgTable("sta_form_assignments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  formId: uuid("form_id").notNull(),
  assignedToRole: varchar("assigned_to_role", { length: 100 }),
  assignedToProfileId: bigint("assigned_to_profile_id", { mode: 'bigint' }),
  assignedToDepartmentId: uuid("assigned_to_department_id"),
  visibilityRoles: jsonb("visibility_roles"),
  dueDate: date("due_date", { mode: 'date' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type FormAssignment = typeof formAssignment.$inferSelect;
export type NewFormAssignment = typeof formAssignment.$inferInsert;

export const formSubmission = pgTable("sta_form_submissions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  formId: uuid("form_id").notNull(),
  submissionNumber: varchar("submission_number", { length: 50 }).notNull(),
  submittedByProfileId: bigint("submitted_by_profile_id", { mode: 'bigint' }).notNull(),
  organizationId: uuid("organization_id"),
  status: varchar("status", { length: 50 }).default("submitted").notNull(),
  assignedToProfileId: bigint("assigned_to_profile_id", { mode: 'bigint' }),
  resolvedAt: timestamp("resolved_at", { mode: 'date', precision: 6 }),
  resolutionNotes: text("resolution_notes"),
  submittedAt: timestamp("submitted_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("uniqueIndex_submissionNumber").on(table.submissionNumber),
]);

export type FormSubmission = typeof formSubmission.$inferSelect;
export type NewFormSubmission = typeof formSubmission.$inferInsert;

export const formSubmissionData = pgTable("sta_form_submission_data", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  submissionId: uuid("submission_id").notNull(),
  fieldId: uuid("field_id").notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  valueText: varchar("value_text", { length: 1000 }),
  valueNumber: numeric("value_number", { precision: 15, scale: 4 }),
  valueDate: date("value_date", { mode: 'date' }),
  valueDatetime: timestamp("value_datetime", { mode: 'date', precision: 6 }),
  valueFileUrl: varchar("value_file_url", { length: 500 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_submission_field").on(table.submissionId, table.fieldId),
]);

export type FormSubmissionData = typeof formSubmissionData.$inferSelect;
export type NewFormSubmissionData = typeof formSubmissionData.$inferInsert;

export const formSubmissionHistory = pgTable("sta_form_submission_history", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  submissionId: uuid("submission_id").notNull(),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  performedByProfileId: bigint("performed_by_profile_id", { mode: 'bigint' }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
});

export type FormSubmissionHistory = typeof formSubmissionHistory.$inferSelect;
export type NewFormSubmissionHistory = typeof formSubmissionHistory.$inferInsert;

export const modules_requests_formsSchema = {
  form,
  formField,
  formAssignment,
  formSubmission,
  formSubmissionData,
  formSubmissionHistory,
};
