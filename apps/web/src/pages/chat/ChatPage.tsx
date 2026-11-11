import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Hash,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { formatDisplayTime, formatDisplayDate } from "@/shared/lib/localization";
import { uploadFileAsset, type FileAssetRecord } from "@/pages/files/files-api";
import {
  listConversations,
  getConversation,
  listMessages,
  sendChatMessage,
  markChatRead,
  type ChatConversation,
  type ChatMessage,
  type ChatMessageAttachment,
} from "./chat-api";
import { NewConversationModal } from "./NewConversationModal";

export default function ChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Composer
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<FileAssetRecord[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  activeConvIdRef.current = selectedConversation?.id ?? null;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // Load conversations
  const loadConversations = useCallback(async (selectFirst = false) => {
    try {
      const data = await listConversations();
      setConversations(data);
      if (selectFirst && data.length > 0 && !activeConvIdRef.current) {
        setSelectedConversation(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations(true);
    const interval = setInterval(() => loadConversations(false), 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);
      const res = await listMessages(convId, { per_page: 100 });
      setMessages(res.data);
      if (!silent) {
        setTimeout(() => scrollToBottom(false), 100);
      }
      // Mark read
      markChatRead(convId).catch(() => {});
    } catch (err: any) {
      console.error("Failed to load messages", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);

    const interval = setInterval(() => {
      if (activeConvIdRef.current === selectedConversation.id) {
        loadMessages(selectedConversation.id, true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedConversation?.id, loadMessages]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const lastMsgMatch = c.last_message?.body?.toLowerCase().includes(q);
    return Boolean(nameMatch || lastMsgMatch);
  });

  // Handle direct file upload via presigned URL
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      showToast({ tone: "info", title: "Uploading File", message: `Directly uploading ${file.name} to storage...` });
      const asset = await uploadFileAsset({
        file,
        name: file.name,
        category: "chat",
      });
      setPendingAttachments((prev) => [...prev, asset]);
      showToast({ tone: "success", title: "Ready", message: `${file.name} attached.` });
    } catch (err: any) {
      showToast({ tone: "danger", title: "Upload Failed", message: err?.message || "Could not upload file to storage" });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Send message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedConversation) return;

    const body = inputText.trim();
    const fileAssetIds = pendingAttachments.map((a) => a.id);

    if (!body && fileAssetIds.length === 0) return;

    try {
      setSending(true);
      const sent = await sendChatMessage(selectedConversation.id, {
        body: body || undefined,
        file_asset_ids: fileAssetIds.length > 0 ? fileAssetIds : undefined,
      });

      setMessages((prev) => [...prev, sent]);
      setInputText("");
      setPendingAttachments([]);
      setTimeout(() => scrollToBottom(true), 50);

      // Update conversation list locally
      loadConversations(false);
    } catch (err: any) {
      showToast({ tone: "danger", title: "Message Failed", message: err?.message || "Could not send message" });
    } finally {
      setSending(false);
    }
  }

  const myId = String(user?.id ?? "");

  return (
    <div className="flex h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      {/* LEFT SIDEBAR: Conversations List */}
      <div className="w-80 md:w-96 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 shrink-0">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Team Chat</h1>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition flex items-center gap-1.5 text-xs font-semibold"
              title="New Message or Channel"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-200/50 dark:bg-neutral-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 py-1 text-center rounded-md transition ${
                filterType === "all"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-bold shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("direct")}
              className={`flex-1 py-1 text-center rounded-md transition ${
                filterType === "direct"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-bold shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`flex-1 py-1 text-center rounded-md transition ${
                filterType === "group"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-bold shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              Channels
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {loadingConversations && conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">No conversations found</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const isChannel = conv.type === "group";
              const title = conv.name || (isChannel ? "Group Channel" : "Direct Message");
              const initials = title.slice(0, 2).toUpperCase();

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition relative ${
                    isSelected
                      ? "bg-orange-50/80 dark:bg-orange-950/20 text-neutral-900 dark:text-neutral-100"
                      : "hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {/* Avatar / Channel Hash */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
                        isChannel
                          ? "bg-neutral-800 text-white dark:bg-neutral-700"
                          : "bg-gradient-to-tr from-orange-500 to-amber-500 text-white"
                      }`}
                    >
                      {isChannel ? <Hash className="w-5 h-5" /> : initials}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-neutral-900">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold truncate text-neutral-900 dark:text-neutral-100">
                        {isChannel ? `#${title}` : title}
                      </span>
                      {conv.last_message?.created_at && (
                        <span className="text-[10px] text-neutral-400 shrink-0 ml-1">
                          {formatDisplayTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {conv.last_message ? (
                        <span>
                          {conv.last_message.sender_profile_id === myId
                            ? "You: "
                            : conv.last_message.sender_name
                              ? `${conv.last_message.sender_name.split(" ")[0]}: `
                              : ""}
                          {conv.last_message.body || "📎 Sent an attachment"}
                        </span>
                      ) : (
                        <span className="italic text-neutral-400">No messages yet</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Message Thread & Composer */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
          {/* Thread Header */}
          <div className="px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  selectedConversation.type === "group"
                    ? "bg-neutral-800 text-white"
                    : "bg-gradient-to-tr from-orange-500 to-amber-500 text-white"
                }`}
              >
                {selectedConversation.type === "group" ? (
                  <Hash className="w-5 h-5" />
                ) : (
                  (selectedConversation.name || "DM").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {selectedConversation.type === "group"
                      ? `#${selectedConversation.name}`
                      : selectedConversation.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 capitalize">
                    {selectedConversation.type}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 truncate">
                  {selectedConversation.description || `${selectedConversation.member_count} member(s)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMessages(selectedConversation.id)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-xs flex items-center gap-1"
                title="Refresh messages"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Welcome to {selectedConversation.name || "the conversation"}!
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Send a friendly greeting or share documents and files directly with your team.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_profile_id === myId;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const isSequential = prevMsg && prevMsg.sender_profile_id === msg.sender_profile_id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center shrink-0 mb-1">
                        {(msg.sender_name || "User").slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className={`max-w-[80%] sm:max-w-md md:max-w-lg space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && !isSequential && (
                        <div className="flex items-center gap-2 pl-1">
                          <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-200">
                            {msg.sender_name || "Colleague"}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {formatDisplayTime(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs shadow-xs break-words ${
                          isMe
                            ? "bg-orange-600 text-white rounded-br-xs"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-xs"
                        }`}
                      >
                        {msg.body && <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`space-y-2 ${msg.body ? "mt-2 pt-2 border-t" : ""} ${isMe ? "border-white/20" : "border-neutral-200 dark:border-neutral-700"}`}>
                            {msg.attachments.map((att) => {
                              const isImage = att.mime_type?.startsWith("image/");
                              const fileUrl = att.public_url || "";

                              if (isImage && fileUrl) {
                                return (
                                  <div key={att.id} className="rounded-xl overflow-hidden max-w-xs group relative">
                                    <img
                                      src={fileUrl}
                                      alt={att.file_name || "Image"}
                                      className="w-full max-h-48 object-cover rounded-xl border border-neutral-200/40"
                                      loading="lazy"
                                    />
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1"
                                    >
                                      <Download className="w-4 h-4" /> View Full
                                    </a>
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={att.id}
                                  href={fileUrl || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                                    isMe
                                      ? "bg-orange-700/60 hover:bg-orange-700 border-orange-500/30 text-white"
                                      : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate text-[11px]">{att.file_name || "Attachment"}</div>
                                    <div className="text-[10px] opacity-75">{att.mime_type || "File"}</div>
                                  </div>
                                  <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {isMe && (
                        <div className="text-[10px] text-neutral-400 text-right pr-1">
                          {formatDisplayTime(msg.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* COMPOSER */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60">
            {/* Attached file chips */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingAttachments.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800/60 text-xs font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    <span className="truncate max-w-[150px]">{asset.file_name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments((prev) => prev.filter((a) => a.id !== asset.id))}
                      className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-900 rounded-md transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                multiple={false}
              />

              <button
                type="button"
                disabled={uploadingAttachment}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition shrink-0 shadow-xs"
                title="Attach any file (presigned upload directly to S3)"
              >
                {uploadingAttachment ? (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${selectedConversation.type === "group" ? `#${selectedConversation.name}` : selectedConversation.name || "colleague"}...`}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && pendingAttachments.length === 0)}
                className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white shadow-sm transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty selection state */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-neutral-900">
          <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Select a conversation</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
            Choose a coworker or group channel from the left sidebar, or start a new conversation.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(conv) => {
          setConversations((prev) => [conv, ...prev]);
          setSelectedConversation(conv);
          showToast({ tone: "success", title: "Conversation Started", message: `Connected to ${conv.name || "chat"}` });
        }}
      />
    </div>
  );
}
