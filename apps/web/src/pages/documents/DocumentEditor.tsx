import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  AtSign,
  Hash,
  X,
  Plus,
  Save,
  Maximize2,
  Minimize2,
  MessageSquare,
  CheckCircle2,
  Send,
  Users,
  Undo2,
  Redo2,
  Pencil,
} from "lucide-react";
import { useColleagues } from "@/shared/hooks/useColleagues";
import type { DocumentComment } from "./types";

interface RichDocumentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  readOnly?: boolean;
}

/**
 * Lightweight, zero-dependency rich text editor with formatting toolbar and @mention insertion.
 */
export function RichDocumentEditor({
  value,
  onChange,
  placeholder = "Start writing, use the toolbar to format, or click @ to tag a colleague...",
  minHeightClass = "min-h-[220px]",
  readOnly = false,
}: RichDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { colleagues } = useColleagues();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const lastHtmlRef = useRef<string>(value);

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastHtmlRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value || "");
      lastHtmlRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value);
      lastHtmlRef.current = value;
    }
  }, []);

  const filteredMembers = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return colleagues;
    return colleagues.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q),
    );
  }, [mentionQuery, colleagues]);

  function emitChange() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  }

  function exec(command: string, commandValue?: string) {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function insertLink() {
    if (readOnly) return;
    const url = window.prompt("Enter link URL (https://...)");
    if (!url) return;
    exec("createLink", url.trim());
  }

  function insertMention(member: { id: string; name: string }) {
    if (readOnly) return;
    editorRef.current?.focus();
    const chipHtml = `<span data-mention-id="${member.id}" contenteditable="false" class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-orange-50 text-[#c2410c] border border-orange-200/70 text-xs font-medium">@${member.name}</span>&nbsp;`;
    document.execCommand("insertHTML", false, chipHtml);
    emitChange();
    setMentionOpen(false);
    setMentionQuery("");
  }

  const toolbarButtons = [
    { icon: Heading2, label: "Heading 2", action: () => exec("formatBlock", "H2") },
    { icon: Heading3, label: "Heading 3", action: () => exec("formatBlock", "H3") },
    { icon: Bold, label: "Bold", action: () => exec("bold") },
    { icon: Italic, label: "Italic", action: () => exec("italic") },
    { icon: Underline, label: "Underline", action: () => exec("underline") },
    { icon: List, label: "Bullet list", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", action: () => exec("insertOrderedList") },
    { icon: Quote, label: "Blockquote", action: () => exec("formatBlock", "BLOCKQUOTE") },
    { icon: Code, label: "Code block", action: () => exec("formatBlock", "PRE") },
    { icon: Link2, label: "Insert link", action: insertLink },
    { icon: Undo2, label: "Undo", action: () => exec("undo") },
    { icon: Redo2, label: "Redo", action: () => exec("redo") },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-visible">
      {!readOnly && (
        <div className="px-2.5 py-2 border-b border-neutral-100 bg-neutral-50/80 rounded-t-xl flex flex-wrap items-center gap-1 relative">
          {toolbarButtons.map((btn) => {
            const BtnIcon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  btn.action();
                }}
                title={btn.label}
                aria-label={btn.label}
                className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
              >
                <BtnIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            );
          })}

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* @Mention Colleague Picker */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMentionOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#c2410c] bg-orange-50 hover:bg-orange-100 border border-orange-200/60 transition-colors"
              title="Tag / mention a colleague"
            >
              <AtSign className="h-3.5 w-3.5" />
              <span>Mention</span>
            </button>

            {mentionOpen && (
              <div className="absolute left-0 mt-1.5 z-40 w-64 rounded-xl bg-white border border-neutral-200 shadow-lg overflow-hidden">
                <div className="p-2 border-b border-neutral-100 bg-neutral-50/70">
                  <input
                    type="text"
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    placeholder="Search colleague to tag..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900]"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto py-1">
                  {filteredMembers.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400 text-center">No matching colleagues</p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(m);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-orange-50/60 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#ff6900] text-white text-[10px] font-medium flex items-center justify-center shrink-0">
                          {m.avatar || m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-neutral-900 truncate">{m.name}</div>
                          <div className="text-[11px] text-neutral-500 truncate">{m.role || m.email}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyDown={(e) => {
          if (!readOnly && e.key === "@") {
            setMentionOpen(true);
          }
        }}
        data-placeholder={placeholder}
        className={`${minHeightClass} p-4 prose prose-sm max-w-none text-neutral-800 leading-relaxed font-sans outline-none focus:bg-white empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-[#ff6900] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:text-xs [&_a]:text-[#ff6900] [&_a]:underline`}
      />
    </div>
  );
}

interface TagInputProps {
  tags: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

export function DocumentTagBar({ tags, onChange, readOnly = false }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  function addTag() {
    const cleaned = draft.trim().toLowerCase().replace(/^#/, "");
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06]"
        >
          <Hash className="h-3 w-3 text-neutral-400" />
          <span>{tag}</span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-neutral-400 hover:text-neutral-800 ml-0.5"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      {!readOnly &&
        (adding ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              onBlur={addTag}
              placeholder="tag name..."
              autoFocus
              className="w-28 px-2 py-0.5 text-xs bg-white border border-neutral-300 rounded-md outline-none focus:border-[#ff6900]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-neutral-500 hover:text-[#ff6900] hover:bg-orange-50 border border-dashed border-neutral-300 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Add tag</span>
          </button>
        ))}
    </div>
  );
}

interface CollaborativeDocumentWorkspaceProps {
  title: string;
  authorName?: string;
  contentHtml: string;
  tags: string[];
  comments: DocumentComment[];
  currentUserName: string;
  saving?: boolean;
  onSave: (payload: { content_html: string; tags: string[]; comments: DocumentComment[] }) => Promise<void> | void;
}

/**
 * Full collaborative document editor workspace used inside DocumentDetailPage:
 * supports rich editing, #tags, @mentions, collaboration comments, and full-screen focus mode.
 */
export function CollaborativeDocumentWorkspace({
  title,
  authorName,
  contentHtml,
  tags,
  comments,
  currentUserName,
  saving = false,
  onSave,
}: CollaborativeDocumentWorkspaceProps) {
  const [editing, setEditing] = useState(false);
  const [focusedModal, setFocusedModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [draftHtml, setDraftHtml] = useState(contentHtml);
  const [draftTags, setDraftTags] = useState<string[]>(tags);
  const [draftComments, setDraftComments] = useState<DocumentComment[]>(comments);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setDraftHtml(contentHtml);
  }, [contentHtml]);

  useEffect(() => {
    setDraftTags(tags);
  }, [tags]);

  useEffect(() => {
    setDraftComments(comments);
  }, [comments]);

  const isDirty = draftHtml !== contentHtml || JSON.stringify(draftTags) !== JSON.stringify(tags);

  async function handleSave() {
    await onSave({
      content_html: draftHtml,
      tags: draftTags,
      comments: draftComments,
    });
    setEditing(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    const initials = currentUserName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const next: DocumentComment[] = [
      ...draftComments,
      {
        id: `cmt-${Date.now()}`,
        author_name: currentUserName,
        author_avatar: initials || "ST",
        body: text,
        created_at: new Date().toISOString(),
        resolved: false,
      },
    ];
    setDraftComments(next);
    setNewComment("");
    await onSave({
      content_html: draftHtml,
      tags: draftTags,
      comments: next,
    });
  }

  async function handleToggleResolve(commentId: string) {
    const next = draftComments.map((c) =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c,
    );
    setDraftComments(next);
    await onSave({
      content_html: draftHtml,
      tags: draftTags,
      comments: next,
    });
  }

  const openCommentCount = draftComments.filter((c) => !c.resolved).length;

  const editorBody = (
    <div
      className={
        focusedModal
          ? "w-full h-full flex flex-col bg-white rounded-none overflow-hidden"
          : "rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-visible"
      }
    >
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-neutral-900 font-headline truncate">
              {focusedModal ? title : "Collaborative Document Editor"}
            </h3>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Authored by {authorName || "Enterprise Operations"} • Edit, tag colleagues with @, and collaborate inline
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showComments
                ? "bg-orange-50 text-[#c2410c] border-orange-200/70"
                : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comments</span>
            {openCommentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#ff6900] text-white text-[10px] font-mono">
                {openCommentCount}
              </span>
            )}
          </button>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraftHtml(contentHtml);
                  setDraftTags(tags);
                  setEditing(false);
                }}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Save"}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setFocusedModal((prev) => !prev)}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
            title={focusedModal ? "Exit full-screen editor" : "Open full-screen editor"}
            aria-label={focusedModal ? "Exit full-screen editor" : "Open full-screen editor"}
          >
            {focusedModal ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Tags Bar */}
      <div className="px-6 py-2.5 border-b border-neutral-100 bg-white flex items-center justify-between gap-3 shrink-0">
        <DocumentTagBar
          tags={draftTags}
          onChange={(next) => {
            setDraftTags(next);
            if (!editing) {
              void onSave({ content_html: draftHtml, tags: next, comments: draftComments });
            }
          }}
        />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 shrink-0">
          <Users className="h-3.5 w-3.5" />
          <span>Collaborative workspace</span>
        </div>
      </div>

      {/* Main Split: Editor + Optional Comments Panel */}
      <div className={`flex flex-col lg:flex-row ${focusedModal ? "flex-1 min-h-0 overflow-hidden" : ""}`}>
        <div className={`flex-1 p-6 ${focusedModal ? "overflow-y-auto" : ""}`}>
          {editing ? (
            <RichDocumentEditor
              value={draftHtml}
              onChange={setDraftHtml}
              minHeightClass={focusedModal ? "min-h-[calc(100vh-240px)]" : "min-h-[260px]"}
            />
          ) : draftHtml ? (
            <div
              onDoubleClick={() => setEditing(true)}
              title="Double-click to edit"
              className="prose prose-sm max-w-none text-neutral-800 leading-relaxed font-sans space-y-4 cursor-text [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_blockquote]:border-l-2 [&_blockquote]:border-[#ff6900] [&_blockquote]:pl-3 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draftHtml) }}
            />
          ) : (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-neutral-500">No document content written yet.</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-50 text-[#c2410c] hover:bg-orange-100 border border-orange-200/70 text-xs font-medium transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Start writing in editor</span>
              </button>
            </div>
          )}
        </div>

        {showComments && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-100 bg-neutral-50/50 p-4 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-900">
                Comments ({draftComments.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 max-h-80 lg:max-h-[420px] overflow-y-auto pr-0.5">
              {draftComments.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  No comments yet. Start a review discussion below.
                </p>
              ) : (
                draftComments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      c.resolved
                        ? "bg-neutral-100/70 border-neutral-200/60 opacity-70"
                        : "bg-white border-neutral-200/80 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-[#c2410c] text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {c.author_avatar || c.author_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-neutral-900 truncate">{c.author_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleResolve(c.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                          c.resolved ? "text-emerald-600" : "text-neutral-400 hover:text-emerald-600"
                        }`}
                        title={c.resolved ? "Reopen comment" : "Resolve comment"}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    <p className="text-[11px] text-neutral-400">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={(e) => void handleAddComment(e)} className="flex items-center gap-1.5 pt-2 border-t border-neutral-200/70">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or @mention..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900]"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="p-2 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white disabled:opacity-40 transition-colors"
                aria-label="Post comment"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );

  if (focusedModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Editing ${title}`}
        className="fixed inset-0 z-[100] bg-neutral-950/60 flex"
      >
        {editorBody}
      </div>
    );
  }

  return editorBody;
}
