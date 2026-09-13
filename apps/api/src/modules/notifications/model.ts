import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../db/enums';

export const notification = pgTable("sta_notifications", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  type: varchar("type", { length: 50 }).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 255 }),
  data: jsonb("data"),
  status: varchar("status", { length: 20 }).default("unread").notNull(),
  readAt: timestamp("read_at", { mode: 'date', precision: 6 }),
  archivedAt: timestamp("archived_at", { mode: 'date', precision: 6 }),
  sentVia: jsonb("sent_via"),
  notifiableType: varchar("notifiable_type", { length: 100 }),
  notifiableId: bigint("notifiable_id", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("notification_index_tenantId").on(table.tenantId),
    index("notification_index_userId").on(table.userId),
    index("notification_index_type").on(table.type),
    index("notification_index_status").on(table.status),
    index("notification_index_notifiableType_notifiableId").on(table.notifiableType, table.notifiableId),
]);

export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;

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

export const modules_notificationsRelations = defineRelationsPart({ notification, notificationJob });
