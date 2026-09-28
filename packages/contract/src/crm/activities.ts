import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, IsoDateTimeSchema, LongTextSchema } from '../common/primitives';

export const UpsertCrmActivitySchema = Type.Object({
  subject: Type.String(),
  /** Free-form activity type, e.g. `call`, `email`, `meeting`. */
  type: Type.Optional(Type.String()),
  description: Type.Optional(LongTextSchema),
  account_id: Type.Optional(IdSchema),
  contact_id: Type.Optional(IdSchema),
  opportunity_id: Type.Optional(IdSchema),
  due_at: Type.Optional(IsoDateTimeSchema),
  /** Set when the activity is completed. */
  done_at: Type.Optional(IsoDateTimeSchema),
});
export type UpsertCrmActivity = Static<typeof UpsertCrmActivitySchema>;
