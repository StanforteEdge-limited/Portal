import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema, LongTextSchema } from '../common/primitives';

/**
 * Sends an outbound mail through the connected provider account.
 *
 * Named `SendMailMessage` rather than `SendMessage` to stay distinct from the
 * chat module's identically shaped command.
 */
export const SendMailMessageSchema = Type.Object({
  to: EmailSchema,
  cc: Type.Optional(Type.Array(EmailSchema)),
  subject: Type.String(),
  /** HTML body content. */
  body: LongTextSchema,
  /** Provider-side UID being replied to, which threads the conversation. */
  inReplyToUid: Type.Optional(Type.String()),
  /** Mailbox folder to append the sent copy to. */
  folder: Type.Optional(Type.String()),
});
export type SendMailMessage = Static<typeof SendMailMessageSchema>;

/** Outcome of syncing one mailbox folder of one account. */
export const SyncResultSchema = Type.Object({
  accountId: IdSchema,
  folder: Type.String(),
  newCount: Type.Number(),
  error: Type.Optional(Type.String()),
});
export type SyncResult = Static<typeof SyncResultSchema>;
