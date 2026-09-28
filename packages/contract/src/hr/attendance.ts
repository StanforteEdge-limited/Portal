import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema, UuidSchema } from '../common/primitives';

export const AttendanceSourceSchema = Type.Union([
  Type.Literal('web'),
  Type.Literal('mobile'),
  Type.Literal('admin'),
  Type.Literal('import'),
]);
export type AttendanceSource = Static<typeof AttendanceSourceSchema>;

export const AttendanceModeSchema = Type.Union([
  Type.Literal('onsite'),
  Type.Literal('remote'),
  Type.Literal('field'),
]);
export type AttendanceMode = Static<typeof AttendanceModeSchema>;

export const AttendanceCorrectionTypeSchema = Type.Union([
  Type.Literal('clock_in'),
  Type.Literal('clock_out'),
  Type.Literal('mode_change'),
  Type.Literal('location_change'),
]);
export type AttendanceCorrectionType = Static<typeof AttendanceCorrectionTypeSchema>;

export const AttendanceExceptionTypeSchema = Type.Union([
  Type.Literal('missed_punch'),
  Type.Literal('field_assignment'),
  Type.Literal('remote_exception'),
  Type.Literal('excused_absence'),
  Type.Literal('system_override'),
]);
export type AttendanceExceptionType = Static<typeof AttendanceExceptionTypeSchema>;

const LatitudeSchema = Type.Number({ minimum: -90, maximum: 90 });
const LongitudeSchema = Type.Number({ minimum: -180, maximum: 180 });

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/** Records a clock event. The service resolves location and mode server-side. */
export const ClockAttendanceSchema = Type.Object({
  source: Type.Optional(AttendanceSourceSchema),
  /** Client-supplied event time. Defaults to now when omitted. */
  at: Type.Optional(IsoDateOrDateTimeSchema),
  attendance_mode: Type.Optional(AttendanceModeSchema),
  office_location_id: Type.Optional(Type.String()),
  latitude: Type.Optional(LatitudeSchema),
  longitude: Type.Optional(LongitudeSchema),
});
export type ClockAttendance = Static<typeof ClockAttendanceSchema>;

/** Employee-initiated request to amend a recorded attendance event. */
export const CreateAttendanceCorrectionSchema = Type.Object({
  work_date: IsoDateOrDateTimeSchema,
  request_type: AttendanceCorrectionTypeSchema,
  reason: Type.String(),
  proposed_at: Type.Optional(IsoDateOrDateTimeSchema),
  proposed_mode: Type.Optional(AttendanceModeSchema),
  proposed_office_location_id: Type.Optional(Type.String()),
  proposed_latitude: Type.Optional(LatitudeSchema),
  proposed_longitude: Type.Optional(LongitudeSchema),
});
export type CreateAttendanceCorrection = Static<typeof CreateAttendanceCorrectionSchema>;

/** HR-initiated exception, e.g. a missed punch the employee could not report. */
export const CreateAttendanceExceptionSchema = Type.Object({
  user_id: Type.String(),
  work_date: IsoDateOrDateTimeSchema,
  exception_type: AttendanceExceptionTypeSchema,
  reason: Type.String(),
  notes: Type.Optional(Type.String()),
  attendance_mode: Type.Optional(AttendanceModeSchema),
  office_location_id: Type.Optional(Type.String()),
});
export type CreateAttendanceException = Static<typeof CreateAttendanceExceptionSchema>;

export const ReviewAttendanceCorrectionSchema = Type.Object({
  review_notes: Type.Optional(Type.String()),
});
export type ReviewAttendanceCorrection = Static<typeof ReviewAttendanceCorrectionSchema>;

export const ReviewAttendanceExceptionSchema = Type.Object({
  review_notes: Type.Optional(Type.String()),
});
export type ReviewAttendanceException = Static<typeof ReviewAttendanceExceptionSchema>;

/** Creates a location or updates the matching one by name. */
export const UpsertOfficeLocationSchema = Type.Object({
  name: Type.String(),
  address: Type.Optional(Type.String()),
  latitude: Type.Optional(LatitudeSchema),
  longitude: Type.Optional(LongitudeSchema),
  /** Geofence radius in meters. */
  radius_meters: Type.Optional(Type.Number({ minimum: 10 })),
  is_active: Type.Optional(Type.Boolean()),
  organization_ids: Type.Optional(Type.Array(Type.String())),
  primary_organization_id: Type.Optional(Type.String()),
});
export type UpsertOfficeLocation = Static<typeof UpsertOfficeLocationSchema>;

/** Geofenced office location, returned when listing locations. */
export const OfficeLocationSchema = Type.Object({
  id: Type.String(),
  tenant_id: Type.Optional(UuidSchema),
  name: Type.String(),
  address: Type.Optional(Type.String()),
  latitude: Type.Optional(LatitudeSchema),
  longitude: Type.Optional(LongitudeSchema),
  radius_meters: Type.Optional(Type.Number()),
  is_active: Type.Optional(Type.Boolean()),
  primary_organization_id: Type.Optional(Type.String()),
  created_at: Type.Optional(IsoDateOrDateTimeSchema),
  updated_at: Type.Optional(IsoDateOrDateTimeSchema),
});
export type OfficeLocation = Static<typeof OfficeLocationSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const attendanceIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type attendanceIdParams = Static<typeof attendanceIdParamsSchema>;

/**
 * The service reads these filters directly off the parsed query. Values stay
 * untyped strings because the service coerces them itself (`new Date(String())`).
 */
export const AttendanceListQuerySchema = Type.Object({
  from: Type.Optional(Type.String()),
  to: Type.Optional(Type.String()),
  user_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  org_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  mine: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type AttendanceListQuery = Static<typeof AttendanceListQuerySchema>;
