import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$modules/tenancy/model';

export const crmPipeline = pgTable("sta_crm_pipelines", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("crm_pipeline_index_tenantId").on(table.tenantId),
]);

export const crmPipelineStage = pgTable("sta_crm_pipeline_stages", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  pipelineId: bigint("pipeline_id", { mode: 'bigint' }).notNull().references(() => crmPipeline.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 160 }).notNull(),
  position: integer("position").default(0).notNull(),
  probability: integer("probability").default(0).notNull(),
  color: varchar("color", { length: 20 }),
  isWon: boolean("is_won").default(false).notNull(),
  isLost: boolean("is_lost").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crm_pipeline_stage_position_unique").on(table.pipelineId, table.position),
  index("crm_pipeline_stage_index_tenantId").on(table.tenantId),
]);

export type CrmPipeline = typeof crmPipeline.$inferSelect;
export type NewCrmPipeline = typeof crmPipeline.$inferInsert;
export type CrmPipelineStage = typeof crmPipelineStage.$inferSelect;
export type NewCrmPipelineStage = typeof crmPipelineStage.$inferInsert;

export const modules_crm_pipelinesRelations = defineRelationsPart({ crmPipeline, crmPipelineStage });
