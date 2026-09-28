import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema } from '../common/primitives';

export const UpsertCrmLeadSchema = Type.Object({
  first_name: Type.String(),
  last_name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  company: Type.Optional(Type.String()),
  /** Where the lead came from, e.g. `web`, `referral`. Free-form. */
  source: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  score: Type.Optional(Type.Integer()),
  owner_profile_id: Type.Optional(IdSchema),
});
export type UpsertCrmLead = Static<typeof UpsertCrmLeadSchema>;

/**
 * Turns a lead into an account plus contact. Either `account_name` (create a
 * new account) or `account_id` (attach to an existing one) identifies the
 * target account.
 */
export const ConvertLeadSchema = Type.Object({
  account_name: Type.Optional(Type.String()),
  account_id: Type.Optional(IdSchema),
  industry: Type.Optional(Type.String()),
});
export type ConvertLead = Static<typeof ConvertLeadSchema>;
