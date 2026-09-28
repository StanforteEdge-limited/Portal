import type { FastifyPluginAsync } from 'fastify';
import { NotificationsIdParamsSchema, type NotificationsIdParams } from '@stanforte/contract';
import { composeGuards, requireAuth } from '$core/auth/guards';
import { requestParams } from '$core/routes';

/**
 * Mounted at `/v1/notifications`.
 *
 * Only self-service is exposed. `NotificationsService.create` takes a fan-out
 * payload (channel preferences, email HTML, explicit recipient) that must never
 * be reachable from a client, so delivery stays an internal service call used
 * by the other modules. There is also no "list mine" service method, so the
 * inbox list is left for the module that owns it rather than faked here.
 */
export const NotificationsRoutes: FastifyPluginAsync = async (fastify) => {
  const notifications = () => fastify.container.notifications;
  const self = composeGuards(requireAuth);
  const userId = (request: { user?: { id?: string } }) => request.user?.id as string;

  fastify.get('/unread-count', { preHandler: self }, async (request) => notifications().unreadCount(userId(request)));

  fastify.get('/:id', { preHandler: self, schema: { params: NotificationsIdParamsSchema } }, async (request) =>
    notifications().getOneForUser(userId(request), requestParams<NotificationsIdParams>(request).id),
  );

  fastify.post('/:id/read', { preHandler: self, schema: { params: NotificationsIdParamsSchema } }, async (request) =>
    notifications().markRead(userId(request), requestParams<NotificationsIdParams>(request).id),
  );

  fastify.post('/read-all', { preHandler: self }, async (request) => notifications().markAllRead(userId(request)));
};
