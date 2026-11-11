import { useState, useEffect } from "react";
import { X, Search, Users, MessageSquare, Check, UserPlus, Hash } from "lucide-react";
import { hrApi } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { createConversation, type ChatConversation } from "./chat-api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conv: ChatConversation) => void;
};

type Colleague = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export function NewConversationModal({ isOpen, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<"direct" | "group">("direct");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedIds([]);
    setName("");
    setDescription("");
    setSearch("");

    async function loadColleagues() {
      try {
        setLoading(true);
        const res = await hrApi.listEmployees({ status: "active", per_page: 100 });
        const list = Array.isArray((res as any)?.result)
          ? (res as any).result
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : [];

        const myId = String(user?.id ?? "");
        const formatted: Colleague[] = list
          .map((item: any) => {
            const profile = item.profile ?? item;
            const id = String(profile.id ?? item.id ?? item.profile_id ?? "");
            const name =
              `${profile.first_name ?? profile.firstName ?? ""} ${profile.last_name ?? profile.lastName ?? ""}`.trim() ||
              profile.name ||
              profile.email ||
              "Colleague";
            return {
              id,
              name,
              email: profile.email || "",
              role: item.designation?.title || item.job_title || profile.role || "",
            };
          })
          .filter((c: Colleague) => c.id && c.id !== myId);

        setColleagues(formatted);
      } catch (err: any) {
        console.error("Failed to load employees for chat", err);
      } finally {
        setLoading(false);
      }
    }

    loadColleagues();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const filtered = colleagues.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleMember(id: string) {
    if (type === "direct") {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  }

  async function handleStart() {
    setError(null);
    if (selectedIds.length === 0) {
      setError("Please select at least one colleague to start chatting.");
      return;
    }
    if (type === "group" && !name.trim()) {
      setError("Please provide a name for this group/channel.");
      return;
    }

    try {
      setSubmitting(true);
      const conv = await createConversation({
        type,
        name: type === "group" ? name.trim() : undefined,
        description: type === "group" && description.trim() ? description.trim() : undefined,
        member_ids: selectedIds,
      });
      onCreated(conv);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create conversation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              New Conversation
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Send a direct message or create a group channel with your team.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType("direct");
                if (selectedIds.length > 1) setSelectedIds([selectedIds[0]]);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                type === "direct"
                  ? "bg-white dark:bg-neutral-900 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Direct Message
            </button>
            <button
              type="button"
              onClick={() => setType("group")}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                type === "group"
                  ? "bg-white dark:bg-neutral-900 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Hash className="w-4 h-4" />
              Group Channel
            </button>
          </div>

          {/* Group details (if group) */}
          {type === "group" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Channel Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. general-team or Lagos-HQ"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Purpose of this channel"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Colleague Search & List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {type === "direct" ? "Select a Colleague" : "Select Channel Members"}
              </label>
              {selectedIds.length > 0 && (
                <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-y-auto max-h-52 divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <div className="p-4 text-center text-xs text-neutral-400">Loading team members...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">No colleagues found.</div>
              ) : (
                filtered.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleMember(c.id)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs cursor-pointer transition ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-950/20 text-neutral-900 dark:text-neutral-100"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold truncate">{c.name}</div>
                          <div className="text-[11px] text-neutral-400 truncate">{c.email || c.role}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSelected
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || selectedIds.length === 0}
            onClick={handleStart}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white shadow-sm transition flex items-center gap-2"
          >
            {submitting ? "Starting..." : type === "direct" ? "Start Chat" : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

