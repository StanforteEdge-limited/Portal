import { defineRelationsPart } from 'drizzle-orm';
import { bigint, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$apps/tenancy/model';

export const leaveType = pgTable('sta_leave_types', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  annualEntitlementDays: integer('annual_entitlement_days').default(0).notNull(),
  requiresApproval: integer('requires_approval').default(1).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('leave_type_tenant_code_unique').on(table.tenantId, table.code),
  index('leave_type_tenant_idx').on(table.tenantId),
]);

export const leaveRequest = pgTable('sta_leave_requests', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'bigint' }).notNull(),
  leaveTypeId: uuid('leave_type_id').notNull(),
  startDate: date('start_date', { mode: 'date' }).notNull(),
  endDate: date('end_date', { mode: 'date' }).notNull(),
  days: integer('days').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  reviewedBy: bigint('reviewed_by', { mode: 'bigint' }),
  reviewedAt: timestamp('reviewed_at', { mode: 'date', precision: 6 }),
  reviewNotes: text('review_notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('leave_request_tenant_status_idx').on(table.tenantId, table.status),
  index('leave_request_user_dates_idx').on(table.userId, table.startDate, table.endDate),
]);

export type LeaveType = typeof leaveType.$inferSelect;
export type NewLeaveType = typeof leaveType.$inferInsert;
export type LeaveRequest = typeof leaveRequest.$inferSelect;
export type NewLeaveRequest = typeof leaveRequest.$inferInsert;

/**
 * Append-only entitlement ledger. Every granted, consumed or manually adjusted
 * day lands here, so a balance is always the sum of its entries. Owned by the
 * leave module: `leaveType` and `leaveRequest` above move the balance, not the
 * employee record.
 */
export const leaveBalanceLedger = pgTable('sta_leave_balance_ledger', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'bigint' }).notNull(),
  leaveTypeKey: varchar('leave_type_key', { length: 100 }).notNull(),
  periodYear: integer('period_year').notNull(),
  deltaDays: numeric('delta_days', { precision: 7, scale: 2 }).notNull(),
  entryType: varchar('entry_type', { length: 30 }).notNull(),
  sourceRequestId: bigint('source_request_id', { mode: 'bigint' }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdBy: bigint('created_by', { mode: 'bigint' }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 6 }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("leaveBalanceLedger_index_userId_leaveTypeKey_periodYear").on(table.userId, table.leaveTypeKey, table.periodYear),
    index("leaveBalanceLedger_index_entryType").on(table.entryType),
    index("leaveBalanceLedger_index_sourceRequestId").on(table.sourceRequestId),
]);

export type LeaveBalanceLedger = typeof leaveBalanceLedger.$inferSelect;
export type NewLeaveBalanceLedger = typeof leaveBalanceLedger.$inferInsert;

export const modules_hr_leaveRelations = defineRelationsPart({ leaveType, leaveRequest, leaveBalanceLedger });
