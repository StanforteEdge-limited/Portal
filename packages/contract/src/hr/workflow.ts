import { Type, type Static } from '@sinclair/typebox';
import { MetadataSchema } from '../common/refs';

/* -------------------------------------------------------------------------- */
/* Approver resolution                                                         */
/* -------------------------------------------------------------------------- */

/**
 * How a step decides who may act on it. Shared because the same step config is
 * resolved on the API and rendered in the web and desktop clients, and the two
 * must agree on what a step means.
 *
 * - `role`      a role slug the actor must hold
 * - `permission` a permission the actor must hold (`finance.approve`)
 * - `relation`  resolved against the requester (`requester_team_lead`)
 * - `office`    a named office holder (`coo`)
 */
export const WorkflowApproverTypeSchema = Type.Union([
  Type.Literal('role'),
  Type.Literal('permission'),
  Type.Literal('relation'),
  Type.Literal('office'),
]);
export type WorkflowApproverType = Static<typeof WorkflowApproverTypeSchema>;

export const WorkflowConditionOperatorSchema = Type.Union([
  Type.Literal('equals'),
  Type.Literal('not_equals'),
  Type.Literal('greater_than'),
  Type.Literal('less_than'),
  Type.Literal('contains'),
]);
export type WorkflowConditionOperator = Static<typeof WorkflowConditionOperatorSchema>;

export const WorkflowStepConditionSchema = Type.Object({
  field: Type.String(),
  operator: WorkflowConditionOperatorSchema,
  value: Type.Unknown(),
});
export type WorkflowStepCondition = Static<typeof WorkflowStepConditionSchema>;

/**
 * One step of an approval flow, as stored in a request type's
 * `approval_flow_json` or sent by a client.
 *
 * `approver` is the current shape; `approver_type`/`approver_id` are the flat
 * equivalents and both are accepted. A step that names neither falls back to
 * the `role` field.
 */
export const WorkflowStepConfigSchema = Type.Object({
  role: Type.Optional(Type.String()),
  action: Type.Optional(Type.String()),
  min_amount: Type.Optional(Type.Number()),
  approval_limit: Type.Optional(Type.Number()),
  approver_type: Type.Optional(WorkflowApproverTypeSchema),
  approver_id: Type.Optional(Type.String()),
  approver: Type.Optional(
    Type.Object({
      type: Type.Optional(WorkflowApproverTypeSchema),
      value: Type.Optional(Type.String()),
    }),
  ),
  conditions: Type.Optional(Type.Array(WorkflowStepConditionSchema)),
});
export type WorkflowStepConfig = Static<typeof WorkflowStepConfigSchema>;

/** A step's approver after `approver`/`approver_type`/`role` are resolved. */
export const NormalizedWorkflowApproverSchema = Type.Object({
  approverType: WorkflowApproverTypeSchema,
  approverId: Type.String(),
});
export type NormalizedWorkflowApprover = Static<typeof NormalizedWorkflowApproverSchema>;

/**
 * The workflow feature exposes no client-driven workflow *definition* — those
 * are seeded per module. What a client needs is to start a flow for an entity
 * and act on a running instance, so the contract covers only those commands.
 */

export const StartWorkflowForEntitySchema = Type.Object({
  entity_id: Type.String(),
  entity_type: Type.String(),
  approval_flow: MetadataSchema,
  name: Type.Optional(Type.String({ maxLength: 255 })),
  amount: Type.Optional(Type.Number()),
  data: Type.Optional(MetadataSchema),
});
export type StartWorkflowForEntity = Static<typeof StartWorkflowForEntitySchema>;

/** Decision on the instance's current step. `performed_by` comes from the token. */
export const ProcessWorkflowDecisionSchema = Type.Object({
  action: Type.Union([Type.Literal('approve'), Type.Literal('reject')]),
  comment: Type.Optional(Type.String({ maxLength: 2000 })),
});
export type ProcessWorkflowDecision = Static<typeof ProcessWorkflowDecisionSchema>;

export const CancelWorkflowSchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 2000 })),
});
export type CancelWorkflow = Static<typeof CancelWorkflowSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                           */
/* -------------------------------------------------------------------------- */

export const WorkflowIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type WorkflowIdParams = Static<typeof WorkflowIdParamsSchema>;
