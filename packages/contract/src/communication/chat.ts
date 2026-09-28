import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, LongTextSchema } from '../common/primitives';

export const CreateConversationSchema = Type.Object({
  type: Type.Union([Type.Literal('direct'), Type.Literal('group')], {
    default: 'direct',
  }),
  name: Type.Optional(Type.String()),
  description: Type.Optional(LongTextSchema),
  member_ids: Type.Array(IdSchema),
});
export type CreateConversation = Static<typeof CreateConversationSchema>;

/**
 * Posts a message to a conversation.
 *
 * `body` is only required when no attachments are supplied — the legacy DTO
 * enforced that with `@ValidateIf`. Expressing it here would mean a
 * conditional schema that Fastify cannot branch on per-attachment, so the rule
 * stays a documented service-level check rather than a silently weaker
 * validator.
 */
export const SendChatMessageSchema = Type.Object({
  body: Type.Optional(LongTextSchema),
  file_asset_ids: Type.Optional(Type.Array(IdSchema)),
  reply_to_message_id: Type.Optional(IdSchema),
});
export type SendChatMessage = Static<typeof SendChatMessageSchema>;

/** Changes a conversation member's role. */
export const UpdateChatMemberSchema = Type.Object({
  role: Type.Union([Type.Literal('admin'), Type.Literal('member')]),
});
export type UpdateChatMember = Static<typeof UpdateChatMemberSchema>;
