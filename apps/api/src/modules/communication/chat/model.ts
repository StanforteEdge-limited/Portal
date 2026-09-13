import { defineRelationsPart } from 'drizzle-orm';
import { bigint, bigserial, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '$modules/tenancy/model';
import { profile } from '$modules/identity/users/model';
import { fileAsset } from '$modules/storage/model';

export const chatConversation = pgTable("sta_chat_conversations", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).default("direct").notNull(),
  name: varchar("name", { length: 160 }),
  description: text("description"),
  createdBy: bigint("created_by", { mode: 'bigint' }).references(() => profile.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("chat_conversation_index_tenantId").on(table.tenantId),
  index("chat_conversation_index_createdBy").on(table.createdBy),
]);

export const chatConversationMember = pgTable("sta_chat_conversation_members", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  conversationId: bigint("conversation_id", { mode: 'bigint' }).notNull().references(() => chatConversation.id, { onDelete: 'cascade' }),
  profileId: bigint("profile_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  lastReadAt: timestamp("last_read_at", { mode: 'date', precision: 6 }),
  joinedAt: timestamp("joined_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("chat_member_conversation_profile_unique").on(table.conversationId, table.profileId),
  index("chat_member_index_tenantId").on(table.tenantId),
  index("chat_member_index_profileId").on(table.profileId),
]);

export const chatMessage = pgTable("sta_chat_messages", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  conversationId: bigint("conversation_id", { mode: 'bigint' }).notNull().references(() => chatConversation.id, { onDelete: 'cascade' }),
  senderProfileId: bigint("sender_profile_id", { mode: 'bigint' }).notNull().references(() => profile.id, { onDelete: 'cascade' }),
  body: text("body"),
  replyToMessageId: bigint("reply_to_message_id", { mode: 'bigint' }).references(() => chatMessage.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'date', precision: 6 }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("chat_message_index_tenantId").on(table.tenantId),
  index("chat_message_index_conversationId_createdAt").on(table.conversationId, table.createdAt),
  index("chat_message_index_senderProfileId").on(table.senderProfileId),
]);

export const chatMessageAttachment = pgTable("sta_chat_message_attachments", {
  id: bigserial("id", { mode: 'bigint' }).primaryKey(),
  tenantId: bigint("tenant_id", { mode: 'bigint' }).notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  messageId: bigint("message_id", { mode: 'bigint' }).notNull().references(() => chatMessage.id, { onDelete: 'cascade' }),
  fileAssetId: uuid("file_asset_id").notNull().references(() => fileAsset.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { mode: 'date', precision: 6 }).defaultNow().notNull(),
}, (table) => [
  index("chat_attachment_index_tenantId").on(table.tenantId),
  index("chat_attachment_index_messageId").on(table.messageId),
  index("chat_attachment_index_fileAssetId").on(table.fileAssetId),
]);

export type ChatConversation = typeof chatConversation.$inferSelect;
export type NewChatConversation = typeof chatConversation.$inferInsert;
export type ChatConversationMember = typeof chatConversationMember.$inferSelect;
export type NewChatConversationMember = typeof chatConversationMember.$inferInsert;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type ChatMessageAttachment = typeof chatMessageAttachment.$inferSelect;
export type NewChatMessageAttachment = typeof chatMessageAttachment.$inferInsert;

export const modules_communicationRelations = defineRelationsPart({
  chatConversation, chatConversationMember, chatMessage, chatMessageAttachment, profile, tenant, fileAsset,
}, (r) => ({
  chatConversation: {
    tenant: r.one.tenant({ from: r.chatConversation.tenantId, to: r.tenant.id, optional: false }),
    createdByProfile: r.one.profile({ from: r.chatConversation.createdBy, to: r.profile.id }),
  },
  chatConversationMember: {
    tenant: r.one.tenant({ from: r.chatConversationMember.tenantId, to: r.tenant.id, optional: false }),
    conversation: r.one.chatConversation({ from: r.chatConversationMember.conversationId, to: r.chatConversation.id, optional: false }),
    profile: r.one.profile({ from: r.chatConversationMember.profileId, to: r.profile.id, optional: false }),
  },
  chatMessage: {
    tenant: r.one.tenant({ from: r.chatMessage.tenantId, to: r.tenant.id, optional: false }),
    conversation: r.one.chatConversation({ from: r.chatMessage.conversationId, to: r.chatConversation.id, optional: false }),
    sender: r.one.profile({ from: r.chatMessage.senderProfileId, to: r.profile.id, optional: false }),
    replyToMessage: r.one.chatMessage({ from: r.chatMessage.replyToMessageId, to: r.chatMessage.id }),
  },
  chatMessageAttachment: {
    tenant: r.one.tenant({ from: r.chatMessageAttachment.tenantId, to: r.tenant.id, optional: false }),
    message: r.one.chatMessage({ from: r.chatMessageAttachment.messageId, to: r.chatMessage.id, optional: false }),
    fileAsset: r.one.fileAsset({ from: r.chatMessageAttachment.fileAssetId, to: r.fileAsset.id, optional: false }),
  },
}));