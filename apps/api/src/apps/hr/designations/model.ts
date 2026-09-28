import { defineRelationsPart } from 'drizzle-orm';
import { bigserial, boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const hrDesignation = pgTable("sta_hr_designations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 20 }).unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  documentId: uuid("document_id"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
});

export type HrDesignation = typeof hrDesignation.$inferSelect;
export type NewHrDesignation = typeof hrDesignation.$inferInsert;

export const modules_hr_designationsRelations = defineRelationsPart({ hrDesignation });
