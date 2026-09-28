import { Type, type Static } from '@sinclair/typebox';
import { IdSchema, PaginationQuerySchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Filters for the audit event list. `from`/`to` stay free-form strings because
 * the service feeds them to `new Date()` and rejects unparseable values with a
 * 400 rather than at the validation layer.
 */
export const AuditListQuerySchema = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({
    action: Type.Optional(Type.String()),
    entity_type: Type.Optional(Type.String()),
    entity_id: Type.Optional(IdSchema),
    actor_id: Type.Optional(IdSchema),
    from: Type.Optional(Type.String()),
    to: Type.Optional(Type.String()),
  }),
]);
export type AuditListQuery = Static<typeof AuditListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export const CreateAuditEventSchema = Type.Object({
  entity_type: Type.String(),
  entity_id: Type.String(),
  action: Type.String(),
  comment: Type.Optional(Type.String()),
  /** Arbitrary payload describing the change. */
  data: Type.Optional(MetadataSchema),
});
export type CreateAuditEvent = Static<typeof CreateAuditEventSchema>;
