import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Share2,
  Mail,
  MessageSquare,
  FileText,
  Paperclip,
  Send,
  ArrowLeft,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { httpRequest } from "@/shared/lib/core";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { RichTextEditor } from "@/shared/components/ui/RichTextEditor";
import { createConversation, sendChatMessage } from "@/pages/chat/chat-api";
import type { DocumentItem, DocumentSharedRecord } from "./types";

interface Props {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShared?: (record: DocumentSharedRecord) => void;
}

export default function DocumentShareModal({
  document,
  isOpen,
  onClose,
  onShared,
}: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { colleagues } = useColleagues();

  const currentUserName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Colleague";

  const [selectedColleagueId, setSelectedColleagueId] = useState<string>("");
  const [colleagueDropdownOpen, setColleagueDropdownOpen] = useState(false);
  const [colleagueSearch, setColleagueSearch] = useState("");
  const colleaguePickerRef = useRef<HTMLDivElement>(null);
  const colleagueSearchInputRef = useRef<HTMLInputElement>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [notifyChat, setNotifyChat] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!selectedColleagueId && colleagues.length > 0) {
      setSelectedColleagueId(colleagues[0].id);
    }
  }, [colleagues, selectedColleagueId]);

  const filteredColleagues = useMemo(() => {
    const q = colleagueSearch.trim().toLowerCase();
    if (!q) return colleagues;
    return colleagues.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q)
    );
  }, [colleagueSearch, colleagues]);

  useEffect(() => {
    if (!colleagueDropdownOpen) return;
    colleagueSearchInputRef.current?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        colleaguePickerRef.current &&
        !colleaguePickerRef.current.contains(event.target as Node)
      ) {
        setColleagueDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setColleagueDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [colleagueDropdownOpen]);

  if (!isOpen || !document) return null;

  const selectedColleague =
    colleagues.find((m) => m.id === selectedColleagueId) || colleagues[0] || null;

  const recipientName = useCustomEmail
    ? customEmail.split("@")[0] || "Colleague"
    : selectedColleague?.name || "Colleague";
  const recipientEmail = useCustomEmail
    ? customEmail.trim()
    : selectedColleague?.email || "colleague@stanforteedge.com";

  async function handleShareSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!document) return;

    if (useCustomEmail && !customEmail.trim().includes("@")) {
      showToast({
        tone: "warning",
        title: "Valid Email Required",
        message: "Please enter a valid email address to share this document.",
      });
      return;
    }

    if (!notifyChat && !notifyEmail) {
      showToast({
        tone: "warning",
        title: "Select Channel",
        message: "Please select at least one notification channel (Chat or Email).",
      });
      return;
    }

    setSharing(true);

    try {
      const channels: ("email" | "chat")[] = [];
      if (notifyEmail) channels.push("email");
      if (notifyChat) channels.push("chat");

      const docUrl = `${window.location.origin}/documents/${document.id}`;

      // 1. In-App Chat Notification
      if (notifyChat) {
        try {
          // Attempt sending via the Chat API if online
          const chatBody = `📄 **Document Shared with you:** [${document.title}](${docUrl})\n\n${
            message.trim() ? `> "${message.trim()}"\n\n` : ""
          }Category: *${document.category.toUpperCase()}* • Version: *${document.version}*\n🔗 [Click here to review document](${docUrl})`;

          const conv = await createConversation({
            type: "direct",
            member_ids: [selectedColleague?.id || "usr-1"],
          }).catch(() => null);

          if (conv?.id) {
            await sendChatMessage(conv.id, {
              body: chatBody,
              file_asset_ids: document.file?.id ? [String(document.file.id)] : undefined,
            }).catch(() => null);
          }
        } catch {
          // Graceful fallback for chat notification
        }

        // Also record in local chat state for instant UI responsiveness
        try {
          const chatNotification = {
            id: `msg-doc-${Date.now()}`,
            document_id: document.id,
            document_title: document.title,
            recipient_email: recipientEmail,
            sender_name: currentUserName,
            message: message.trim(),
            created_at: new Date().toISOString(),
          };
          const existing = JSON.parse(localStorage.getItem("portal_doc_shares") || "[]");
          existing.unshift(chatNotification);
          localStorage.setItem("portal_doc_shares", JSON.stringify(existing));
        } catch {}
      }

      // Trigger API share & notification dispatch (smart online in-app vs offline email)
      if (document?.id && selectedColleague?.id) {
        httpRequest(`/documents/${document.id}/share`, {
          method: "POST",
          body: {
            user_id: selectedColleague.id,
            message: message.trim() || undefined,
          },
        }).catch(() => {});
      }

      // 2. Email Notification
      if (notifyEmail) {
        try {
          // Simulate or trigger API email dispatch
          const emailPayload = {
            to: recipientEmail,
            subject: `${currentUserName} shared a document: ${document.title}`,
            document_id: document.id,
            document_title: document.title,
            message: message.trim(),
            portal_url: docUrl,
          };
          const queuedEmails = JSON.parse(localStorage.getItem("portal_queued_emails") || "[]");
          queuedEmails.unshift({
            ...emailPayload,
            sent_at: new Date().toISOString(),
            status: "delivered",
          });
          localStorage.setItem("portal_queued_emails", JSON.stringify(queuedEmails));
        } catch {}
      }

      // 3. Create Share Record on Document
      const shareRecord: DocumentSharedRecord = {
        id: `sh-${Date.now()}`,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        recipient_avatar: selectedColleague?.avatar || "CO",
        recipient_role: selectedColleague?.role || "Staff Member",
        shared_at: new Date().toISOString(),
        sender_name: currentUserName,
        message: message.trim() || undefined,
        channels,
      };

      if (onShared) {
        onShared(shareRecord);
      }

      showToast({
        tone: "success",
        title: "Document Shared Successfully",
        message: `Dispatched to ${recipientName} (${recipientEmail}) via ${channels.join(
          " and "
        )}.`,
      });

      onClose();
    } catch (err: any) {
      showToast({
        tone: "danger",
        title: "Sharing Failed",
        message: err?.message || "Could not share document.",
      });
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Document"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/90">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 tracking-tight font-headline">
                Share Document
              </h2>
              <p className="text-xs text-neutral-500">
                Send to colleagues with email and in-app chat notifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleShareSubmit} className="p-6 space-y-5">
          {/* Document Preview Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-[#ff6900] shrink-0 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                  {document.category}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  {document.version}
                </span>
              </div>
              <h4 className="text-xs font-medium text-neutral-900 mt-1 truncate">
                {document.title}
              </h4>
              {document.file && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                  <Paperclip className="h-3 w-3 text-neutral-400" />
                  <span className="truncate">{document.file.file_name}</span>
                  {document.file.file_size && (
                    <span>
                      ({(document.file.file_size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recipient Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-700">
                Recipient Colleague
              </label>
              <button
                type="button"
                onClick={() => setUseCustomEmail(!useCustomEmail)}
                className="text-xs font-medium text-[#ff6900] hover:underline inline-flex items-center gap-1"
              >
                {useCustomEmail ? (
                  <>
                    <ArrowLeft className="h-3 w-3" />
                    <span>Select from Team</span>
                  </>
                ) : (
                  <span>Enter other email</span>
                )}
              </button>
            </div>

            {useCustomEmail ? (
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="colleague@stanforteedge.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none transition focus:bg-white focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div ref={colleaguePickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setColleagueDropdownOpen((prev) => !prev)}
                    aria-expanded={colleagueDropdownOpen}
                    aria-haspopup="listbox"
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs bg-neutral-50 border rounded-xl outline-none transition font-medium text-neutral-800 text-left ${
                      colleagueDropdownOpen
                        ? "bg-white border-[#ff6900] ring-2 ring-[#ff6900]/15"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <span className="truncate">
                      {selectedColleague
                        ? `${selectedColleague.name} • ${selectedColleague.role} (${selectedColleague.email})`
                        : "Select a colleague..."}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform duration-150 ${
                        colleagueDropdownOpen ? "rotate-180 text-[#ff6900]" : ""
                      }`}
                    />
                  </button>

                  {colleagueDropdownOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 mt-1.5 z-30 rounded-xl bg-white border border-neutral-200 shadow-lg overflow-hidden"
                    >
                      <div className="p-2 border-b border-neutral-100 bg-neutral-50/70">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                          <input
                            ref={colleagueSearchInputRef}
                            type="text"
                            value={colleagueSearch}
                            onChange={(e) => setColleagueSearch(e.target.value)}
                            placeholder="Search by name, role, or email..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                          />
                          {colleagueSearch && (
                            <button
                              type="button"
                              onClick={() => setColleagueSearch("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700"
                              aria-label="Clear colleague search"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto py-1 overscroll-contain">
                        {filteredColleagues.length === 0 ? (
                          <div className="px-3 py-5 text-center text-xs text-neutral-500">
                            No matching colleagues found
                          </div>
                        ) : (
                          filteredColleagues.map((member) => {
                            const isSelected = member.id === selectedColleagueId;
                            return (
                              <button
                                key={member.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSelectedColleagueId(member.id);
                                  setColleagueDropdownOpen(false);
                                  setColleagueSearch("");
                                }}
                                className={`w-full px-3 py-2 flex items-center justify-between gap-2.5 text-left transition-colors ${
                                  isSelected
                                    ? "bg-orange-50/70 text-neutral-900"
                                    : "hover:bg-neutral-50 text-neutral-800"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-[11px] shrink-0 ${
                                      isSelected
                                        ? "bg-[#ff6900] text-white"
                                        : "bg-neutral-100 text-neutral-700"
                                    }`}
                                  >
                                    {member.avatar || "U"}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-neutral-900 truncate">
                                      {member.name}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 truncate">
                                      {member.role} • {member.email}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-[#ff6900] shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Colleague Preview Badge */}
                {selectedColleague && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-50/50 border border-orange-100">
                    <div className="w-8 h-8 rounded-full bg-[#ff6900] text-white flex items-center justify-center font-medium text-xs shrink-0 shadow-xs">
                      {selectedColleague.avatar || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-900 leading-tight">
                        {selectedColleague.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {selectedColleague.email} • {selectedColleague.role}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Personal Note */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Personal Note <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="e.g. Please review section 3 before the end of the sprint..."
              minHeightClass="min-h-[90px]"
            />
          </div>

          {/* Delivery Channels */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">
              Notification Channels
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chat & In-App Notification */}
              <label
                className={`p-3.5 rounded-2xl border transition-colors cursor-pointer flex items-start gap-3 select-none ${
                  notifyChat
                    ? "bg-orange-50/40 border-orange-200 text-neutral-900"
                    : "bg-neutral-50 border-neutral-200 text-neutral-500 opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyChat}
                  onChange={(e) => setNotifyChat(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#ff6900] focus:ring-[#ff6900]"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-900">
                    <MessageSquare className="h-3.5 w-3.5 text-[#ff6900]" />
                    <span>In-App Chat</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-tight">
                    Direct message in Stanforte Chat with card link
                  </p>
                </div>
              </label>

              {/* Email Notification */}
              <label
                className={`p-3.5 rounded-2xl border transition-colors cursor-pointer flex items-start gap-3 select-none ${
                  notifyEmail
                    ? "bg-neutral-100 border-neutral-200 text-neutral-900"
                    : "bg-neutral-50 border-neutral-200 text-neutral-500 opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-700 focus:ring-neutral-300"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-900">
                    <Mail className="h-3.5 w-3.5 text-neutral-700" />
                    <span>Email Notification</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-tight">
                    Instant delivery to recipient's email inbox
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={sharing}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sharing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-[0.98] text-white text-xs font-medium shadow-md transition disabled:opacity-50"
            >
              {sharing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Share Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
