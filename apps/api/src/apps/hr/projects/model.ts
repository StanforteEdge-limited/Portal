import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, boolean, date, doublePrecision, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { groupUserRoleEnum } from '$apps/communication/groups/model';
import { profile } from '$apps/identity/users/model';
import { fileAsset } from '$apps/storage/model';
import { tenant } from '$apps/tenancy/model';

export const project = pgTable("sta_projects", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).references(() => tenant.id, { onDelete: 'cascade' }),
  organizationId: bigint("organization_id", { mode: 'bigint' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: bigint("created_by", { mode: 'bigint' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
    index("project_index_tenantId").on(table.tenantId),
    index("project_index_organizationId").on(table.organizationId),
    index("project_index_isActive").on(table.isActive),
]);

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;

export const projectGovernance = pgTable("sta_project_governance", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull().unique(),
  projectCode: varchar("project_code", { length: 50 }),
  ownerUserId: bigint("owner_user_id", { mode: 'bigint' }),
  startDate: date("start_date", { mode: 'date' }),
  endDate: date("end_date", { mode: 'date' }),
  governanceStatus: varchar("governance_status", { length: 30 }).default("planned").notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
    index("projectGovernance_index_ownerUserId").on(table.ownerUserId),
    index("projectGovernance_index_governanceStatus").on(table.governanceStatus),
]);

export type ProjectGovernance = typeof projectGovernance.$inferSelect;
export type NewProjectGovernance = typeof projectGovernance.$inferInsert;

export const projectMember = pgTable("sta_project_members", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull(),
  userId: bigint("user_id", { mode: 'bigint' }).notNull(),
  role: groupUserRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  addedBy: bigint("added_by", { mode: 'bigint' }),
  isPrimary: boolean("is_primary").default(false).notNull(),
}, (table) => [
    uniqueIndex("unique_project_user").on(table.projectId, table.userId),
    index("projectMember_index_userId").on(table.userId),
    index("projectMember_index_role").on(table.role),
]);

export type ProjectMember = typeof projectMember.$inferSelect;
export type NewProjectMember = typeof projectMember.$inferInsert;

export const projectCard = pgTable("sta_project_cards", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  projectId: bigint("project_id", { mode: 'bigint' }).notNull().references(() => project.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("todo").notNull(),
  position: numeric("position", { precision: 20, scale: 6 }).default("0").notNull(),
  color: varchar("color", { length: 40 }),
  tags: jsonb("tags"),
  assignedToId: bigint("assigned_to_id", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  dueDate: date("due_date", { mode: 'date' }),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  updatedBy: bigint("updated_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("projectCard_index_tenantId_projectId").on(table.tenantId, table.projectId),
  index("projectCard_index_projectId_status_position").on(table.projectId, table.status, table.position),
  index("projectCard_index_assignedToId").on(table.assignedToId),
]);

export type ProjectCard = typeof projectCard.$inferSelect;
export type NewProjectCard = typeof projectCard.$inferInsert;

export const projectCardAttachment = pgTable("sta_project_card_attachments", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  cardId: uuid("card_id").notNull().references(() => projectCard.id, { onDelete: 'cascade' }),
  fileAssetId: uuid("file_asset_id").notNull().references(() => fileAsset.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 150 }),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_card_attachment_card_file_unique").on(table.cardId, table.fileAssetId),
  index("projectCardAttachment_index_tenantId").on(table.tenantId),
  index("projectCardAttachment_index_cardId").on(table.cardId),
  index("projectCardAttachment_index_fileAssetId").on(table.fileAssetId),
]);

export type ProjectCardAttachment = typeof projectCardAttachment.$inferSelect;
export type NewProjectCardAttachment = typeof projectCardAttachment.$inferInsert;

export const projectCardUpdate = pgTable("sta_project_card_updates", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  cardId: uuid("card_id").notNull().references(() => projectCard.id, { onDelete: 'cascade' }),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("projectCardUpdate_index_tenantId").on(table.tenantId),
  index("projectCardUpdate_index_cardId_createdAt").on(table.cardId, table.createdAt),
  index("projectCardUpdate_index_createdBy").on(table.createdBy),
]);

export type ProjectCardUpdate = typeof projectCardUpdate.$inferSelect;
export type NewProjectCardUpdate = typeof projectCardUpdate.$inferInsert;

export const projectCardUpdateMention = pgTable("sta_project_card_update_mentions", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  updateId: bigint("update_id", { mode: 'bigint' }).notNull().references(() => projectCardUpdate.id, { onDelete: 'cascade' }),
  userId: bigint("user_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_card_update_mention_unique").on(table.updateId, table.userId),
  index("projectCardUpdateMention_index_tenantId").on(table.tenantId),
  index("projectCardUpdateMention_index_userId").on(table.userId),
]);

export type ProjectCardUpdateMention = typeof projectCardUpdateMention.$inferSelect;
export type NewProjectCardUpdateMention = typeof projectCardUpdateMention.$inferInsert;

export const modules_hrm_projectsRelations = defineRelationsPart({
  project,
  projectGovernance,
  projectMember,
  projectCard,
  projectCardAttachment,
  projectCardUpdate,
  projectCardUpdateMention,
});
