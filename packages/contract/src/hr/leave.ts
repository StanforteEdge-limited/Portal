import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema } from '../common/primitives';

export const LeaveStatusSchema = Type.Union([
  Type.Literal('approved'),
  Type.Literal('rejected'),
]);
export type LeaveStatus = Static<typeof LeaveStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Leave types                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `metadata` is a JSON-encoded string rather than an object, matching the
 * existing column type on `leave_types`.
 */
export const CreateLeaveTypeSchema = Type.Object({
  code: Type.String({ maxLength: 50 }),
  name: Type.String({ maxLength: 120 }),
  annual_entitlement_days: Type.Integer({ minimum: 0 }),
  metadata: Type.Optional(Type.String()),
});
export type CreateLeaveType = Static<typeof CreateLeaveTypeSchema>;

/* -------------------------------------------------------------------------- */
/* Leave requests                                                             */
/* -------------------------------------------------------------------------- */

export const CreateLeaveRequestSchema = Type.Object({
  leave_type_id: Type.String(),
  start_date: IsoDateOrDateTimeSchema,
  end_date: IsoDateOrDateTimeSchema,
  reason: Type.String({ minLength: 3, maxLength: 2000 }),
});
export type CreateLeaveRequest = Static<typeof CreateLeaveRequestSchema>;

/** Approve or reject. The service computes the deducted balance on approve. */
export const ReviewLeaveRequestSchema = Type.Object({
  status: LeaveStatusSchema,
  notes: Type.Optional(Type.String({ maxLength: 2000 })),
});
export type ReviewLeaveRequest = Static<typeof ReviewLeaveRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const leaveIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type leaveIdParams = Static<typeof leaveIdParamsSchema>;
