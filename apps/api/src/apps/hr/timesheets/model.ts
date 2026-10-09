import { defineRelationsPart } from 'drizzle-orm';
import { bigint, date, index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * A worker's timesheet for a single day. Rows are normally created by the work
 * log sync in `TimesheetsService.syncFromWorkLog`, which keys off
 * `sourceWorkLogId`; HR can also key entries up by hand.
 *
 * Payroll reads approved rows to drive `hourly_timesheet` earnings, but owns
 * none of this table.
 */
export const projectTimesheetEntry = pgTable("sta_project_timesheet_entries", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  sourceWorkLogId: uuid("source_work_log_id").unique(),
  workerId: uuid("worker_id").notNull(),
  componentId: uuid("component_id"),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  teamId: bigint("team_id", { mode: 'bigint' }),
  projectId: bigint("project_id", { mode: 'bigint' }),
  fundId: uuid("fund_id"),
  grantId: uuid("grant_id"),
  syncedRunId: uuid("synced_run_id"),
  workDate: date("work_date", { mode: 'date' }).notNull(),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  approvedBy: bigint("approved_by", { mode: 'bigint' }),
  approvedAt: timestamp("approved_at", { mode: 'date', precision: 6 }),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("projectTimesheetEntry_index_workerId_workDate").on(table.workerId, table.workDate),
    index("projectTimesheetEntry_index_projectId").on(table.projectId),
    index("projectTimesheetEntry_index_fundId").on(table.fundId),
    index("projectTimesheetEntry_index_grantId").on(table.grantId),
    index("projectTimesheetEntry_index_status").on(table.status),
    index("projectTimesheetEntry_index_syncedRunId").on(table.syncedRunId),
    index("projectTimesheetEntry_index_sourceWorkLogId").on(table.sourceWorkLogId),
]);

export type ProjectTimesheetEntry = typeof projectTimesheetEntry.$inferSelect;
export type NewProjectTimesheetEntry = typeof projectTimesheetEntry.$inferInsert;

export const modules_hr_timesheetsRelations = defineRelationsPart({
  projectTimesheetEntry,
});
