import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema } from '../common/primitives';

export const UpsertCrmContactSchema = Type.Object({
  first_name: Type.String(),
  last_name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  job_title: Type.Optional(Type.String()),
  account_id: Type.Optional(IdSchema),
  /** Marks the contact as the account's main point of contact. */
  is_primary: Type.Optional(Type.Boolean()),
});
export type UpsertCrmContact = Static<typeof UpsertCrmContactSchema>;
