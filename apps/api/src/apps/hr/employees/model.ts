import { defineRelationsPart } from 'drizzle-orm';
import { bigint, date, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "contract", "intern", "consultant"]);
export type EmploymentType = typeof employmentTypeEnum.enumValues[number];

export const employmentStatusEnum = pgEnum("employment_status", ["draft", "active", "suspended", "exited"]);
export type EmploymentStatus = typeof employmentStatusEnum.enumValues[number];

export const workModeEnum = pgEnum("work_mode", ["onsite", "hybrid", "remote"]);
export type WorkMode = typeof workModeEnum.enumValues[number];

import { tenant } from '$apps/tenancy/model';

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

export const modules_hr_employeesRelations = defineRelationsPart({ employeeProfile, employeeMeta });
