import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IdSchema } from '../common/primitives';

export const UpsertCrmAccountSchema = Type.Object({
  name: Type.String(),
  industry: Type.Optional(Type.String()),
  website: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  /** Free-form account type, e.g. `customer`, `prospect`. Not a closed enum. */
  type: Type.Optional(Type.String()),
  lifecycle_stage: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  owner_profile_id: Type.Optional(IdSchema),
});
export type UpsertCrmAccount = Static<typeof UpsertCrmAccountSchema>;
