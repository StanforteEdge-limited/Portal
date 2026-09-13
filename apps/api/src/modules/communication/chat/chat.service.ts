import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { toBigInt } from '$common/utils/ids';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ChatRealtimeService } from './chat-realtime.service';

const PROFILE_SELECT = { id: true, firstName: true, lastName: true, email: true, username: true } as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly realtime: ChatRealtimeService
  ) {}

  private parseId(value: string | number, label: string): bigint {
    try {
      return toBigInt(String(value));
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private displayName(profile: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null }): string {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email || profile.username || 'User';
  }

  private async profileMap(profileIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(profileIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const rows = await this.drizzle.profile.findMany({ where: { id: { in: ids } }, select: PROFILE_SELECT });
    return new Map(rows.map((row) => [row.id.toString(), row]));
  }

  private async requireMembership(profileId: bigint, conversationId: bigint) {
    const member = await this.drizzle.chatConversationMember.findFirst({
      where: { conversationId, profileId },
    });
    if (!member) {
      throw new NotFoundException('Conversation not found or you are not a member');
    }
    return member;
  }

  private async requireConversation(conversationId: bigint) {
    const conversation = await this.drizzle.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async membershipIds(profileId: string): Promise<bigint[]> {
    const me = this.parseId(profileId, 'profile id');
    const rows = await this.drizzle.chatConversationMember.findMany({
      where: { profileId: me },
      select: { conversationId: true },
    });
    return rows.map((row) => row.conversationId);
  }

  async isMember(profileId: string, conversationIdRaw: string): Promise<boolean> {
    try {
      await this.requireMembership(
        this.parseId(profileId, 'profile id'),
        this.parseId(conversationIdRaw, 'conversation id')
      );
      return true;
    } catch {
      return false;
    }
  }

  async conversations(profileId: string) {
    const me = this.parseId(profileId, 'profile id');
    const memberships = await this.drizzle.chatConversationMember.findMany({
      where: { profileId: me },
      orderBy: { joinedAt: 'desc' },
    });
    if (!memberships.length) return { data: [], total: 0 };

    const conversationIds = memberships.map((m) => m.conversationId);
    const conversations = await this.drizzle.chatConversation.findMany({
      where: { id: { in: conversationIds } },
      orderBy: { updatedAt: 'desc' },
    });
    const allMemberRows = await this.drizzle.chatConversationMember.findMany({
      where: { conversationId: { in: conversationIds } },
    });
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
      const [latest] = await this.drizzle.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, body: true, senderProfileId: true, createdAt: true },
      });
      if (latest) map.set(conversationId.toString(), latest);
    }
    return map;
  }

  private async getUnreadForConversations(profileId: bigint, conversationIds: bigint[]) {
    const memberships = await this.drizzle.chatConversationMember.findMany({
      where: { conversationId: { in: conversationIds }, profileId },
    });
    const map = new Map<string, number>();
    for (const membership of memberships) {
      const count = await this.drizzle.chatMessage.count({
        where: {
          conversationId: membership.conversationId,
          ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
        },
      });
      map.set(membership.conversationId.toString(), count);
    }
    return map;
  }

  private async findExistingDirect(myId: bigint, otherId: bigint): Promise<bigint | null> {
    const mine = await this.drizzle.chatConversationMember.findMany({
      where: { profileId: myId },
      select: { conversationId: true },
    });
    if (!mine.length) return null;
    const conversationIds = mine.map((m) => m.conversationId);
    const theirs = await this.drizzle.chatConversationMember.findMany({
      where: { profileId: otherId, conversationId: { in: conversationIds } },
      select: { conversationId: true },
    });
    if (!theirs.length) return null;
    const overlaps = theirs.map((t) => t.conversationId);
    const direct = await this.drizzle.chatConversation.findFirst({
      where: { id: { in: overlaps }, type: 'direct' },
    });
    return direct ? direct.id : null;
  }

  async createConversation(profileId: string, dto: CreateConversationDto) {
    const me = this.parseId(profileId, 'profile id');
    const memberIds = Array.from(new Set(dto.member_ids.map((id) => this.parseId(id, 'member id'))));
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
    const profiles = await this.drizzle.profile.findMany({
      where: { id: { in: allIds } },
      select: { id: true },
    });
    if (profiles.length !== allIds.length) {
      throw new BadRequestException('One or more member profiles do not exist');
    }

    const created = await this.drizzle.chatConversation.create({
      data: {
        type: dto.type,
        name: dto.type === 'group' ? dto.name || 'Group' : null,
        description: dto.description ?? null,
        createdBy: me,
      },
    });

    await this.drizzle.chatConversationMember.createMany({
      data: allIds.map((profileUserId) => ({
        conversationId: created.id,
        profileId: profileUserId,
        role: profileUserId === me ? 'admin' : 'member',
      })),
    });

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
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    const conversation = await this.requireConversation(conversationId);

    const members = await this.drizzle.chatConversationMember.findMany({
      where: { conversationId },
      orderBy: { joinedAt: 'asc' },
    });
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
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);

    const perPage = Math.min(200, Math.max(1, Number(query.per_page ?? 50)));
    const beforeId = query.before_id ? this.parseId(query.before_id, 'message id') : undefined;

    const where: any = { conversationId };
    if (beforeId) where.id = { lt: beforeId };

    const rows = await this.drizzle.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: perPage + 1,
    });

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
    const rows = await this.drizzle.chatMessageAttachment.findMany({
      where: { messageId: { in: messageIds } },
      include: {
        fileAsset: {
          select: { id: true, fileName: true, mimeType: true, fileSize: true, storagePath: true, publicUrl: true },
        },
      },
    });
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const key = row.messageId.toString();
      const file = row.fileAsset;
      const entry = {
        id: row.id.toString(),
        file_asset_id: row.fileAssetId,
        file_name: file?.fileName ?? null,
        mime_type: file?.mimeType ?? null,
        file_size: file?.fileSize != null ? String(file.fileSize) : null,
        storage_path: file?.storagePath ?? null,
        public_url: file?.publicUrl ?? null,
      };
      (map.get(key) ||= []).push(entry);
    }
    return map;
  }

  async sendMessage(profileId: string, conversationIdRaw: string, dto: SendMessageDto) {
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);

    const body = dto.body?.trim();
    const fileAssetIds = dto.file_asset_ids?.filter(Boolean) ?? [];
    if (!body && fileAssetIds.length === 0) {
      throw new BadRequestException('Message body or at least one file_asset_id is required');
    }

    let replyTo: bigint | null = null;
    if (dto.reply_to_message_id) {
      replyTo = this.parseId(dto.reply_to_message_id, 'message id');
      const replyExists = await this.drizzle.chatMessage.findUnique({
        where: { id: replyTo },
        select: { id: true },
      });
      if (!replyExists) throw new BadRequestException('Reply-to message not found');
    }

    let verifiedFiles: string[] = [];
    if (fileAssetIds.length) {
      const files = await this.drizzle.fileAsset.findMany({
        where: { id: { in: fileAssetIds } },
        select: { id: true },
      });
      if (files.length !== fileAssetIds.length) {
        throw new BadRequestException('One or more file_asset_id values do not exist');
      }
      verifiedFiles = fileAssetIds;
    }

    const message = await this.drizzle.chatMessage.create({
      data: {
        conversationId,
        senderProfileId: me,
        body: body ?? null,
        replyToMessageId: replyTo,
      },
    });

    if (verifiedFiles.length) {
      await this.drizzle.$transaction(
        verifiedFiles.map((fileAssetId) =>
          this.drizzle.chatMessageAttachment.create({
            data: { messageId: message.id, fileAssetId },
          })
        )
      );
    }

    await this.drizzle.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

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
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    await this.drizzle.chatConversationMember.updateMany({
      where: { conversationId, profileId: me },
      data: { lastReadAt: new Date() },
    });
    this.realtime.emitConversation(conversationId, 'message:read', {
      conversation_id: conversationId.toString(),
      profile_id: me.toString(),
      read_at: new Date().toISOString(),
    });
    return { success: true };
  }

  async unreadCount(profileId: string) {
    const me = this.parseId(profileId, 'profile id');
    const memberships = await this.drizzle.chatConversationMember.findMany({
      where: { profileId: me },
      select: { conversationId: true },
    });
    if (!memberships.length) return { unread_count: 0 };
    const counts = await this.getUnreadForConversations(
      me,
      memberships.map((m) => m.conversationId)
    );
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return { unread_count: total };
  }

  async addMembers(profileId: string, conversationIdRaw: string, memberIdsRaw: string[]) {
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    const conversation = await this.requireConversation(conversationId);
    if (conversation.type !== 'group') {
      throw new BadRequestException('Members can only be added to group conversations');
    }
    await this.requireMembership(me, conversationId);

    const memberIds = Array.from(new Set(memberIdsRaw.map((id) => this.parseId(id, 'member id'))));
    const profiles = await this.drizzle.profile.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });
    if (profiles.length !== memberIds.length) {
      throw new BadRequestException('One or more member profiles do not exist');
    }

    const existing = await this.drizzle.chatConversationMember.findMany({
      where: { conversationId, profileId: { in: memberIds } },
      select: { profileId: true },
    });
    const existingIds = new Set(existing.map((row) => row.profileId.toString()));
    const toAdd = memberIds.filter((id) => !existingIds.has(id.toString()));

    if (toAdd.length) {
      await this.drizzle.chatConversationMember.createMany({
        data: toAdd.map((profileUserId) => ({ conversationId, profileId: profileUserId, role: 'member' })),
      });
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
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    const targetProfileId = this.parseId(memberProfileIdRaw, 'member profile id');
    await this.requireMembership(me, conversationId);
    const myMembership = await this.drizzle.chatConversationMember.findFirst({
      where: { conversationId, profileId: me },
    });
    if (!myMembership || myMembership.role !== 'admin') {
      throw new BadRequestException('Only conversation admins can update member roles');
    }
    const updated = await this.drizzle.chatConversationMember.updateMany({
      where: { conversationId, profileId: targetProfileId },
      data: { role: dto.role },
    });
    if (!updated.count) throw new NotFoundException('Member not found in conversation');
    return { success: true };
  }

  async removeMember(profileId: string, conversationIdRaw: string, memberProfileIdRaw: string) {
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    const targetProfileId = this.parseId(memberProfileIdRaw, 'member profile id');
    await this.requireMembership(me, conversationId);
    const myMembership = await this.drizzle.chatConversationMember.findFirst({
      where: { conversationId, profileId: me },
    });
    if (!myMembership || myMembership.role !== 'admin') {
      throw new BadRequestException('Only conversation admins can remove members');
    }
    const removed = await this.drizzle.chatConversationMember.deleteMany({
      where: { conversationId, profileId: targetProfileId },
    });
    if (!removed.count) throw new NotFoundException('Member not found in conversation');
    this.realtime.emitConversation(conversationId, 'conversation:member_left', {
      conversation_id: conversationId.toString(),
      profile_id: targetProfileId.toString(),
    });
    return { success: true };
  }

  async leave(profileId: string, conversationIdRaw: string) {
    const me = this.parseId(profileId, 'profile id');
    const conversationId = this.parseId(conversationIdRaw, 'conversation id');
    await this.requireMembership(me, conversationId);
    await this.drizzle.chatConversationMember.deleteMany({
      where: { conversationId, profileId: me },
    });
    this.realtime.emitConversation(conversationId, 'conversation:member_left', {
      conversation_id: conversationId.toString(),
      profile_id: me.toString(),
    });
    return { success: true };
  }
}