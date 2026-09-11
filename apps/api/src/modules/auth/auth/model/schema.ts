import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../../db/enums';

export const profile = pgTable("sta_profiles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  wpUserId: bigint("wp_user_id", { mode: 'bigint' }),
  username: varchar("username", { length: 100 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  dateOfBirth: date("date_of_birth", { mode: 'date' }),
  gender: varchar("gender", { length: 10 }),
  phone: varchar("phone", { length: 30 }),
  address: varchar("address", { length: 255 }),
  nationality: varchar("nationality", { length: 100 }),
  state: varchar("state", { length: 100 }),
  lga: varchar("lga", { length: 100 }),
  maritalStatus: varchar("marital_status", { length: 30 }),
  avatar: varchar("avatar", { length: 255 }),
  bio: text("bio"),
  occupation: varchar("occupation", { length: 100 }),
  employmentType: varchar("employment_type", { length: 20 }),
  primaryOrganizationId: bigint("primary_organization_id", { mode: 'bigint' }),
  signatureFileId: uuid("signature_file_id"),
  lastLogin: timestamp("last_login", { mode: 'date', precision: 6 }),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockoutUntil: timestamp("lockout_until", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;

export const role = pgTable("sta_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
});

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

export const permission = pgTable("sta_permissions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  module: varchar("module", { length: 50 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull(),
});

export type Permission = typeof permission.$inferSelect;
export type NewPermission = typeof permission.$inferInsert;

export const rolePermission = pgTable("sta_role_permissions", {
  roleId: bigint("role_id", { mode: 'bigint' }).notNull(),
  permissionId: bigint("permission_id", { mode: 'bigint' }).notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
});

export type RolePermission = typeof rolePermission.$inferSelect;
export type NewRolePermission = typeof rolePermission.$inferInsert;

export const userRole = pgTable("sta_user_roles", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull(),
  roleId: bigint("role_id", { mode: 'bigint' }).notNull(),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  isPrimaryRole: boolean("is_primary_role").default(false).notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("profile_role_org_unique").on(table.profileId, table.roleId, table.organizationId),
    index("userRole_index_tenantId").on(table.tenantId),
]);

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

export const token = pgTable("sta_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }),
  type: tokenTypeEnum("type").notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date', precision: 6 }).notNull(),
  lastUsedAt: timestamp("last_used_at", { mode: 'date', precision: 6 }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_token_hash_type").on(table.tokenHash, table.type),
    index("token_index_profileId").on(table.profileId),
    index("token_index_tokenHash").on(table.tokenHash),
    index("token_index_type").on(table.type),
    index("token_index_expiresAt").on(table.expiresAt),
]);

export type Token = typeof token.$inferSelect;
export type NewToken = typeof token.$inferInsert;

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

export const modules_auth_authSchema = {
  profile,
  role,
  permission,
  rolePermission,
  userRole,
  token,
  notification,
  emailLog,
};
