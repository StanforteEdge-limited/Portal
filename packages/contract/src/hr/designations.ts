import { Type, type Static } from '@sinclair/typebox';
import { LongTextSchema } from '../common/primitives';

/* -------------------------------------------------------------------------- */
/* Commands                                                                    */
/* -------------------------------------------------------------------------- */

export const UpsertDesignationSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  code: Type.Optional(Type.String({ maxLength: 50 })),
  description: Type.Optional(LongTextSchema),
  job_description: Type.Optional(LongTextSchema),
});
export type UpsertDesignation = Static<typeof UpsertDesignationSchema>;

/** PATCH body: every field optional so a single attribute can be changed. */
export const UpdateDesignationSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  code: Type.Optional(Type.String({ maxLength: 50 })),
  description: Type.Optional(LongTextSchema),
  job_description: Type.Optional(LongTextSchema),
});
export type UpdateDesignation = Static<typeof UpdateDesignationSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                           */
/* -------------------------------------------------------------------------- */

export const DesignationsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type DesignationsIdParams = Static<typeof DesignationsIdParamsSchema>;
