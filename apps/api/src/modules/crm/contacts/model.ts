import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$modules/tenancy/model';
import { crmAccount } from '../accounts/model';

export const crmContact = pgTable("sta_crm_contacts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  accountId: bigint("account_id", { mode: 'bigint' }).references(() => crmAccount.id, { onDelete: 'set null' }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  jobTitle: varchar("job_title", { length: 160 }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crm_contact_email_tenant_unique").on(table.tenantId, table.email),
  index("crm_contact_index_tenantId").on(table.tenantId),
  index("crm_contact_index_accountId").on(table.accountId),
]);

export type CrmContact = typeof crmContact.$inferSelect;
export type NewCrmContact = typeof crmContact.$inferInsert;

export const modules_crm_contactsRelations = defineRelationsPart({ crmContact });
