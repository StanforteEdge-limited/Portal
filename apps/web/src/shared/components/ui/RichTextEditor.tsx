import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { useColleagues } from "@/shared/hooks/useColleagues";

export interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  readOnly?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  enableMentions?: boolean;
  className?: string;
}

/**
 * Format raw content for contentEditable. If content is plain text with newlines,
 * convert line breaks so paragraphs are preserved.
 */
function prepareInitialContent(content?: string): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  const isHtml = /<[a-z][\s\S]*>/i.test(trimmed);
  if (isHtml) {
    return DOMPurify.sanitize(trimmed);
  }
  return DOMPurify.sanitize(trimmed.replace(/\n/g, "<br>"));
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write details, format with toolbar, or type @ to mention...",
  minHeightClass = "min-h-[120px]",
  readOnly = false,
  label,
  hint,
  error,
  enableMentions = true,
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionContainerRef = useRef<HTMLDivElement>(null);
  const { colleagues } = useColleagues();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const lastHtmlRef = useRef<string>(value);
  const savedSelectionRef = useRef<Range | null>(null);

  // Sync external value changes into editor
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    if (value !== lastHtmlRef.current && currentHtml !== value) {
      editorRef.current.innerHTML = prepareInitialContent(value);
      lastHtmlRef.current = value;
    }
  }, [value]);

  // Initial mount populate
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = prepareInitialContent(value);
      lastHtmlRef.current = value;
    }
  }, []);

  // Close mention popup when clicking outside
  useEffect(() => {
    if (!mentionOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        mentionContainerRef.current &&
        !mentionContainerRef.current.contains(e.target as Node)
      ) {
        setMentionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [mentionOpen]);

  // Trap Escape key in capture phase so it ONLY closes the mention popup without bubbling to SlideOver
  useEffect(() => {
    if (!mentionOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setMentionOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [mentionOpen]);

  const saveCurrentSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSavedSelection = useCallback(() => {
    if (!savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  }, []);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const textOnly = editorRef.current.innerText?.trim() || "";
    const cleaned = textOnly.length === 0 && !html.includes("<img") ? "" : html;
    lastHtmlRef.current = cleaned;
    onChange(cleaned);
  }, [onChange]);

  const exec = useCallback(
    (command: string, commandValue?: string) => {
      if (readOnly) return;
      editorRef.current?.focus();
      restoreSavedSelection();
      document.execCommand(command, false, commandValue);
      saveCurrentSelection();
      emitChange();
    },
    [readOnly, restoreSavedSelection, saveCurrentSelection, emitChange],
  );

  const insertLink = useCallback(() => {
    if (readOnly) return;
    saveCurrentSelection();
    const url = window.prompt("Enter link URL (https://...)");
    if (!url) return;
    restoreSavedSelection();
    exec("createLink", url.trim());
  }, [readOnly, saveCurrentSelection, restoreSavedSelection, exec]);

  const insertMention = useCallback(
    (member: { id: string; name: string }) => {
      if (readOnly) return;
      editorRef.current?.focus();
      restoreSavedSelection();

      const chipHtml = `<span data-mention-id="${member.id}" contenteditable="false" class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-orange-50 dark:bg-orange-950/60 text-[#c2410c] dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/80 text-xs font-medium">@${member.name}</span>&nbsp;`;
      document.execCommand("insertHTML", false, chipHtml);
      emitChange();
      setMentionOpen(false);
      setMentionQuery("");
    },
    [readOnly, restoreSavedSelection, emitChange],
  );

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

  const toolbarButtons = [
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => exec("bold") },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => exec("italic") },
    { icon: Underline, label: "Underline (Ctrl+U)", action: () => exec("underline") },
    { icon: Heading2, label: "Subheading (H2)", action: () => exec("formatBlock", "H2") },
    { icon: Heading3, label: "Section (H3)", action: () => exec("formatBlock", "H3") },
    { icon: List, label: "Bullet list", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", action: () => exec("insertOrderedList") },
    { icon: Quote, label: "Quote", action: () => exec("formatBlock", "BLOCKQUOTE") },
    { icon: Code, label: "Code block", action: () => exec("formatBlock", "PRE") },
    { icon: Link2, label: "Insert link", action: insertLink },
    { icon: Undo2, label: "Undo", action: () => exec("undo") },
    { icon: Redo2, label: "Redo", action: () => exec("redo") },
  ];

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
          {label}
        </label>
      )}

      <div
        className={`rounded-xl border transition-all overflow-visible ${
          error
            ? "border-rose-300 dark:border-rose-700 ring-2 ring-rose-100 dark:ring-rose-950/40 bg-white dark:bg-neutral-900"
            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus-within:border-[#C2410C] dark:focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#ff6900]/15"
        }`}
      >
        {!readOnly && (
          <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90 rounded-t-xl flex flex-wrap items-center gap-1 relative select-none">
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
                  className="p-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors"
                >
                  <BtnIcon className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              );
            })}

            {enableMentions && (
              <>
                <div className="h-3.5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

                <div className="relative" ref={mentionContainerRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveCurrentSelection();
                      setMentionOpen((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                      mentionOpen
                        ? "bg-orange-100 dark:bg-orange-900/60 text-[#c2410c] dark:text-orange-300"
                        : "text-[#c2410c] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100/80 dark:hover:bg-orange-900/50 border border-orange-200/60 dark:border-orange-800/60"
                    }`}
                    title="Tag a colleague"
                  >
                    <AtSign className="h-3 w-3" />
                    <span>Mention</span>
                  </button>

                  {mentionOpen && (
                    <div className="absolute left-0 mt-1.5 z-50 w-64 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                      <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90 flex items-center justify-between gap-1">
                        <input
                          type="text"
                          value={mentionQuery}
                          onChange={(e) => setMentionQuery(e.target.value)}
                          placeholder="Search colleague..."
                          autoFocus
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-md outline-none focus:border-[#C2410C]"
                        />
                        <button
                          type="button"
                          onClick={() => setMentionOpen(false)}
                          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="max-h-44 overflow-y-auto py-1">
                        {filteredMembers.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500 text-center">
                            No colleagues found
                          </p>
                        ) : (
                          filteredMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertMention(m);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left hover:bg-orange-50/70 dark:hover:bg-orange-950/40 transition-colors"
                            >
                              <div className="w-5 h-5 rounded-full bg-[#C2410C] text-white text-[10px] font-medium flex items-center justify-center shrink-0">
                                {m.avatar || m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                                  {m.role || m.email}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={saveCurrentSelection}
          onKeyUp={saveCurrentSelection}
          onMouseUp={saveCurrentSelection}
          onKeyDown={(e) => {
            if (!readOnly && enableMentions && e.key === "@") {
              saveCurrentSelection();
              setMentionOpen(true);
            }
          }}
          data-placeholder={placeholder}
          className={`${minHeightClass} p-3 text-xs text-neutral-800 dark:text-neutral-100 leading-relaxed font-sans outline-none focus:bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 dark:empty:before:text-neutral-500 empty:before:pointer-events-none [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-neutral-900 dark:[&_h3]:text-neutral-200 [&_h3]:mt-1.5 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#C2410C] [&_blockquote]:pl-2.5 [&_blockquote]:italic [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-400 [&_blockquote]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_pre]:bg-neutral-100 dark:[&_pre]:bg-neutral-800 [&_pre]:text-neutral-900 dark:[&_pre]:text-neutral-100 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:text-xs [&_pre]:font-mono [&_pre]:my-1.5 [&_a]:text-[#C2410C] [&_a]:underline`}
        />
      </div>

      {hint && !error && <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

/**
 * Utility to strip HTML tags for concise text snippet displays in cards/lists.
 */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Renders rich text safely using sanitized HTML or preformatted text.
 */
export function RichTextViewer({
  content,
  className = "",
  placeholder = "No details provided.",
}: {
  content?: string | null;
  className?: string;
  placeholder?: string;
}) {
  if (!content || !content.trim()) {
    return <span className="text-neutral-400 dark:text-neutral-500 italic text-xs">{placeholder}</span>;
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (!isHtml) {
    return (
      <div className={`whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-neutral-900 dark:[&_h3]:text-neutral-200 [&_h3]:mt-1.5 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#C2410C] [&_blockquote]:pl-2.5 [&_blockquote]:italic [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-400 [&_blockquote]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_pre]:bg-neutral-100 dark:[&_pre]:bg-neutral-800 [&_pre]:text-neutral-900 dark:[&_pre]:text-neutral-100 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:font-mono [&_pre]:my-1.5 [&_a]:text-[#C2410C] [&_a]:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
}
