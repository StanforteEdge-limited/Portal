import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema } from '../common/primitives';

/**
 * Timesheets are their own module. Payroll consumes approved hours to drive
 * `hourly_timesheet` earnings, but the entries themselves are owned here.
 */
export const TimesheetStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('submitted'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
]);
export type TimesheetStatus = Static<typeof TimesheetStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Timesheet entries                                                          */
/* -------------------------------------------------------------------------- */

export const UpsertTimesheetEntrySchema = Type.Object({
  worker_id: Type.String(),
  component_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  work_date: IsoDateOrDateTimeSchema,
  hours: Type.Number({ minimum: 0, maximum: 24 }),
  description: Type.Optional(Type.String()),
  status: Type.Optional(TimesheetStatusSchema),
});
export type UpsertTimesheetEntry = Static<typeof UpsertTimesheetEntrySchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const TimesheetIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type TimesheetIdParams = Static<typeof TimesheetIdParamsSchema>;

export const TimesheetListQuerySchema = Type.Object({
  worker_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  status: Type.Optional(TimesheetStatusSchema),
  from: Type.Optional(IsoDateOrDateTimeSchema),
  to: Type.Optional(IsoDateOrDateTimeSchema),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type TimesheetListQuery = Static<typeof TimesheetListQuerySchema>;

/**
 * Filters for the self-service rollup, which is derived from the caller's own
 * work logs rather than from stored timesheet entries.
 */
export const TimesheetSummaryQuerySchema = Type.Object({
  from: Type.Optional(IsoDateOrDateTimeSchema),
  to: Type.Optional(IsoDateOrDateTimeSchema),
});
export type TimesheetSummaryQuery = Static<typeof TimesheetSummaryQuerySchema>;
