import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum } from '$app/db/enums';
import { tenant } from '$modules/tenancy/model';

export const employeeProfile = pgTable("sta_employee_profiles", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().unique(),
  employeeCode: varchar("employee_code", { length: 60 }).unique(),
  jobTitle: varchar("job_title", { length: 120 }),
  jobDescription: text("job_description"),
  managerUserId: bigint("manager_user_id", { mode: 'bigint' }),
  employmentType: employmentTypeEnum("employment_type"),
  employmentStatus: employmentStatusEnum("employment_status").default("draft").notNull(),
  hireDate: date("hire_date", { mode: 'date' }),
  confirmationDate: date("confirmation_date", { mode: 'date' }),
  exitDate: date("exit_date", { mode: 'date' }),
  workMode: workModeEnum("work_mode"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
  designationId: bigint("designation_id", { mode: 'bigint' }),
}, (table) => [
    index("employeeProfile_index_tenantId").on(table.tenantId),
    index("employeeProfile_index_managerUserId").on(table.managerUserId),
    index("employeeProfile_index_employmentStatus").on(table.employmentStatus),
]);

export type EmployeeProfile = typeof employeeProfile.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfile.$inferInsert;

export const employeeMeta = pgTable("sta_employee_meta", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  metaKey: varchar("meta_key", { length: 120 }).notNull(),
  metaValue: jsonb("meta_value"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("employee_meta_unique").on(table.userId, table.metaKey),
    index("employeeMeta_index_metaKey").on(table.metaKey),
]);

export type EmployeeMeta = typeof employeeMeta.$inferSelect;
export type NewEmployeeMeta = typeof employeeMeta.$inferInsert;

export const leaveBalanceLedger = pgTable("sta_leave_balance_ledger", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  leaveTypeKey: varchar("leave_type_key", { length: 100 }).notNull(),
  periodYear: integer("period_year").notNull(),
  deltaDays: numeric("delta_days", { precision: 7, scale: 2 }).notNull(),
  entryType: varchar("entry_type", { length: 30 }).notNull(),
  sourceRequestId: bigint("source_request_id", { mode: 'bigint' }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("leaveBalanceLedger_index_userId_leaveTypeKey_periodYear").on(table.userId, table.leaveTypeKey, table.periodYear),
    index("leaveBalanceLedger_index_entryType").on(table.entryType),
    index("leaveBalanceLedger_index_sourceRequestId").on(table.sourceRequestId),
]);

export type LeaveBalanceLedger = typeof leaveBalanceLedger.$inferSelect;
export type NewLeaveBalanceLedger = typeof leaveBalanceLedger.$inferInsert;

export const onboardingProgress = pgTable("sta_onboarding_progress", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().unique(),
  status: onboardingStatusEnum("status").default("invited").notNull(),
  currentStep: varchar("current_step", { length: 80 }),
  stepsJson: jsonb("steps_json"),
  dueDate: date("due_date", { mode: 'date' }),
  completedAt: timestamp("completed_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("onboardingProgress_index_status").on(table.status),
]);

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type NewOnboardingProgress = typeof onboardingProgress.$inferInsert;

export const hrDesignation = pgTable("sta_hr_designations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 20 }).unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  documentId: uuid("document_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type HrDesignation = typeof hrDesignation.$inferSelect;
export type NewHrDesignation = typeof hrDesignation.$inferInsert;

export const modules_hr_employeesRelations = defineRelationsPart({ employeeProfile, employeeMeta, leaveBalanceLedger, onboardingProgress, hrDesignation });
