import type Redis from 'ioredis';
import type { Namespace } from 'socket.io';
import { Logger } from '$core/logger';
import { redisKeyPrefix } from '$core/redis';

export type SseSender = (event: string, payload: unknown) => void;

type SseClient = {
  profileId: string;
  rooms: Set<string>;
  send: SseSender;
};

type RealtimeEnvelope = {
  room: string;
  event: string;
  payload: unknown;
};

/**
 * Central realtime emitter for `/chat` supporting both Server-Sent Events (SSE)
 * and optional Socket.IO namespaces. When Redis is connected, events fan out
 * across all API replicas via Redis Pub/Sub.
 */
export class ChatRealtimeService {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private server?: Namespace;
  private readonly rooms = new Map<string, Set<SseClient>>();
  private readonly clients = new Set<SseClient>();
  private readonly pub?: Redis;
  private sub?: Redis;
  private readonly channel: string;
  private pubSubReady = false;

  constructor(redis?: Redis) {
    this.pub = redis;
    this.channel = `${redisKeyPrefix()}chat:events`;
    if (redis) {
      this.initPubSub(redis);
    }
  }

  private initPubSub(redis: Redis): void {
    try {
      const sub = redis.duplicate({ maxRetriesPerRequest: null, enableOfflineQueue: true });
      sub.on('error', (err) => this.logger.debug(`Chat pub/sub error: ${err.message}`));
      sub.on('message', (channel, raw) => {
        if (channel !== this.channel) return;
        try {
          const msg = JSON.parse(raw) as RealtimeEnvelope;
          this.deliverLocal(msg.room, msg.event, msg.payload);
        } catch {
          // ignore malformed pub/sub message
        }
      });
      sub
        .subscribe(this.channel)
        .then(() => {
          this.pubSubReady = true;
          this.logger.log(`Chat SSE Redis pub/sub subscribed (${this.channel})`);
        })
        .catch((err) => {
          this.logger.warn(`Chat pub/sub subscribe failed; falling back to local SSE delivery: ${err?.message}`);
        });
      this.sub = sub;
    } catch (err: any) {
      this.logger.warn(`Chat pub/sub init skipped: ${err?.message}`);
    }
  }

  init(server: Namespace): void {
    this.server = server;
    this.logger.log('Chat realtime namespace registered');
  }

  isReady(): boolean {
    return Boolean(this.server) || this.clients.size >= 0;
  }

  subscribeSse(opts: {
    profileId: string;
    conversationIds: string[];
    send: SseSender;
  }): { addConversation: (conversationId: string) => void; unsubscribe: () => void } {
    const client: SseClient = {
      profileId: opts.profileId,
      rooms: new Set<string>(),
      send: opts.send,
    };
    this.clients.add(client);

    const join = (room: string) => {
      client.rooms.add(room);
      let set = this.rooms.get(room);
      if (!set) {
        set = new Set();
        this.rooms.set(room, set);
      }
      set.add(client);
    };

    join(`profile:${opts.profileId}`);
    for (const cid of opts.conversationIds) {
      join(`conv:${cid}`);
    }

    return {
      addConversation: (conversationId: string) => join(`conv:${conversationId}`),
      unsubscribe: () => {
        this.clients.delete(client);
        for (const room of client.rooms) {
          const set = this.rooms.get(room);
          if (set) {
            set.delete(client);
            if (set.size === 0) this.rooms.delete(room);
          }
        }
        client.rooms.clear();
      },
    };
  }

  private deliverLocal(room: string, event: string, payload: unknown): void {
    const subscribers = this.rooms.get(room);
    if (!subscribers || subscribers.size === 0) return;
    for (const client of subscribers) {
      try {
        client.send(event, payload);
      } catch {
        // Broken pipe will be cleaned up on connection close
      }
    }
  }

  private broadcast(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
    if (this.pub && this.pubSubReady) {
      this.pub
        .publish(this.channel, JSON.stringify({ room, event, payload } satisfies RealtimeEnvelope))
        .catch(() => {
          this.deliverLocal(room, event, payload);
        });
    } else {
      this.deliverLocal(room, event, payload);
    }
  }

  emitConversation(conversationId: bigint | string, event: string, payload: unknown): void {
    this.broadcast(`conv:${conversationId.toString()}`, event, payload);
  }

  emitConversations(conversationIds: string[], event: string, payload: unknown): void {
    for (const id of conversationIds) {
      this.broadcast(`conv:${id}`, event, payload);
    }
  }

  emitProfile(profileId: bigint | string, event: string, payload: unknown): void {
    this.broadcast(`profile:${profileId.toString()}`, event, payload);
  }

  async close(): Promise<void> {
    this.rooms.clear();
    this.clients.clear();
    if (this.sub) {
      await this.sub.quit().catch(() => this.sub?.disconnect());
      this.sub = undefined;
      this.pubSubReady = false;
    }
  }
}
