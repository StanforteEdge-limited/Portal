import { Type, type Static } from '@sinclair/typebox';

/**
 * The workflow feature is currently a scaffold: it exposes no request schemas.
 * `WorkflowIdParamsSchema` is kept because the generated param object is a real
 * `id: string` constraint used by the route table.
 */
export const WorkflowIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type WorkflowIdParams = Static<typeof WorkflowIdParamsSchema>;
