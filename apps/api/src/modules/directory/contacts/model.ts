import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { tenant } from '$modules/tenancy/model';

export const contact = pgTable("sta_contacts", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }).references(() => organization.id, { onDelete: 'set null' }),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("contact_email_tenant_unique").on(table.tenantId, table.email),
  index("contact_index_tenantId").on(table.tenantId),
  index("contact_index_organizationId").on(table.organizationId),
]);

export type Contact = typeof contact.$inferSelect;
export type NewContact = typeof contact.$inferInsert;

export const modules_directory_contactsRelations = defineRelationsPart({ contact, profile, organization, tenant }, (r) => ({
  contact: {
    tenant: r.one.tenant({ from: r.contact.tenantId, to: r.tenant.id, optional: false }),
    organization: r.one.organization({ from: r.contact.organizationId, to: r.organization.id }),
    creator: r.one.profile({ from: r.contact.createdBy, to: r.profile.id }),
  },
}));