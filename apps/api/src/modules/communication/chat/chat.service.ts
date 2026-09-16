import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { parseBigIntId } from '$common/utils/ids';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ChatRealtimeService } from './chat-realtime.service';
import { chatConversation, chatConversationMember, chatMessage, chatMessageAttachment } from './model';
import { profile } from '$modules/identity/users/model';
import { fileAsset } from '$modules/storage/model';

const PROFILE_SELECT = {
  id: profile.id,
  firstName: profile.firstName,
  lastName: profile.lastName,
  email: profile.email,
  username: profile.username,
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly realtime: ChatRealtimeService
  ) {}

  private displayName(profile: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null }): string {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email || profile.username || 'User';
  }

  private async profileMap(profileIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(profileIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const rows = await this.db.client.select(PROFILE_SELECT).from(profile).where(inArray(profile.id, ids));
    return new Map(rows.map((row) => [row.id.toString(), row]));
  }

  private async requireMembership(profileId: bigint, conversationId: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const [member] = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, profileId),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (!member) {
      throw new NotFoundException('Conversation not found or you are not a member');
    }
    return member;
  }

  private async requireConversation(conversationId: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const [conversation] = await this.db.client
      .select()
      .from(chatConversation)
      .where(and(eq(chatConversation.id, conversationId), tid ? eq(chatConversation.tenantId, tid) : undefined))
      .limit(1);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async membershipIds(profileId: string): Promise<bigint[]> {
    const me = parseBigIntId(profileId, 'profile id');
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select({ conversationId: chatConversationMember.conversationId })
      .from(chatConversationMember)
      .where(and(eq(chatConversationMember.profileId, me), tid ? eq(chatConversationMember.tenantId, tid) : undefined));
    return rows.map((row) => row.conversationId);
  }

  async isMember(profileId: string, conversationIdRaw: string): Promise<boolean> {
    try {
      await this.requireMembership(
        parseBigIntId(profileId, 'profile id'),
        parseBigIntId(conversationIdRaw, 'conversation id')
      );
      return true;
    } catch {
      return false;
    }
  }

  async conversations(profileId: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const tid = this.tenantContext.currentTenantId();
    const memberships = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(and(eq(chatConversationMember.profileId, me), tid ? eq(chatConversationMember.tenantId, tid) : undefined))
      .orderBy(desc(chatConversationMember.joinedAt));
    if (!memberships.length) return { data: [], total: 0 };

    const conversationIds = memberships.map((m) => m.conversationId);
    const conversations = await this.db.client
      .select()
      .from(chatConversation)
      .where(and(inArray(chatConversation.id, conversationIds), tid ? eq(chatConversation.tenantId, tid) : undefined))
      .orderBy(desc(chatConversation.updatedAt));
    const allMemberRows = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(and(inArray(chatConversationMember.conversationId, conversationIds), tid ? eq(chatConversationMember.tenantId, tid) : undefined));
    const allProfileIds = Array.from(new Set(allMemberRows.map((m) => m.profileId)));
    const profiles = await this.profileMap(allProfileIds);

    const latestMessages = await this.getLatestMessages(conversationIds);
    const unreadMap = await this.getUnreadForConversations(me, conversationIds);

    const byConversationId: Record<string, string[]> = {};
    for (const row of allMemberRows) {
      const key = row.conversationId.toString();
      (byConversationId[key] ||= []).push(row.profileId.toString());
    }

    return {
      data: conversations.map((conversation) => {
        const lastMessage = latestMessages.get(conversation.id.toString());
        const memberIds = byConversationId[conversation.id.toString()] || [];
        const isDirect = conversation.type === 'direct';
        const otherIds = isDirect
          ? memberIds.filter((id) => id !== me.toString())
          : [];
        let title = conversation.name || null;
        if (isDirect && otherIds.length === 1) {
          const other = profiles.get(otherIds[0]);
          title = other ? this.displayName(other) : null;
        } else if (!title) {
          title = memberIds.length ? `Group (${memberIds.length})` : 'Group';
        }
        return {
          id: conversation.id.toString(),
          type: conversation.type,
          name: title,
          description: conversation.description,
          member_count: memberIds.length,
          last_message: lastMessage
            ? {
                id: lastMessage.id.toString(),
                body: lastMessage.body,
                sender_profile_id: lastMessage.senderProfileId?.toString() ?? null,
                sender_name: lastMessage.senderProfileId ? this.displayName(profiles.get(lastMessage.senderProfileId.toString()) ?? {}) : null,
                created_at: lastMessage.createdAt,
              }
            : null,
          unread_count: unreadMap.get(conversation.id.toString()) ?? 0,
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt,
        };
      }),
      total: conversations.length,
    };
  }

  private async getLatestMessages(conversationIds: bigint[]) {
    const map = new Map<string, any>();
    for (const conversationId of conversationIds) {
      const [latest] = await this.db.client
        .select({
          id: chatMessage.id,
          body: chatMessage.body,
          senderProfileId: chatMessage.senderProfileId,
          createdAt: chatMessage.createdAt,
        })
        .from(chatMessage)
        .where(eq(chatMessage.conversationId, conversationId))
        .orderBy(desc(chatMessage.createdAt))
        .limit(1);
      if (latest) map.set(conversationId.toString(), latest);
    }
    return map;
  }

  private async getUnreadForConversations(profileId: bigint, conversationIds: bigint[]) {
    const tid = this.tenantContext.currentTenantId();
    const memberships = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(
        and(
          inArray(chatConversationMember.conversationId, conversationIds),
          eq(chatConversationMember.profileId, profileId),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      );
    const map = new Map<string, number>();
    for (const membership of memberships) {
      const conditions: SQL[] = [eq(chatMessage.conversationId, membership.conversationId)];
      if (tid) conditions.push(eq(chatMessage.tenantId, tid));
      if (membership.lastReadAt) conditions.push(gt(chatMessage.createdAt, membership.lastReadAt));
      const [row] = await this.db.client.select({ count: count() }).from(chatMessage).where(and(...conditions));
      map.set(membership.conversationId.toString(), row?.count ?? 0);
    }
    return map;
  }

  private async findExistingDirect(myId: bigint, otherId: bigint): Promise<bigint | null> {
    const tid = this.tenantContext.currentTenantId();
    const mine = await this.db.client
      .select({ conversationId: chatConversationMember.conversationId })
      .from(chatConversationMember)
      .where(and(eq(chatConversationMember.profileId, myId), tid ? eq(chatConversationMember.tenantId, tid) : undefined));
    if (!mine.length) return null;
    const conversationIds = mine.map((m) => m.conversationId);
    const theirs = await this.db.client
      .select({ conversationId: chatConversationMember.conversationId })
      .from(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.profileId, otherId),
          inArray(chatConversationMember.conversationId, conversationIds),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      );
    if (!theirs.length) return null;
    const overlaps = theirs.map((t) => t.conversationId);
    const [direct] = await this.db.client
      .select()
      .from(chatConversation)
      .where(and(inArray(chatConversation.id, overlaps), eq(chatConversation.type, 'direct'), tid ? eq(chatConversation.tenantId, tid) : undefined))
      .limit(1);
    return direct ? direct.id : null;
  }

  async createConversation(profileId: string, dto: CreateConversationDto) {
    const me = parseBigIntId(profileId, 'profile id');
    const tid = this.tenantContext.requireTenantId();
    const memberIds = Array.from(new Set(dto.member_ids.map((id) => parseBigIntId(id, 'member id'))));
    if (dto.type === 'direct') {
      if (memberIds.length !== 1) {
        throw new BadRequestException('A direct conversation requires exactly one member_id');
      }
      const otherId = memberIds[0];
      if (otherId === me) throw new BadRequestException('Cannot start a conversation with yourself');
      const existing = await this.findExistingDirect(me, otherId);
      if (existing) {
        return this.detail(profileId, existing.toString());
      }
    }
    if (memberIds.includes(me)) {
      throw new BadRequestException('You are added as the conversation creator automatically');
    }

    const allIds = [me, ...memberIds];
    const profiles = await this.db.client.select({ id: profile.id }).from(profile).where(inArray(profile.id, allIds));
    if (profiles.length !== allIds.length) {
      throw new BadRequestException('One or more member profiles do not exist');
    }

    const [created] = await this.db.client
      .insert(chatConversation)
      .values({
        tenantId: tid,
        type: dto.type,
        name: dto.type === 'group' ? dto.name || 'Group' : null,
        description: dto.description ?? null,
        createdBy: me,
      })
      .returning();

    await this.db.client.insert(chatConversationMember).values(
      allIds.map((profileUserId) => ({
        tenantId: tid,
        conversationId: created.id,
        profileId: profileUserId,
        role: profileUserId === me ? 'admin' as const : 'member' as const,
      })),
    );

    if (dto.type === 'group') {
      const detail = await this.detail(profileId, created.id.toString());
      for (const otherId of memberIds) {
        this.realtime.emitProfile(otherId, 'conversation:new', detail);
      }
      return detail;
    }

    return this.detail(profileId, created.id.toString());
  }

  async detail(profileId: string, conversationIdRaw: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const conversation = await this.requireConversation(conversationId);

    const members = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(eq(chatConversationMember.conversationId, conversationId))
      .orderBy(asc(chatConversationMember.joinedAt));
    const profiles = await this.profileMap(members.map((member) => member.profileId));

    return {
      id: conversation.id.toString(),
      type: conversation.type,
      name: conversation.name,
      description: conversation.description,
      created_by: conversation.createdBy?.toString() ?? null,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
      members: members.map((member) => ({
        profile_id: member.profileId.toString(),
        role: member.role,
        last_read_at: member.lastReadAt,
        joined_at: member.joinedAt,
        name: this.displayName(profiles.get(member.profileId.toString()) ?? {}),
      })),
    };
  }

  async messages(profileId: string, conversationIdRaw: string, query: Record<string, any>) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.currentTenantId();

    const perPage = Math.min(200, Math.max(1, Number(query.per_page ?? 50)));
    const beforeId = query.before_id ? parseBigIntId(query.before_id, 'message id') : undefined;

    const conditions: SQL[] = [eq(chatMessage.conversationId, conversationId)];
    if (tid) conditions.push(eq(chatMessage.tenantId, tid));
    if (beforeId) conditions.push(lt(chatMessage.id, beforeId));

    const rows = await this.db.client
      .select()
      .from(chatMessage)
      .where(and(...conditions))
      .orderBy(desc(chatMessage.createdAt))
      .limit(perPage + 1);

    const hasMore = rows.length > perPage;
    const pageRows = rows.slice(0, perPage);
    const senderIds = pageRows.map((row) => row.senderProfileId);
    const profiles = await this.profileMap(senderIds);

    const attachments = await this.loadAttachments(pageRows.map((row) => row.id));

    return {
      data: pageRows
        .map((row) => ({
          id: row.id.toString(),
          conversation_id: row.conversationId.toString(),
          sender_profile_id: row.senderProfileId?.toString() ?? null,
          sender_name: this.displayName(profiles.get(row.senderProfileId?.toString() ?? '') ?? {}),
          body: row.body,
          reply_to_message_id: row.replyToMessageId?.toString() ?? null,
          attachments: attachments.get(row.id.toString()) ?? [],
          created_at: row.createdAt,
        }))
        .reverse(),
      has_more: hasMore,
      next_cursor: hasMore ? pageRows[pageRows.length - 1].id.toString() : null,
    };
  }

  private async loadAttachments(messageIds: bigint[]) {
    if (!messageIds.length) return new Map<string, any[]>();
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select({
        attachment: chatMessageAttachment,
        file: {
          id: fileAsset.id,
          fileName: fileAsset.fileName,
          mimeType: fileAsset.mimeType,
          fileSize: fileAsset.fileSize,
          storagePath: fileAsset.storagePath,
          publicUrl: fileAsset.publicUrl,
        },
      })
      .from(chatMessageAttachment)
      .leftJoin(fileAsset, eq(chatMessageAttachment.fileAssetId, fileAsset.id))
      .where(and(inArray(chatMessageAttachment.messageId, messageIds), tid ? eq(chatMessageAttachment.tenantId, tid) : undefined));
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const key = row.attachment.messageId.toString();
      const file = row.file;
      const entry = {
        id: row.attachment.id.toString(),
        file_asset_id: row.attachment.fileAssetId,
        file_name: file?.fileName ?? null,
        mime_type: file?.mimeType ?? null,
        file_size: file?.fileSize != null ? String(file.fileSize) : null,
        storage_path: file?.storagePath ?? null,
        public_url: file?.publicUrl ?? null,
      };
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(entry);
    }
    return map;
  }

  async sendMessage(profileId: string, conversationIdRaw: string, dto: SendMessageDto) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.requireTenantId();

    const body = dto.body?.trim();
    const fileAssetIds = dto.file_asset_ids?.filter(Boolean) ?? [];
    if (!body && fileAssetIds.length === 0) {
      throw new BadRequestException('Message body or at least one file_asset_id is required');
    }

    let replyTo: bigint | null = null;
    if (dto.reply_to_message_id) {
      replyTo = parseBigIntId(dto.reply_to_message_id, 'message id');
      const [replyExists] = await this.db.client
        .select({ id: chatMessage.id })
        .from(chatMessage)
        .where(and(eq(chatMessage.id, replyTo), eq(chatMessage.tenantId, tid)))
        .limit(1);
      if (!replyExists) throw new BadRequestException('Reply-to message not found');
    }

    let verifiedFiles: string[] = [];
    if (fileAssetIds.length) {
      const files = await this.db.client
        .select({ id: fileAsset.id })
        .from(fileAsset)
        .where(inArray(fileAsset.id, fileAssetIds));
      if (files.length !== fileAssetIds.length) {
        throw new BadRequestException('One or more file_asset_id values do not exist');
      }
      verifiedFiles = fileAssetIds;
    }

    const [message] = await this.db.client
      .insert(chatMessage)
      .values({
        tenantId: tid,
        conversationId,
        senderProfileId: me,
        body: body ?? null,
        replyToMessageId: replyTo,
      })
      .returning();

    if (verifiedFiles.length) {
      await Promise.all(
        verifiedFiles.map((fileAssetId) =>
          this.db.client.insert(chatMessageAttachment).values({ tenantId: tid, messageId: message.id, fileAssetId })
        )
      );
    }

    await this.db.client
      .update(chatConversation)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversation.id, conversationId));

    const profiles = await this.profileMap([me]);
    const attachments = await this.loadAttachments([message.id]);

    const payload = {
      id: message.id.toString(),
      conversation_id: conversationId.toString(),
      sender_profile_id: message.senderProfileId.toString(),
      sender_name: this.displayName(profiles.get(message.senderProfileId.toString()) ?? {}),
      body: message.body,
      reply_to_message_id: message.replyToMessageId?.toString() ?? null,
      attachments: attachments.get(message.id.toString()) ?? [],
      created_at: message.createdAt,
    };
    this.realtime.emitConversation(conversationId, 'message:new', payload);
    return payload;
  }

  async markRead(profileId: string, conversationIdRaw: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.currentTenantId();
    await this.db.client
      .update(chatConversationMember)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, me),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      );
    this.realtime.emitConversation(conversationId, 'message:read', {
      conversation_id: conversationId.toString(),
      profile_id: me.toString(),
      read_at: new Date().toISOString(),
    });
    return { success: true };
  }

  async unreadCount(profileId: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const memberships = await this.db.client
      .select({ conversationId: chatConversationMember.conversationId })
      .from(chatConversationMember)
      .where(eq(chatConversationMember.profileId, me));
    if (!memberships.length) return { unread_count: 0 };
    const counts = await this.getUnreadForConversations(
      me,
      memberships.map((m) => m.conversationId)
    );
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return { unread_count: total };
  }

  async addMembers(profileId: string, conversationIdRaw: string, memberIdsRaw: string[]) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    const conversation = await this.requireConversation(conversationId);
    if (conversation.type !== 'group') {
      throw new BadRequestException('Members can only be added to group conversations');
    }
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.requireTenantId();

    const memberIds = Array.from(new Set(memberIdsRaw.map((id) => parseBigIntId(id, 'member id'))));
    const profiles = await this.db.client.select({ id: profile.id }).from(profile).where(inArray(profile.id, memberIds));
    if (profiles.length !== memberIds.length) {
      throw new BadRequestException('One or more member profiles do not exist');
    }

    const existing = await this.db.client
      .select({ profileId: chatConversationMember.profileId })
      .from(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          inArray(chatConversationMember.profileId, memberIds),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      );
    const existingIds = new Set(existing.map((row) => row.profileId.toString()));
    const toAdd = memberIds.filter((id) => !existingIds.has(id.toString()));

    if (toAdd.length) {
      await this.db.client.insert(chatConversationMember).values(
        toAdd.map((profileUserId) => ({ tenantId: tid, conversationId, profileId: profileUserId, role: 'member' as const })),
      );
    }
    const detail = await this.detail(profileId, conversationId.toString());
    for (const profileUserId of toAdd) {
      this.realtime.emitProfile(profileUserId, 'conversation:member_joined', {
        conversation_id: conversationId.toString(),
        profile_id: profileUserId.toString(),
        conversation: detail,
      });
    }
    return detail;
  }

  async updateMemberRole(profileId: string, conversationIdRaw: string, memberProfileIdRaw: string, dto: UpdateMemberDto) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    const targetProfileId = parseBigIntId(memberProfileIdRaw, 'member profile id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.currentTenantId();
    const [myMembership] = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, me),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (!myMembership || myMembership.role !== 'admin') {
      throw new BadRequestException('Only conversation admins can update member roles');
    }
    const [updated] = await this.db.client
      .update(chatConversationMember)
      .set({ role: dto.role })
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, targetProfileId),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException('Member not found in conversation');
    return { success: true };
  }

  async removeMember(profileId: string, conversationIdRaw: string, memberProfileIdRaw: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    const targetProfileId = parseBigIntId(memberProfileIdRaw, 'member profile id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.currentTenantId();
    const [myMembership] = await this.db.client
      .select()
      .from(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, me),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      )
      .limit(1);
    if (!myMembership || myMembership.role !== 'admin') {
      throw new BadRequestException('Only conversation admins can remove members');
    }
    const [removed] = await this.db.client
      .delete(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, targetProfileId),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      )
      .returning();
    if (!removed) throw new NotFoundException('Member not found in conversation');
    this.realtime.emitConversation(conversationId, 'conversation:member_left', {
      conversation_id: conversationId.toString(),
      profile_id: targetProfileId.toString(),
    });
    return { success: true };
  }

  async leave(profileId: string, conversationIdRaw: string) {
    const me = parseBigIntId(profileId, 'profile id');
    const conversationId = parseBigIntId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const tid = this.tenantContext.currentTenantId();
    await this.db.client
      .delete(chatConversationMember)
      .where(
        and(
          eq(chatConversationMember.conversationId, conversationId),
          eq(chatConversationMember.profileId, me),
          tid ? eq(chatConversationMember.tenantId, tid) : undefined,
        ),
      );
    this.realtime.emitConversation(conversationId, 'conversation:member_left', {
      conversation_id: conversationId.toString(),
      profile_id: me.toString(),
    });
    return { success: true };
  }
}
