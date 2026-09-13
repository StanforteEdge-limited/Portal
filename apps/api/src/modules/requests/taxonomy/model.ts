import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb,  pgTable,  text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$modules/tenancy/model';

export const taxonomy = pgTable("sta_taxonomies", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  key: varchar("key", { length: 100 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }),
  renderType: varchar("render_type", { length: 20 }).default("select").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("taxonomy_unique_key_tenant").on(table.key, table.tenantId),
  index("taxonomy_index_tenantId").on(table.tenantId),
]);

export type Taxonomy = typeof taxonomy.$inferSelect;
export type NewTaxonomy = typeof taxonomy.$inferInsert;

export const taxonomyTerm = pgTable("sta_taxonomy_terms", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  taxonomyId: uuid("taxonomy_id").notNull(),
  value: varchar("value", { length: 120 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_taxonomy_term_value").on(table.taxonomyId, table.value),
    index("taxonomyTerm_index_taxonomyId_isActive").on(table.taxonomyId, table.isActive),
    index("taxonomyTerm_index_tenantId").on(table.tenantId),
]);

export type TaxonomyTerm = typeof taxonomyTerm.$inferSelect;
export type NewTaxonomyTerm = typeof taxonomyTerm.$inferInsert;

export const taxonomyTagAssignment = pgTable("sta_taxonomy_tag_assignments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  taxonomyId: uuid("taxonomy_id").notNull(),
  termId: uuid("term_id").notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("unique_taxonomy_entity_tag").on(table.taxonomyId, table.termId, table.entityType, table.entityId),
    index("taxonomyTagAssignment_idx_taggable_entity").on(table.entityType, table.entityId),
    index("taxonomyTagAssignment_idx_taggable_taxonomy_term").on(table.taxonomyId, table.termId),
    index("taxonomyTagAssignment_index_tenantId").on(table.tenantId),
]);

export type TaxonomyTagAssignment = typeof taxonomyTagAssignment.$inferSelect;
export type NewTaxonomyTagAssignment = typeof taxonomyTagAssignment.$inferInsert;

export const modules_requests_taxonomyRelations = defineRelationsPart({ taxonomy, taxonomyTerm, taxonomyTagAssignment });
