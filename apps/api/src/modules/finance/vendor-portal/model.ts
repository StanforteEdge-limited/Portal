import { defineRelationsPart } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const vendorPortalUser = pgTable("sta_vendor_portal_users", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  vendorId: uuid("vendor_id").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: varchar("name", { length: 120 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  lastLoginAt: timestamp("last_login_at", { mode: 'date', precision: 6 }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("vendorPortalUser_index_vendorId").on(table.vendorId),
]);

export type VendorPortalUser = typeof vendorPortalUser.$inferSelect;
export type NewVendorPortalUser = typeof vendorPortalUser.$inferInsert;

export const modules_vendorPortalRelations = defineRelationsPart({ vendorPortalUser });
