import { Injectable, Logger } from '@nestjs/common';
import { Namespace } from 'socket.io';

/**
 * Central emitter for the /chat namespace. The gateway registers the namespace
 * server here once it is initialized; services call emit* methods to push
 * events to conversation rooms or individual profile rooms. Room broadcasts
 * fan out across API instances automatically via the Redis socket.io adapter.
 */
@Injectable()
export class ChatRealtimeService {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private server?: Namespace;

  init(server: Namespace): void {
    this.server = server;
    this.logger.log('Chat realtime namespace registered');
  }

  isReady(): boolean {
    return !!this.server;
  }

  emitConversation(conversationId: bigint | string, event: string, payload: unknown): void {
    this.server?.to(`conv:${conversationId.toString()}`).emit(event, payload);
  }

  emitConversations(conversationIds: string[], event: string, payload: unknown): void {
    if (!this.server || !conversationIds.length) return;
    for (const id of conversationIds) {
      this.server.to(`conv:${id}`).emit(event, payload);
    }
  }

  emitProfile(profileId: bigint | string, event: string, payload: unknown): void {
    this.server?.to(`profile:${profileId.toString()}`).emit(event, payload);
  }
}