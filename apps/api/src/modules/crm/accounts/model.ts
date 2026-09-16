import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { tenant } from '$modules/tenancy/model';

export const crmAccount = pgTable("sta_crm_accounts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  type: varchar("type", { length: 30 }).default("customer").notNull(),
  lifecycleStage: varchar("lifecycle_stage", { length: 30 }).default("prospect").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  ownerProfileId: bigint("owner_profile_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_account_index_tenantId").on(table.tenantId),
  index("crm_account_index_ownerProfileId").on(table.ownerProfileId),
]);

export type CrmAccount = typeof crmAccount.$inferSelect;
export type NewCrmAccount = typeof crmAccount.$inferInsert;

export const modules_crm_accountsRelations = defineRelationsPart({ crmAccount });
