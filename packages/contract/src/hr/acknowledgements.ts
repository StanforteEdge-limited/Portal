import { Type, type Static } from '@sinclair/typebox';
import { LongTextSchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/** Records that a user has read a policy or document at a given version. */
export const CreateAcknowledgementSchema = Type.Object({
  /** What was acknowledged, e.g. `policy`, `document`, `handbook`. */
  subject_type: Type.String({ maxLength: 60 }),
  subject_id: Type.String({ maxLength: 191 }),
  /** Denormalized label, so the list renders without a join. */
  subject_label: Type.Optional(Type.String({ maxLength: 255 })),
  version: Type.Optional(Type.String({ maxLength: 60 })),
  source_form_submission_id: Type.Optional(Type.String()),
  metadata: Type.Optional(MetadataSchema),
});
export type CreateAcknowledgement = Static<typeof CreateAcknowledgementSchema>;

/** Withdraws a prior acknowledgement, e.g. when a policy version is superseded. */
export const RevokeAcknowledgementSchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 255 })),
});
export type RevokeAcknowledgement = Static<typeof RevokeAcknowledgementSchema>;

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

export const ListAcknowledgementsQuerySchema = Type.Object({
  subject_type: Type.Optional(Type.String()),
  subject_id: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  user_id: Type.Optional(Type.String()),
  page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
  per_page: Type.Optional(Type.String({ pattern: '^\\d+$' })),
});
export type ListAcknowledgementsQuery = Static<typeof ListAcknowledgementsQuerySchema>;

/** Alias kept so the service's `ListAcknowledgements` import keeps working. */
export type ListAcknowledgements = ListAcknowledgementsQuery;

export const AcknowledgementsListQuerySchema = ListAcknowledgementsQuerySchema;

/** Free-form text field, re-exported for symmetry with other HR features. */
export const AcknowledgementNotesSchema = LongTextSchema;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const acknowledgementsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type acknowledgementsIdParams = Static<typeof acknowledgementsIdParamsSchema>;
