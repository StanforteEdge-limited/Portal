import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

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

export const modules_platform_mailSchema = {
  mailAccount,
  mailHeader,
};
