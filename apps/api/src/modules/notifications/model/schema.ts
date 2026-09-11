import { bigint, integer, jsonb, pgTable, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';

export const notificationJob = pgTable('sta_notification_jobs', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull(),
  notificationId: bigint('notification_id', { mode: 'bigint' }).notNull(),
  channel: varchar('channel', { length: 30 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  runAt: timestamp('run_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { mode: 'date', precision: 6 }),
  processedAt: timestamp('processed_at', { mode: 'date', precision: 6 }),
  lastError: varchar('last_error', { length: 1000 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  index('notification_job_status_run_idx').on(table.status, table.runAt),
  index('notification_job_tenant_idx').on(table.tenantId),
]);

export type NotificationJob = typeof notificationJob.$inferSelect;
export type NewNotificationJob = typeof notificationJob.$inferInsert;
