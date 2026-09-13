import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { ChatRealtimeService } from './chat-realtime.service';

const PRESENCE_CHANNEL = 'portal:chat:presence';
const ONLINE_KEY_PREFIX = 'chat:presence:online';

interface SocketRegistration {
  tenantId: string;
  profileId: string;
  conversationIds: string[];
}

/**
 * Online/offline presence tracking.
 *
 * - Per-profile Redis key (`chat:presence:online:{tenant}:{profile}`) holds a
 *   connection count with a TTL refreshed on heartbeat; its existence means
 *   "online".
 * - Presence transitions are published to a Redis channel so every API
 *   instance re-emits them into the affected conversation rooms.
 * - Local maps keep per-socket membership so the last socket of a profile to
 *   disconnect drives the transition to offline.
 */
@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private readonly bySocket = new Map<string, SocketRegistration>();
  private readonly countByProfile = new Map<string, Map<string, number>>();
  private pub?: Redis;
  private sub?: Redis;
  private enabled = false;

  constructor(private readonly realtime: ChatRealtimeService) {}

  async onModuleInit() {
    this.enabled = String(process.env.PRESENCE_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!this.enabled) return;
    try {
      this.pub = new Redis(this.redisOptions());
      this.sub = this.pub.duplicate();
      await Promise.all([this.pub.connect(), this.sub.connect()]);
      await this.sub.subscribe(PRESENCE_CHANNEL);
      this.sub.on('message', (channel, raw) => {
        if (channel === PRESENCE_CHANNEL) this.handlePresenceMessage(raw);
      });
      this.logger.log('Presence Redis pub/sub ready');
    } catch (error) {
      this.logger.warn(`Presence Redis unavailable, presence disabled: ${(error as Error)?.message}`);
      this.enabled = false;
    }
  }

  async onModuleDestroy() {
    if (this.sub) await this.sub.quit();
    if (this.pub) await this.pub.quit();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private redisOptions(): RedisOptions {
    return {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    };
  }

  private onlineKey(tenantId: string, profileId: string): string {
    return `${ONLINE_KEY_PREFIX}:${tenantId}:${profileId}`;
  }

  private presenceTtlSeconds(): number {
    return Math.max(30, Number(process.env.PRESENCE_TTL_SECONDS || 90));
  }

  private handlePresenceMessage(raw: string): void {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data?.type !== 'presence') return;
    this.realtime.emitConversations(data.conversationIds ?? [], 'presence', {
      profile_id: data.profileId,
      status: data.status,
      tenant_id: data.tenantId,
      last_seen_at: data.lastSeen,
    });
  }

  async register(
    socketId: string,
    tenantId: string,
    profileId: string,
    conversationIds: string[]
  ): Promise<void> {
    this.bySocket.set(socketId, { tenantId, profileId, conversationIds });
    let byProfile = this.countByProfile.get(tenantId);
    if (!byProfile) {
      byProfile = new Map<string, number>();
      this.countByProfile.set(tenantId, byProfile);
    }
    const previous = byProfile.get(profileId) ?? 0;
    byProfile.set(profileId, previous + 1);
    if (previous === 0) {
      await this.markOnline(tenantId, profileId, 1);
      await this.publish(tenantId, profileId, 'online', conversationIds);
    }
  }

  async unregister(socketId: string): Promise<void> {
    const meta = this.bySocket.get(socketId);
    if (!meta) return;
    this.bySocket.delete(socketId);
    const byProfile = this.countByProfile.get(meta.tenantId);
    const previous = byProfile?.get(meta.profileId) ?? 0;
    const next = Math.max(0, previous - 1);
    if (next === 0) {
      if (byProfile) byProfile.delete(meta.profileId);
      await this.markOffline(meta.tenantId, meta.profileId);
      await this.publish(meta.tenantId, meta.profileId, 'offline', meta.conversationIds);
    } else if (byProfile) {
      byProfile.set(meta.profileId, next);
    }
  }

  async heartbeat(tenantId: string, profileId: string): Promise<void> {
    if (!this.enabled || !this.pub) return;
    try {
      await this.pub.expire(this.onlineKey(tenantId, profileId), this.presenceTtlSeconds());
    } catch {
      /* presence keyed TTL is best-effort */
    }
  }

  private async markOnline(tenantId: string, profileId: string, increment: number): Promise<void> {
    if (!this.enabled || !this.pub) return;
    try {
      await this.pub.incrby(this.onlineKey(tenantId, profileId), increment);
      await this.pub.expire(this.onlineKey(tenantId, profileId), this.presenceTtlSeconds());
    } catch (error) {
      this.logger.debug(`markOnline failed: ${(error as Error)?.message}`);
    }
  }

  private async markOffline(tenantId: string, profileId: string): Promise<void> {
    if (!this.enabled || !this.pub) return;
    try {
      const key = this.onlineKey(tenantId, profileId);
      const remaining = await this.pub.decr(key);
      if (remaining <= 0) await this.pub.del(key);
    } catch (error) {
      this.logger.debug(`markOffline failed: ${(error as Error)?.message}`);
    }
  }

  private async publish(
    tenantId: string,
    profileId: string,
    status: 'online' | 'offline',
    conversationIds: string[]
  ): Promise<void> {
    if (!this.enabled || !this.pub) return;
    try {
      await this.pub.publish(
        PRESENCE_CHANNEL,
        JSON.stringify({
          type: 'presence',
          tenantId,
          profileId,
          status,
          lastSeen: new Date().toISOString(),
          conversationIds,
        })
      );
    } catch (error) {
      this.logger.debug(`presence publish failed: ${(error as Error)?.message}`);
    }
  }

  async isOnline(tenantId: string, profileId: string): Promise<boolean> {
    if (!this.enabled || !this.pub) return false;
    try {
      const exists = await this.pub.exists(this.onlineKey(tenantId, profileId));
      return exists === 1;
    } catch {
      return false;
    }
  }

  async onlineMap(tenantId: string, profileIds: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    for (const id of profileIds) result.set(id, false);
    if (!this.enabled || !this.pub || !profileIds.length) return result;
    try {
      const values = await this.pub.mget(profileIds.map((id) => this.onlineKey(tenantId, id)));
      profileIds.forEach((id, index) => {
        result.set(id, Boolean(values[index]));
      });
    } catch {
      /* best-effort */
    }
    return result;
  }
}