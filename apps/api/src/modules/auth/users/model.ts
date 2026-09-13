import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

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

export const modules_auth_usersRelations = defineRelationsPart({ profile });
