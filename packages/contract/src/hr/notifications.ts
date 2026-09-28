import { Type, type Static } from '@sinclair/typebox';

/**
 * The notifications feature is currently a scaffold: it exposes no request
 * schemas. `NotificationsIdParamsSchema` is kept because the generated
 * param object is a real `id: string` constraint used by the route table.
 */
export const NotificationsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type NotificationsIdParams = Static<typeof NotificationsIdParamsSchema>;
