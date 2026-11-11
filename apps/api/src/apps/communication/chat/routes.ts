import type { FastifyPluginAsync } from 'fastify';
import {
  CreateConversationSchema,
  SendChatMessageSchema,
  UpdateChatMemberSchema,
  type CreateConversation,
  type SendChatMessage,
  type UpdateChatMember,
} from '@stanforte/contract';
import { composeGuards, requireAuth } from '$core/auth/guards';
import { requestBody, requestQuery } from '$core/routes';

export const ChatRoutes: FastifyPluginAsync = async (fastify) => {
  const chat = () => fastify.container.chat;
  const auth = composeGuards(requireAuth);
  const actor = (request: { user?: { id?: string } }) => request.user?.id as string;

  // List my conversations
  fastify.get('/conversations', { preHandler: auth }, async (request) => {
    return chat().conversations(actor(request));
  });

  // Alias: GET / returns conversations
  fastify.get('/', { preHandler: auth }, async (request) => {
    return chat().conversations(actor(request));
  });

  // Create a conversation (direct or group)
  fastify.post('/conversations', { preHandler: auth, schema: { body: CreateConversationSchema } }, async (request) => {
    return chat().createConversation(actor(request), requestBody<CreateConversation>(request));
  });

  // Total unread messages count
  fastify.get('/unread-count', { preHandler: auth }, async (request) => {
    return chat().unreadCount(actor(request));
  });

  // Conversation detail
  fastify.get('/conversations/:id', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return chat().detail(actor(request), id);
  });

  // Messages in conversation
  fastify.get('/conversations/:id/messages', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return chat().messages(actor(request), id, requestQuery<any>(request));
  });

  // Send message to conversation
  fastify.post('/conversations/:id/messages', { preHandler: auth, schema: { body: SendChatMessageSchema } }, async (request) => {
    const { id } = request.params as { id: string };
    return chat().sendMessage(actor(request), id, requestBody<SendChatMessage>(request));
  });

  // Mark conversation read
  fastify.post('/conversations/:id/read', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    return chat().markRead(actor(request), id);
  });

  // Add members to group
  fastify.post('/conversations/:id/members', { preHandler: auth }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { member_ids: string[] };
    return chat().addMembers(actor(request), id, body.member_ids);
  });

  // Remove member from group
  fastify.delete('/conversations/:id/members/:memberId', { preHandler: auth }, async (request) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    return chat().removeMember(actor(request), id, memberId);
  });

  // Update member role
  fastify.patch('/conversations/:id/members/:memberId', { preHandler: auth, schema: { body: UpdateChatMemberSchema } }, async (request) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    return chat().updateMemberRole(actor(request), id, memberId, requestBody<UpdateChatMember>(request));
  });
};
