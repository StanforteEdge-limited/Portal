import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { AuthService } from '$modules/identity/auth/auth.service';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { PresenceService } from './presence.service';

const ROOM_PROFILE = (id: string | bigint) => `profile:${id.toString()}`;
const ROOM_CONVERSATION = (id: string | bigint) => `conv:${id.toString()}`;

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private server?: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly chat: ChatService,
    private readonly realtime: ChatRealtimeService,
    private readonly presence: PresenceService,
    private readonly tenantContext: TenantContextService
  ) {}

  afterInit(server: Namespace) {
    this.server = server;
    this.realtime.init(server);
  }

  private extractToken(client: Socket): string {
    const auth: any = client.handshake?.auth ?? {};
    if (typeof auth.token === 'string' && auth.token) return auth.token;
    const header = client.handshake?.headers?.authorization;
    if (typeof header === 'string') return header.replace(/^Bearer\s+/i, '');
    return '';
  }

  private displayName(user: any): string {
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email || 'User';
  }

  private reject(client: Socket, message: string) {
    client.emit('error', { message });
    client.disconnect(true);
  }

  private runAsUser<T>(client: Socket, operation: () => T | Promise<T>): Promise<T> {
    const user = (client.data as any).user;
    return this.tenantContext.run(
      {
        tenantId: BigInt(user.tenantId),
        profileId: BigInt(user.id),
        membershipId: BigInt(user.tenantMembershipId),
        isOwner: user.isTenantOwner === true,
      },
      () => operation()
    );
  }

  private async verifyMembership(client: Socket, conversationId: string): Promise<boolean> {
    const user = (client.data as any).user;
    return this.runAsUser(client, () => this.chat.isMember(user.id, conversationId));
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) return this.reject(client, 'Missing access token');

    let user: any;
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET || 'change-me' });
      user = await this.auth.validateJwtPayload(payload);
    } catch {
      return this.reject(client, 'Invalid or expired token');
    }
    if (!user) return this.reject(client, 'Account is not active');

    (client.data as any).user = user;
    await client.join(ROOM_PROFILE(user.id));

    const conversationIds = await this.runAsUser(client, () => this.chat.membershipIds(user.id).then((ids) => ids.map(String)));
    for (const id of conversationIds) {
      await client.join(ROOM_CONVERSATION(id));
    }
    (client.data as any).conversationIds = conversationIds;

    await this.presence.register(client.id, user.tenantId, user.id, conversationIds);
    client.emit('connected', { profile_id: user.id, conversation_ids: conversationIds });
    this.logger.log(`chat socket connected profile=${user.id} tenant=${user.tenantId}`);
  }

  async handleDisconnect(client: Socket) {
    await this.presence.unregister(client.id);
  }

  @SubscribeMessage('conversation:join')
  async conversationJoin(client: Socket, payload: { conversation_id?: string }) {
    if (!payload?.conversation_id) {
      client.emit('error', { message: 'conversation_id is required' });
      return;
    }
    const ok = await this.verifyMembership(client, payload.conversation_id);
    if (!ok) {
      client.emit('error', { message: 'You are not a member of this conversation' });
      return;
    }
    await client.join(ROOM_CONVERSATION(payload.conversation_id));
    client.emit('conversation:joined', { conversation_id: payload.conversation_id });
  }

  @SubscribeMessage('conversation:leave')
  async conversationLeave(client: Socket, payload: { conversation_id?: string }) {
    if (!payload?.conversation_id) return;
    await client.leave(ROOM_CONVERSATION(payload.conversation_id));
  }

  @SubscribeMessage('message:send')
  async messageSend(
    client: Socket,
    payload: { conversation_id?: string; body?: string; file_asset_ids?: string[]; reply_to_message_id?: string }
  ) {
    const user = (client.data as any).user;
    if (!payload?.conversation_id) {
      client.emit('message:sent', { error: 'conversation_id is required' });
      return;
    }
    try {
      const message = await this.runAsUser(client, () =>
        this.chat.sendMessage(user.id, payload.conversation_id, {
          body: payload.body,
          file_asset_ids: payload.file_asset_ids,
          reply_to_message_id: payload.reply_to_message_id,
        })
      );
      client.emit('message:sent', { ok: true, message });
    } catch (error) {
      client.emit('message:sent', { ok: false, error: (error as Error).message });
    }
  }

  @SubscribeMessage('message:read')
  async messageRead(client: Socket, payload: { conversation_id?: string }) {
    const user = (client.data as any).user;
    if (!payload?.conversation_id) {
      client.emit('error', { message: 'conversation_id is required' });
      return;
    }
    try {
      await this.runAsUser(client, () => this.chat.markRead(user.id, payload.conversation_id!));
    } catch (error) {
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('typing')
  async typing(client: Socket, payload: { conversation_id?: string; is_typing?: boolean }) {
    const user = (client.data as any).user;
    if (!payload?.conversation_id) return;
    const ok = await this.verifyMembership(client, payload.conversation_id);
    if (!ok) return;
    this.server?.to(ROOM_CONVERSATION(payload.conversation_id)).emit('typing', {
      conversation_id: payload.conversation_id,
      profile_id: user.id,
      sender_name: this.displayName(user),
      is_typing: payload.is_typing === true,
    });
  }

  @SubscribeMessage('presence:heartbeat')
  async presenceHeartbeat(client: Socket) {
    const user = (client.data as any).user;
    if (!user) return;
    await this.presence.heartbeat(user.tenantId, user.id);
  }
}