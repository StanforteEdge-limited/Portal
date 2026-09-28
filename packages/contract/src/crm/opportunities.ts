import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, IsoDateTimeSchema } from '../common/primitives';

export const UpsertCrmOpportunitySchema = Type.Object({
  name: Type.String(),
  account_id: Type.Optional(IdSchema),
  contact_id: Type.Optional(IdSchema),
  pipeline_id: Type.Optional(IdSchema),
  stage_id: Type.Optional(IdSchema),
  owner_profile_id: Type.Optional(IdSchema),
  /** Deal value in `currency`. */
  amount: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String()),
  /** Win likelihood, 0-1 in the legacy model; not range-constrained at the edge. */
  probability: Type.Optional(Type.Number()),
  expected_close_date: Type.Optional(IsoDateTimeSchema),
  source: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
});
export type UpsertCrmOpportunity = Static<typeof UpsertCrmOpportunitySchema>;
