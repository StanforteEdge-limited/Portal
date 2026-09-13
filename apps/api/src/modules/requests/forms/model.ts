import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';

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
  createdByProfileId: bigint("created_by_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type Form = typeof form.$inferSelect;
export type NewForm = typeof form.$inferInsert;

export const formField = pgTable("sta_form_fields", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  formId: uuid("form_id").notNull().references(() => form.id, { onDelete: 'cascade' }),
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
  formId: uuid("form_id").notNull().references(() => form.id, { onDelete: 'cascade' }),
  assignedToRole: varchar("assigned_to_role", { length: 100 }),
  assignedToProfileId: bigint("assigned_to_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'cascade' }),
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
  formId: uuid("form_id").notNull().references(() => form.id, { onDelete: 'cascade' }),
  submissionNumber: varchar("submission_number", { length: 50 }).notNull(),
  submittedByProfileId: bigint("submitted_by_profile_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'restrict' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 50 }).default("submitted").notNull(),
  assignedToProfileId: bigint("assigned_to_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
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
  submissionId: uuid("submission_id").notNull().references(() => formSubmission.id, { onDelete: 'cascade' }),
  fieldId: uuid("field_id").notNull().references(() => formField.id, { onDelete: 'cascade' }),
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
  submissionId: uuid("submission_id").notNull().references(() => formSubmission.id, { onDelete: 'cascade' }),
  actionType: varchar("action_type", { length: 20 }).notNull(),
  performedByProfileId: bigint("performed_by_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
});

export type FormSubmissionHistory = typeof formSubmissionHistory.$inferSelect;
export type NewFormSubmissionHistory = typeof formSubmissionHistory.$inferInsert;

export const modules_requests_formsRelations = defineRelationsPart({ form, formField, formAssignment, formSubmission, formSubmissionData, formSubmissionHistory, profile, organization }, (r) => ({
  form: {
    creator: r.one.profile({ from: r.form.createdByProfileId, to: r.profile.id }),
    fields: r.many.formField(),
    assignments: r.many.formAssignment(),
    submissions: r.many.formSubmission(),
  },
  formField: {
    form: r.one.form({ from: r.formField.formId, to: r.form.id, optional: false }),
    submissionData: r.many.formSubmissionData(),
  },
  formAssignment: {
    form: r.one.form({ from: r.formAssignment.formId, to: r.form.id, optional: false }),
    assignedProfile: r.one.profile({ from: r.formAssignment.assignedToProfileId, to: r.profile.id }),
  },
  formSubmission: {
    form: r.one.form({ from: r.formSubmission.formId, to: r.form.id, optional: false }),
    submitter: r.one.profile({ from: r.formSubmission.submittedByProfileId, to: r.profile.id, optional: false }),
    organization: r.one.organization({ from: r.formSubmission.organizationId, to: r.organization.id }),
    assignedProfile: r.one.profile({ from: r.formSubmission.assignedToProfileId, to: r.profile.id }),
    data: r.many.formSubmissionData(),
    history: r.many.formSubmissionHistory(),
  },
  formSubmissionData: {
    submission: r.one.formSubmission({ from: r.formSubmissionData.submissionId, to: r.formSubmission.id, optional: false }),
    field: r.one.formField({ from: r.formSubmissionData.fieldId, to: r.formField.id, optional: false }),
  },
  formSubmissionHistory: {
    submission: r.one.formSubmission({ from: r.formSubmissionHistory.submissionId, to: r.formSubmission.id, optional: false }),
    performer: r.one.profile({ from: r.formSubmissionHistory.performedByProfileId, to: r.profile.id }),
  },
}));
