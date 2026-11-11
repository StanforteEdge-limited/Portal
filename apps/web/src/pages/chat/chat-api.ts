import { httpRequest } from "@/shared/lib/core";

export type ChatMessageAttachment = {
  id: string;
  file_asset_id: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: string | null;
  storage_path: string | null;
  public_url: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_profile_id: string | null;
  sender_name: string | null;
  body: string | null;
  reply_to_message_id: string | null;
  attachments: ChatMessageAttachment[];
  created_at: string;
};

export type ChatMember = {
  profile_id: string;
  role: "admin" | "member";
  last_read_at?: string | null;
  joined_at: string;
  name: string;
};

export type ChatConversation = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  description?: string | null;
  member_count: number;
  unread_count: number;
  last_message?: {
    id: string;
    body: string | null;
    sender_profile_id: string | null;
    sender_name: string | null;
    created_at: string;
  } | null;
  created_at: string;
  updated_at: string;
  members?: ChatMember[];
};

export async function listConversations(): Promise<ChatConversation[]> {
  const res = await httpRequest<{ data: ChatConversation[]; total: number }>("/chat/conversations");
  const data = (res as any)?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function getConversation(conversationId: string): Promise<ChatConversation> {
  const res = await httpRequest<any>(`/chat/conversations/${conversationId}`);
  return (res as any)?.data ?? res;
}

export async function createConversation(dto: {
  type: "direct" | "group";
  name?: string;
  description?: string;
  member_ids: string[];
}): Promise<ChatConversation> {
  const res = await httpRequest<any>("/chat/conversations", {
    method: "POST",
    body: dto,
  });
  return (res as any)?.data ?? res;
}

export async function listMessages(
  conversationId: string,
  params?: { per_page?: number; before_id?: string }
): Promise<{ data: ChatMessage[]; has_more: boolean; next_cursor: string | null }> {
  const query = new URLSearchParams();
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.before_id) query.set("before_id", params.before_id);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/chat/conversations/${conversationId}/messages${qs}`);
  const result = (res as any)?.data ?? res;
  return {
    data: Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [],
    has_more: Boolean(result?.has_more),
    next_cursor: result?.next_cursor ?? null,
  };
}

export async function sendChatMessage(
  conversationId: string,
  dto: { body?: string; file_asset_ids?: string[]; reply_to_message_id?: string }
): Promise<ChatMessage> {
  const res = await httpRequest<any>(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: dto,
  });
  return (res as any)?.data ?? res;
}

export async function markChatRead(conversationId: string): Promise<void> {
  await httpRequest<any>(`/chat/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export async function getUnreadChatCount(): Promise<number> {
  try {
    const res = await httpRequest<any>("/chat/unread-count");
    const data = (res as any)?.data ?? res;
    return Number(data?.unread_count ?? 0);
  } catch {
    return 0;
  }
}

export async function addConversationMembers(
  conversationId: string,
  memberIds: string[]
): Promise<ChatConversation> {
  const res = await httpRequest<any>(`/chat/conversations/${conversationId}/members`, {
    method: "POST",
    body: { member_ids: memberIds },
  });
  return (res as any)?.data ?? res;
}
