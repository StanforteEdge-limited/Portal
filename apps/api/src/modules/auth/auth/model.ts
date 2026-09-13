import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tokenTypeEnum, organizationTypeEnum, groupUserRoleEnum, requestStatusEnum, employmentTypeEnum, employmentStatusEnum, workModeEnum, onboardingStatusEnum, workItemTypeEnum, workItemStatusEnum, workPriorityEnum, workLogApprovalStatusEnum, procurementCategoryEnum, paymentPatternEnum, procurementStatusEnum, poStatusEnum, grnStatusEnum, mailProviderEnum } from '../../../db/enums';

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

export const modules_auth_authRelations = defineRelationsPart({ token });
