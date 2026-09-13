import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '$app/db/enums';

export const emailLog = pgTable("sta_email_logs", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  userId: bigint("user_id", { mode: 'bigint' }),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  threadKey: varchar("thread_key", { length: 191 }),
  provider: varchar("provider", { length: 50 }),
  status: varchar("status", { length: 20 }).default("queued").notNull(),
  messageId: varchar("message_id", { length: 255 }),
  errorMessage: text("error_message"),
  notifiableType: varchar("notifiable_type", { length: 100 }),
  notifiableId: bigint("notifiable_id", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("emailLog_index_tenantId").on(table.tenantId),
    index("emailLog_index_userId").on(table.userId),
    index("emailLog_index_status").on(table.status),
    index("emailLog_index_notifiableType_notifiableId").on(table.notifiableType, table.notifiableId),
]);

export type EmailLog = typeof emailLog.$inferSelect;
export type NewEmailLog = typeof emailLog.$inferInsert;

export const mailAccount = pgTable("mail_accounts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull(),
  provider: mailProviderEnum("provider").notNull(),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { mode: 'date', precision: 6 }).notNull(),
  isShared: boolean("is_shared").default(false).notNull(),
  label: varchar("label", { length: 100 }),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'date', precision: 6 }),
  signature: text("signature"),
  outlookSubscriptionId: varchar("outlook_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    index("mailAccount_index_profileId").on(table.profileId),
]);

export type MailAccount = typeof mailAccount.$inferSelect;
export type NewMailAccount = typeof mailAccount.$inferInsert;

export const mailHeader = pgTable("mail_headers", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  accountId: bigint("account_id", { mode: 'bigint' }).notNull(),
  uid: varchar("uid", { length: 255 }).notNull(),
  folder: varchar("folder", { length: 500 }).notNull(),
  subject: varchar("subject", { length: 998 }),
  fromName: varchar("from_name", { length: 255 }),
  fromEmail: varchar("from_email", { length: 255 }),
  date: timestamp("date", { mode: 'date', precision: 6 }),
  isRead: boolean("is_read").default(false).notNull(),
  hasAttachment: boolean("has_attachment").default(false).notNull(),
  snippet: varchar("snippet", { length: 500 }),
  syncedAt: timestamp("synced_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("uniqueIndex_accountId_folder_uid").on(table.accountId, table.folder, table.uid),
    index("mailHeader_index_accountId_folder").on(table.accountId, table.folder),
]);

export type MailHeader = typeof mailHeader.$inferSelect;
export type NewMailHeader = typeof mailHeader.$inferInsert;

export const modules_platform_mailRelations = defineRelationsPart({ emailLog, mailAccount, mailHeader });
