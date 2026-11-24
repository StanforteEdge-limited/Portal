import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  CreateConversationSchema,
  SendChatMessageSchema,
  UpdateChatMemberSchema,
  type CreateConversation,
  type SendChatMessage,
  type UpdateChatMember,
} from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth } from '$core/auth/guards';
import { config } from '$config/index';
import { requestBody, requestQuery } from '$core/routes';

export const ChatRoutes: FastifyPluginAsync = async (fastify) => {
  const chat = () => fastify.container.chat;
  const auth = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;
  const inTenant = <T>(request: FastifyRequest, operation: () => Promise<T> | T) => {
    try {
      const t = currentTenant(request);
      return fastify.container.tenantContext.run(t, operation);
    } catch {
      return operation();
    }
  };

  // Server-Sent Events (SSE) realtime chat stream (replaces HTTP polling)
  fastify.get('/stream', { preHandler: auth }, async (request, reply) => {
    const profileId = actor(request);
    const convIds = await inTenant(request, () => chat().membershipIds(profileId));

    reply.hijack();
    request.raw.setTimeout(0);
    reply.raw.setTimeout(0);

    const origin = request.headers.origin;
    const allowOrigin =
      origin && (!config.isProduction || config.corsOrigins.includes(origin))
        ? origin
        : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    };
    if (allowOrigin) {
      headers['Access-Control-Allow-Origin'] = allowOrigin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    reply.raw.writeHead(200, headers);

    const writeEvent = (event: string, payload: unknown) => {
      if (reply.raw.writableEnded || reply.raw.destroyed) return;
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const tenantIdStr = String((request.user as any)?.tenantId ?? currentTenant(request)?.tenantId ?? '');
    const connId = `sse-${profileId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    fastify.container.presence.register(connId, tenantIdStr, profileId, convIds.map(String)).catch(() => {});

    const subscription = fastify.container.chatRealtime.subscribeSse({
      profileId,
      conversationIds: convIds.map((id) => id.toString()),
      send: (event, payload) => {
        if (
          (event === 'conversation:created' || event === 'conversation:new' || event === 'member:added') &&
          payload &&
          typeof payload === 'object' &&
          'id' in payload
        ) {
          subscription.addConversation(String((payload as { id: unknown }).id));
        }
        writeEvent(event, payload);
      },
    });

    writeEvent('connected', { ok: true, conversations: convIds.length });

    const heartbeat = setInterval(() => {
      if (reply.raw.writableEnded || reply.raw.destroyed) return;
      reply.raw.write(': ping\n\n');
      fastify.container.presence.heartbeat(tenantIdStr, profileId).catch(() => {});
    }, 25_000);
    heartbeat.unref?.();

    const cleanup = () => {
      clearInterval(heartbeat);
      subscription.unsubscribe();
      fastify.container.presence.unregister(connId).catch(() => {});
    };
    request.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
  });

  // List my conversations
  fastify.get('/conversations', { preHandler: auth }, async (request) => {
    return inTenant(request, () => chat().conversations(actor(request)));
  });

  // Alias: GET / returns conversations
  fastify.get('/', { preHandler: auth }, async (request) => {
    return inTenant(request, () => chat().conversations(actor(request)));
  });

  // Create a conversation (direct or group)
  fastify.post('/conversations', { preHandler: auth, schema: { body: CreateConversationSchema } }, async (request) => {
    return inTenant(request, () => chat().createConversation(actor(request), requestBody<CreateConversation>(request)));
  });

  // Total unread messages count
  fastify.get('/unread-count', { preHandler: auth }, async (request) => {
    return inTenant(request, () => chat().unreadCount(actor(request)));
  });

  // Conversation detail
  fastify.get('/conversations/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => chat().detail(actor(request), id));
  });

  // Messages in conversation
  fastify.get('/conversations/:id/messages', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => chat().messages(actor(request), id, requestQuery<any>(request)));
  });

  // Send message to conversation
  fastify.post('/conversations/:id/messages', { preHandler: auth, schema: { body: SendChatMessageSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => chat().sendMessage(actor(request), id, requestBody<SendChatMessage>(request)));
  });

  // Mark conversation read
  fastify.post('/conversations/:id/read', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return inTenant(request, () => chat().markRead(actor(request), id));
  });

  // Add members to group
  fastify.post('/conversations/:id/members', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { member_ids: string[] };
    return inTenant(request, () => chat().addMembers(actor(request), id, body.member_ids));
  });

  // Remove member from group
  fastify.delete('/conversations/:id/members/:memberId', { preHandler: auth }, async (request) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    return inTenant(request, () => chat().removeMember(actor(request), id, memberId));
  });

  // Update member role
  fastify.patch('/conversations/:id/members/:memberId', { preHandler: auth, schema: { body: UpdateChatMemberSchema } }, async (request) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    return inTenant(request, () => chat().updateMemberRole(actor(request), id, memberId, requestBody<UpdateChatMember>(request)));
  });
};
