import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

export const employeeProfile = pgTable("sta_employee_profiles", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
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

export const attendanceEntry = pgTable("sta_attendance_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  entryType: varchar("entry_type", { length: 30 }).notNull(),
  entryAt: timestamp("entry_at", { mode: 'date', precision: 6 }).notNull(),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  attendanceMode: varchar("attendance_mode", { length: 30 }),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  geofenceStatus: varchar("geofence_status", { length: 30 }),
  source: varchar("source", { length: 30 }).default("web").notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("attendanceEntry_index_userId_workDate").on(table.userId, table.workDate),
    index("attendanceEntry_index_entryType_entryAt").on(table.entryType, table.entryAt),
]);

export type AttendanceEntry = typeof attendanceEntry.$inferSelect;
export type NewAttendanceEntry = typeof attendanceEntry.$inferInsert;

export const attendanceDaily = pgTable("sta_attendance_daily", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  status: varchar("status", { length: 20 }).default("absent").notNull(),
  attendanceMode: varchar("attendance_mode", { length: 30 }),
  expectedMode: varchar("expected_mode", { length: 30 }),
  reconciliationStatus: varchar("reconciliation_status", { length: 30 }),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }),
  geofenceStatus: varchar("geofence_status", { length: 30 }),
  scheduledMinutes: integer("scheduled_minutes").default(0).notNull(),
  workedMinutes: integer("worked_minutes").default(0).notNull(),
  lateMinutes: integer("late_minutes").default(0).notNull(),
  overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
  firstInAt: timestamp("first_in_at", { mode: 'date', precision: 6 }),
  lastOutAt: timestamp("last_out_at", { mode: 'date', precision: 6 }),
  policySnapshot: jsonb("policy_snapshot"),
  computedAt: timestamp("computed_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_attendance_daily").on(table.userId, table.workDate),
    index("attendanceDaily_index_status").on(table.status),
]);

export type AttendanceDaily = typeof attendanceDaily.$inferSelect;
export type NewAttendanceDaily = typeof attendanceDaily.$inferInsert;

export const attendanceHoliday = pgTable("sta_attendance_holidays", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }),
  holidayDate: date("holiday_date", { mode: 'date' }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("attendanceHoliday_index_tenantId").on(table.tenantId),
    index("attendanceHoliday_index_organizationId_holidayDate").on(table.organizationId, table.holidayDate),
    index("attendanceHoliday_index_officeLocationId_holidayDate").on(table.officeLocationId, table.holidayDate),
]);

export type AttendanceHoliday = typeof attendanceHoliday.$inferSelect;
export type NewAttendanceHoliday = typeof attendanceHoliday.$inferInsert;

export const attendanceCorrection = pgTable("sta_attendance_corrections", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  attendanceDailyId: uuid("attendance_daily_id"),
  attendanceEntryId: uuid("attendance_entry_id"),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }),
  requestType: varchar("request_type", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  requestedAt: timestamp("requested_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  requestedBy: bigint("requested_by", { mode: 'bigint' }).notNull(),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', precision: 6 }),
  reviewedBy: bigint("reviewed_by", { mode: 'bigint' }),
  reason: text("reason").notNull(),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  proposedAt: timestamp("proposed_at", { mode: 'date', precision: 6 }),
  proposedMode: varchar("proposed_mode", { length: 30 }),
  proposedOfficeLocationId: bigint("proposed_office_location_id", { mode: 'bigint' }),
  proposedLatitude: numeric("proposed_latitude", { precision: 10, scale: 7 }),
  proposedLongitude: numeric("proposed_longitude", { precision: 10, scale: 7 }),
  reviewNotes: text("review_notes"),
  snapshotJson: jsonb("snapshot_json"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("attendanceCorrection_index_userId_workDate").on(table.userId, table.workDate),
    index("attendanceCorrection_index_status_requestedAt").on(table.status, table.requestedAt),
]);

export type AttendanceCorrection = typeof attendanceCorrection.$inferSelect;
export type NewAttendanceCorrection = typeof attendanceCorrection.$inferInsert;

export const attendanceException = pgTable("sta_attendance_exceptions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  attendanceDailyId: uuid("attendance_daily_id"),
  attendanceEntryId: uuid("attendance_entry_id"),
  officeLocationId: bigint("office_location_id", { mode: 'bigint' }),
  exceptionType: varchar("exception_type", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  attendanceMode: varchar("attendance_mode", { length: 30 }),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: 'bigint' }).notNull(),
  reviewedBy: bigint("reviewed_by", { mode: 'bigint' }),
  reviewedAt: timestamp("reviewed_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("attendanceException_index_userId_workDate").on(table.userId, table.workDate),
    index("attendanceException_index_status_exceptionType").on(table.status, table.exceptionType),
]);

export type AttendanceException = typeof attendanceException.$inferSelect;
export type NewAttendanceException = typeof attendanceException.$inferInsert;

export const leaveBalanceLedger = pgTable("sta_leave_balance_ledger", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
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

export const modules_hr_hrSchema = {
  employeeProfile,
  employeeMeta,
  attendanceEntry,
  attendanceDaily,
  attendanceHoliday,
  attendanceCorrection,
  attendanceException,
  leaveBalanceLedger,
  onboardingProgress,
  hrDesignation,
};
