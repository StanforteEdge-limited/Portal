import { Type, type Static } from '@sinclair/typebox';
import { EmailSchema, IsoDateOrDateTimeSchema } from '../common/primitives';
import { MetadataSchema } from '../common/refs';

export const EmploymentTypeSchema = Type.Union([
  Type.Literal('full_time'),
  Type.Literal('contract'),
  Type.Literal('intern'),
  Type.Literal('consultant'),
]);
export type EmploymentType = Static<typeof EmploymentTypeSchema>;

export const EmploymentStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
  Type.Literal('suspended'),
  Type.Literal('exited'),
]);
export type EmploymentStatus = Static<typeof EmploymentStatusSchema>;

export const WorkModeSchema = Type.Union([
  Type.Literal('onsite'),
  Type.Literal('hybrid'),
  Type.Literal('remote'),
]);
export type WorkMode = Static<typeof WorkModeSchema>;

export const EmployeeTeamRoleSchema = Type.Union([
  Type.Literal('member'),
  Type.Literal('lead'),
  Type.Literal('manager'),
]);
export type EmployeeTeamRole = Static<typeof EmployeeTeamRoleSchema>;

export const EmployeeActionTypeSchema = Type.Union([
  Type.Literal('activate'),
  Type.Literal('suspend'),
  Type.Literal('exit'),
]);
export type EmployeeActionType = Static<typeof EmployeeActionTypeSchema>;

/* -------------------------------------------------------------------------- */
/* Employee records                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Every field is optional: the service upserts on `user_id` and merges only the
 * keys present in the payload. The three enums were `as const` arrays in the
 * legacy DTO and are recovered here as literal unions.
 */
export const UpsertEmployeeSchema = Type.Object({
  user_id: Type.Optional(Type.String()),
  first_name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  last_name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  username: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(Type.String()),
  employee_code: Type.Optional(Type.String()),
  job_title: Type.Optional(Type.String()),
  job_description: Type.Optional(Type.String()),
  manager_user_id: Type.Optional(Type.String()),
  employment_type: Type.Optional(EmploymentTypeSchema),
  employment_status: Type.Optional(EmploymentStatusSchema),
  work_mode: Type.Optional(WorkModeSchema),
  hire_date: Type.Optional(IsoDateOrDateTimeSchema),
  confirmation_date: Type.Optional(IsoDateOrDateTimeSchema),
  exit_date: Type.Optional(IsoDateOrDateTimeSchema),
  primary_team_id: Type.Optional(Type.String()),
  primary_organization_id: Type.Optional(Type.String()),
  designation_id: Type.Optional(Type.String()),
  roles: Type.Optional(Type.Array(Type.String())),
  metadata: Type.Optional(MetadataSchema),
});
export type UpsertEmployee = Static<typeof UpsertEmployeeSchema>;

/** Lifecycle transition, e.g. suspending an employee. */
export const EmployeeActionSchema = Type.Object({
  action: EmployeeActionTypeSchema,
  effective_date: Type.Optional(IsoDateOrDateTimeSchema),
  notes: Type.Optional(Type.String()),
});
export type EmployeeAction = Static<typeof EmployeeActionSchema>;

/* -------------------------------------------------------------------------- */
/* Org and team links                                                         */
/* -------------------------------------------------------------------------- */

export const AssignEmployeeOrganizationSchema = Type.Object({
  organization_id: Type.String(),
  is_primary: Type.Optional(Type.Boolean()),
});
export type AssignEmployeeOrganization = Static<typeof AssignEmployeeOrganizationSchema>;

export const AssignEmployeeTeamSchema = Type.Object({
  team_id: Type.String(),
  role: Type.Optional(EmployeeTeamRoleSchema),
});
export type AssignEmployeeTeam = Static<typeof AssignEmployeeTeamSchema>;

export const SetPrimaryOrganizationSchema = Type.Object({
  organization_id: Type.String(),
});
export type SetPrimaryOrganization = Static<typeof SetPrimaryOrganizationSchema>;

/* -------------------------------------------------------------------------- */
/* Onboarding form assignments                                                */
/* -------------------------------------------------------------------------- */

export const AssignOnboardingFormSchema = Type.Object({
  form_id: Type.String(),
  profile_id: Type.Optional(Type.String()),
  role_slug: Type.Optional(Type.String()),
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
});
export type AssignOnboardingForm = Static<typeof AssignOnboardingFormSchema>;

/** All-optional counterpart: narrows an existing assignment. */
export const UpdateOnboardingFormAssignmentSchema = Type.Object({
  form_id: Type.Optional(Type.String()),
  profile_id: Type.Optional(Type.String()),
  role_slug: Type.Optional(Type.String()),
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
});
export type UpdateOnboardingFormAssignment = Static<
  typeof UpdateOnboardingFormAssignmentSchema
>;

/* -------------------------------------------------------------------------- */
/* Leave balance                                                              */
/* -------------------------------------------------------------------------- */

/** Manual adjustment to a leave balance. `delta_days` may be negative. */
export const AdjustLeaveBalanceSchema = Type.Object({
  user_id: Type.String(),
  leave_type_key: Type.String({ maxLength: 100 }),
  period_year: Type.Integer(),
  delta_days: Type.Number(),
  entry_type: Type.Optional(Type.String({ maxLength: 30 })),
  notes: Type.Optional(Type.String()),
});
export type AdjustLeaveBalance = Static<typeof AdjustLeaveBalanceSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const EmployeesIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type EmployeesIdParams = Static<typeof EmployeesIdParamsSchema>;

/** Filters read by the employee list service. */
export const EmployeesListQuerySchema = Type.Object({
  user_id: Type.Optional(Type.String()),
  profile_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  role_slug: Type.Optional(Type.String()),
  form_id: Type.Optional(Type.String()),
  employment_type: Type.Optional(Type.String()),
  employment_status: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  year: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  per_page: Type.Optional(Type.String()),
});
export type EmployeesListQuery = Static<typeof EmployeesListQuerySchema>;
