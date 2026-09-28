import { Type, type Static } from '@sinclair/typebox';
import { IsoDateOrDateTimeSchema } from '../common/primitives';

export const SprintStatusSchema = Type.Union([
  Type.Literal('planned'),
  Type.Literal('active'),
  Type.Literal('completed'),
]);
export type SprintStatus = Static<typeof SprintStatusSchema>;

export const WorkItemTypeSchema = Type.Union([
  Type.Literal('weekly_task'),
  Type.Literal('daily_task'),
  Type.Literal('project_activity'),
  Type.Literal('recurring_responsibility'),
  Type.Literal('ad_hoc'),
]);
export type WorkItemType = Static<typeof WorkItemTypeSchema>;

export const WorkItemStatusSchema = Type.Union([
  Type.Literal('planned'),
  Type.Literal('in_progress'),
  Type.Literal('completed'),
  Type.Literal('blocked'),
  Type.Literal('carried_over'),
  Type.Literal('cancelled'),
]);
export type WorkItemStatus = Static<typeof WorkItemStatusSchema>;

export const WorkPrioritySchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('critical'),
]);
export type WorkPriority = Static<typeof WorkPrioritySchema>;

/* -------------------------------------------------------------------------- */
/* Sprints                                                                    */
/* -------------------------------------------------------------------------- */

export const UpsertSprintSchema = Type.Object({
  name: Type.String({ maxLength: 255 }),
  goal: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  start_date: Type.Optional(IsoDateOrDateTimeSchema),
  end_date: Type.Optional(IsoDateOrDateTimeSchema),
  status: Type.Optional(SprintStatusSchema),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpsertSprint = Static<typeof UpsertSprintSchema>;

/* -------------------------------------------------------------------------- */
/* OKR                                                                        */
/* -------------------------------------------------------------------------- */

export const UpsertTeamGoalSchema = Type.Object({
  title: Type.String({ maxLength: 255 }),
  description: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  owner_user_id: Type.Optional(Type.String()),
  period_year: Type.Integer(),
  period_type: Type.Optional(Type.String()),
  period_label: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  weight: Type.Optional(Type.Number({ minimum: 0 })),
  start_date: Type.Optional(IsoDateOrDateTimeSchema),
  end_date: Type.Optional(IsoDateOrDateTimeSchema),
});
export type UpsertTeamGoal = Static<typeof UpsertTeamGoalSchema>;

export const UpsertTeamObjectiveSchema = Type.Object({
  title: Type.String({ maxLength: 255 }),
  description: Type.Optional(Type.String()),
  goal_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  owner_user_id: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  weight: Type.Optional(Type.Number({ minimum: 0 })),
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
});
export type UpsertTeamObjective = Static<typeof UpsertTeamObjectiveSchema>;

export const UpsertTeamKpiSchema = Type.Object({
  title: Type.String({ maxLength: 255 }),
  description: Type.Optional(Type.String()),
  goal_id: Type.Optional(Type.String()),
  objective_id: Type.Optional(Type.String()),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  owner_user_id: Type.Optional(Type.String()),
  target_type: Type.Optional(Type.String()),
  target_value: Type.Optional(Type.Number({ minimum: 0 })),
  unit_label: Type.Optional(Type.String()),
  period_year: Type.Optional(Type.Integer()),
  quarter: Type.Optional(Type.Integer()),
  status: Type.Optional(Type.String()),
  weight: Type.Optional(Type.Number({ minimum: 0 })),
});
export type UpsertTeamKpi = Static<typeof UpsertTeamKpiSchema>;

/* -------------------------------------------------------------------------- */
/* Work items                                                                 */
/* -------------------------------------------------------------------------- */

export const UpsertWorkItemSchema = Type.Object({
  title: Type.String({ maxLength: 255 }),
  description: Type.Optional(Type.String()),
  item_type: Type.Optional(WorkItemTypeSchema),
  status: Type.Optional(WorkItemStatusSchema),
  priority: Type.Optional(WorkPrioritySchema),
  organization_id: Type.Optional(Type.String()),
  owner_team_id: Type.Optional(Type.String()),
  secondary_team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  sprint_id: Type.Optional(Type.String()),
  /** Self-referencing, for subtasks. */
  parent_id: Type.Optional(Type.String()),
  estimate_points: Type.Optional(Type.Number({ minimum: 0 })),
  sort_order: Type.Optional(Type.Number()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
  assigned_to_id: Type.Optional(Type.String()),
  planned_start_date: Type.Optional(IsoDateOrDateTimeSchema),
  due_date: Type.Optional(IsoDateOrDateTimeSchema),
  week_start_date: Type.Optional(IsoDateOrDateTimeSchema),
  expected_hours: Type.Optional(Type.Number({ minimum: 0 })),
  is_staff_added: Type.Optional(Type.Boolean()),
  requires_manager_ack: Type.Optional(Type.Boolean()),
  goal_id: Type.Optional(Type.String()),
  objective_id: Type.Optional(Type.String()),
  kpi_id: Type.Optional(Type.String()),
});
export type UpsertWorkItem = Static<typeof UpsertWorkItemSchema>;

/* -------------------------------------------------------------------------- */
/* Work logs                                                                  */
/* -------------------------------------------------------------------------- */

/** Daily time and progress entry against a work item. */
export const UpsertWorkLogSchema = Type.Object({
  work_item_id: Type.String({ format: 'uuid' }),
  log_date: IsoDateOrDateTimeSchema,
  hours_spent: Type.Optional(Type.Number({ minimum: 0, maximum: 24 })),
  status: Type.Optional(WorkItemStatusSchema),
  progress_percent: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  note: Type.Optional(Type.String()),
  blocker_note: Type.Optional(Type.String()),
  carried_over: Type.Optional(Type.Boolean()),
  carry_over_to_date: Type.Optional(IsoDateOrDateTimeSchema),
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  fund_id: Type.Optional(Type.String()),
  grant_id: Type.Optional(Type.String()),
});
export type UpsertWorkLog = Static<typeof UpsertWorkLogSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const TasksIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type TasksIdParams = Static<typeof TasksIdParamsSchema>;

/** Filters read by the work-item and work-log list services. */
export const TasksListQuerySchema = Type.Object({
  organization_id: Type.Optional(Type.String()),
  team_id: Type.Optional(Type.String()),
  project_id: Type.Optional(Type.String()),
  sprint_id: Type.Optional(Type.String()),
  parent_id: Type.Optional(Type.String()),
  assigned_to_id: Type.Optional(Type.String()),
  staff_id: Type.Optional(Type.String()),
  goal_id: Type.Optional(Type.String()),
  objective_id: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  approval_status: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.String()),
  period_year: Type.Optional(Type.String()),
  week_start_date: Type.Optional(Type.String()),
  from: Type.Optional(Type.String()),
  to: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
});
export type TasksListQuery = Static<typeof TasksListQuerySchema>;
