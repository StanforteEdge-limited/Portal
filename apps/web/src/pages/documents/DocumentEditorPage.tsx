import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Link, useNavigate, useParams } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { documentApi, useCachedQuery } from "@/shared/lib/core";
import { uploadFileAsset, type FileAssetRecord } from "@/pages/files/files-api";
import { FilePreviewModal } from "@/shared/components/media/FilePreviewModal";
import { DocumentTagBar } from "./DocumentEditor";
import DocumentShareModal from "./DocumentShareModal";
import { useColleagues } from "@/shared/hooks/useColleagues";
import {
  type DocumentCategory,
  type DocumentComment,
  type DocumentItem,
  type DocumentSharedRecord,
  type DocumentVersion,
} from "./types";
import {
  ArrowLeft,
  FileText,
  Save,
  Share2,
  MessageSquare,
  CheckCircle2,
  Send,
  X,
  Paperclip,
  Eye,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Link2,
  Minus,
  RemoveFormatting,
  AtSign,
  Printer,
  PanelLeft,
  Hourglass,
  Check,
  Table as TableIcon,
  ImagePlus,
  Highlighter,
  Palette,
  Search,
  History,
  RotateCcw,
  Download,
  ChevronDown,
} from "lucide-react";

interface HeadingOutlineItem {
  level: number;
  text: string;
}

const TEXT_COLORS = [
  "#171717",
  "#525252",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
];

const HIGHLIGHT_COLORS = [
  "transparent",
  "#fef08a",
  "#fed7aa",
  "#bbf7d0",
  "#bfdbfe",
  "#e9d5ff",
  "#fecdd3",
];

const FONT_FAMILIES = [
  { label: "Sans (Inter)", value: "Inter, system-ui, sans-serif" },
  { label: "Serif (Georgia)", value: "Georgia, Cambria, serif" },
  { label: "Mono (JetBrains)", value: "'JetBrains Mono', ui-monospace, monospace" },
];

function extractHeadings(html: string): HeadingOutlineItem[] {
  if (typeof window === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.querySelectorAll("h1, h2, h3"));
  return nodes
    .map((el) => ({
      level: Number(el.tagName.replace("H", "")) || 2,
      text: (el.textContent || "").trim(),
    }))
    .filter((h) => h.text.length > 0);
}

function countWordsAndChars(html: string): { words: number; chars: number; readMinutes: number } {
  if (typeof window === "undefined" || !html) return { words: 0, chars: 0, readMinutes: 0 };
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (doc.body.textContent || "").trim();
  if (!text) return { words: 0, chars: 0, readMinutes: 0 };
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    words,
    chars: text.length,
    readMinutes: Math.max(1, Math.ceil(words / 200)),
  };
}

function htmlToMarkdown(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    switch (tag) {
      case "h1":
        return `# ${inner.trim()}\n\n`;
      case "h2":
        return `## ${inner.trim()}\n\n`;
      case "h3":
        return `### ${inner.trim()}\n\n`;
      case "p":
      case "div":
        return inner.trim() ? `${inner.trim()}\n\n` : "";
      case "br":
        return "\n";
      case "strong":
      case "b":
        return `**${inner}**`;
      case "em":
      case "i":
        return `*${inner}*`;
      case "s":
      case "strike":
        return `~~${inner}~~`;
      case "blockquote":
        return `> ${inner.trim().replace(/\n/g, "\n> ")}\n\n`;
      case "pre":
        return `\`\`\`\n${inner.trim()}\n\`\`\`\n\n`;
      case "ul":
        return `${inner}\n`;
      case "ol":
        return `${inner}\n`;
      case "li":
        return `- ${inner.trim()}\n`;
      case "hr":
        return `---\n\n`;
      case "a":
        return `[${inner}](${el.getAttribute("href") || ""})`;
      default:
        return inner;
    }
  };
  return Array.from(doc.body.childNodes).map(walk).join("").trim();
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id && id !== "new");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { colleagues } = useColleagues();

  const currentUserName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || user?.email || "Staff Member";

  const currentUserInitials = currentUserName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const userPerms = user?.permissions ?? [];
  const isHrOrAdmin =
    userPerms.includes("*") ||
    userPerms.includes("hr.manage") ||
    userPerms.includes("settings.manage");

  const { data: apiRecord } = useCachedQuery(
    `documents:editor:${id || "new"}`,
    () => (isEdit && id ? documentApi.get(id).catch(() => null) : Promise.resolve(null)),
    { ttlMs: 1000 * 10 },
  );

  const existingDoc: DocumentItem | null = useMemo(() => {
    if (!isEdit || !id) return null;
    try {
      const saved: DocumentItem[] = JSON.parse(
        localStorage.getItem("portal_documents_catalog") || "[]",
      );
      const found = saved.find((d) => d.id === id || d.slug === id);
      if (found) return found;
    } catch {}

    const raw = (apiRecord as any)?.data ?? apiRecord;
    if (raw?.id) return raw as DocumentItem;

    return null;
  }, [apiRecord, id, isEdit]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("general");
  const [contentHtml, setContentHtml] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false);
  const [attachedFile, setAttachedFile] = useState<FileAssetRecord | null>(null);

  // UI panels & menus
  const [showOutline, setShowOutline] = useState(true);
  const [rightPanel, setRightPanel] = useState<"none" | "comments" | "history">("none");
  const [zoom, setZoom] = useState<number>(100);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [fontSizePx, setFontSizePx] = useState<number>(15);
  const [openMenu, setOpenMenu] = useState<
    "none" | "mention" | "textColor" | "highlight" | "export"
  >("none");
  const [mentionQuery, setMentionQuery] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!existingDoc || hydratedId === existingDoc.id) return;
    setTitle(existingDoc.title || "");
    setCategory(existingDoc.category || "general");
    const html = existingDoc.content_html || "";
    setContentHtml(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(html);
    }
    setTags(Array.isArray(existingDoc.tags) ? existingDoc.tags : []);
    setComments(Array.isArray(existingDoc.comments) ? existingDoc.comments : []);
    setVersions(Array.isArray(existingDoc.versions) ? existingDoc.versions : []);
    setRequireAcknowledgement(Boolean(existingDoc.require_acknowledgement));
    setAttachedFile(
      existingDoc.file
        ? {
            id: existingDoc.file.id,
            file_name: existingDoc.file.file_name,
            file_size: existingDoc.file.file_size,
            mime_type: existingDoc.file.mime_type,
            storage_path: existingDoc.file.storage_path || "",
            public_url: existingDoc.file.public_url || null,
          }
        : null,
    );
    setIsDirty(false);
    setHydratedId(existingDoc.id);
  }, [existingDoc, hydratedId]);

  // Keyboard shortcuts: Ctrl+S (save), Ctrl+F / Ctrl+H (find & replace)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave(false, true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "h")) {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(() => findInputRef.current?.focus(), 30);
      } else if (e.key === "Escape") {
        setOpenMenu("none");
        setFindOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Debounced auto-save for existing documents (4s after last edit)
  useEffect(() => {
    if (!isEdit || !existingDoc?.id || !isDirty || saving) return;
    const timer = window.setTimeout(() => {
      void handleSave(false, false);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [isDirty, contentHtml, title, category, tags, isEdit, existingDoc?.id, saving]);

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

  const outline = useMemo(() => extractHeadings(contentHtml), [contentHtml]);
  const stats = useMemo(() => countWordsAndChars(contentHtml), [contentHtml]);
  const openCommentCount = comments.filter((c) => !c.resolved).length;

  const findMatchCount = useMemo(() => {
    if (!findQuery.trim()) return 0;
    const text = editorRef.current?.innerText || "";
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(escaped, "gi"));
    return matches ? matches.length : 0;
  }, [findQuery, contentHtml]);

  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection(): Range | null {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return null;
    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      return savedRangeRef.current;
    }
    if (sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      return sel.getRangeAt(0);
    }
    return null;
  }

  function applySelectionStyle(prop: "fontFamily" | "fontSize", cssValue: string) {
    const range = restoreSelection();
    if (!range || !editorRef.current) return;

    const span = document.createElement("span");
    span.style[prop] = cssValue;

    if (!range.collapsed) {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      // Keep the newly styled text selected so the user can adjust both font and size smoothly
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(nextRange);
      }
      savedRangeRef.current = nextRange.cloneRange();
    } else {
      const zws = document.createTextNode("\u200B");
      span.appendChild(zws);
      range.insertNode(span);
      const nextRange = document.createRange();
      nextRange.setStart(zws, 1);
      nextRange.setEnd(zws, 1);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(nextRange);
      }
      savedRangeRef.current = nextRange.cloneRange();
    }

    syncEditorHtml();
  }

  function syncEditorHtml() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setContentHtml(html);
    setIsDirty(true);
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorHtml();
  }

  function insertLink() {
    const url = window.prompt("Enter link URL (https://...)");
    if (!url) return;
    exec("createLink", url.trim());
  }

  function insertMention(member: { id: string; name: string }) {
    editorRef.current?.focus();
    const chipHtml = `<span data-mention-id="${member.id}" contenteditable="false" class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-orange-50 text-[#c2410c] border border-orange-200/70 text-xs font-medium">@${member.name}</span>&nbsp;`;
    document.execCommand("insertHTML", false, chipHtml);
    syncEditorHtml();
    setOpenMenu("none");
    setMentionQuery("");
  }

  function insertTable() {
    editorRef.current?.focus();
    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="border:1px solid #d4d4d8;padding:8px 10px;text-align:left;font-weight:600;">Column 1</th>
            <th style="border:1px solid #d4d4d8;padding:8px 10px;text-align:left;font-weight:600;">Column 2</th>
            <th style="border:1px solid #d4d4d8;padding:8px 10px;text-align:left;font-weight:600;">Column 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
            <td style="border:1px solid #d4d4d8;padding:8px 10px;">&nbsp;</td>
          </tr>
        </tbody>
      </table><p><br></p>
    `;
    document.execCommand("insertHTML", false, tableHtml);
    syncEditorHtml();
  }

  function insertChecklist() {
    editorRef.current?.focus();
    const itemHtml = `<div style="display:flex;align-items:flex-start;gap:8px;margin:6px 0;"><input type="checkbox" style="margin-top:5px;accent-color:#ff6900;" /><span>To-do item</span></div><p><br></p>`;
    document.execCommand("insertHTML", false, itemHtml);
    syncEditorHtml();
  }

  async function handleInlineImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      let imgSrc = URL.createObjectURL(file);
      try {
        const asset = await uploadFileAsset({ file, name: file.name, category: "documents" });
        if (asset.public_url) imgSrc = asset.public_url;
      } catch {
        // Keep local object URL fallback
      }
      editorRef.current?.focus();
      const imgHtml = `<figure style="margin:16px 0;"><img src="${imgSrc}" alt="${file.name.replace(/"/g, "")}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;" /></figure><p><br></p>`;
      document.execCommand("insertHTML", false, imgHtml);
      syncEditorHtml();
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function handleReplaceAll() {
    if (!findQuery.trim() || !editorRef.current) return;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }
    let count = 0;
    for (const node of textNodes) {
      if (node.nodeValue && regex.test(node.nodeValue)) {
        const matches = node.nodeValue.match(regex);
        count += matches ? matches.length : 0;
        node.nodeValue = node.nodeValue.replace(regex, replaceText);
      }
    }
    if (count > 0) {
      syncEditorHtml();
      showToast({
        tone: "success",
        title: "Replaced",
        message: `Replaced ${count} occurrence${count === 1 ? "" : "s"}.`,
      });
    }
  }

  function scrollToHeading(index: number) {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll("h1, h2, h3");
    const target = headings[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadFileAsset({ file, name: file.name, category: "documents" });
      setAttachedFile(asset);
      setIsDirty(true);
      showToast({ tone: "success", title: "Attached", message: `"${file.name}" uploaded.` });
    } catch {
      setAttachedFile({
        id: `local-file-${Date.now()}`,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: `uploads/${file.name}`,
        public_url: URL.createObjectURL(file),
      });
      setIsDirty(true);
      showToast({ tone: "info", title: "Attached Locally", message: `"${file.name}" attached.` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function persistLocalDoc(
    docId: string,
    opts?: { comments?: DocumentComment[]; versions?: DocumentVersion[] },
  ): DocumentItem {
    const saved: DocumentItem[] = JSON.parse(
      localStorage.getItem("portal_documents_catalog") || "[]",
    );
    const updatedDoc: DocumentItem = {
      id: docId,
      title: title.trim() || "Untitled Document",
      slug: (title.trim() || "untitled-document").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category,
      status: existingDoc?.status || "published",
      version: existingDoc?.version || "v1.0",
      effective_date: existingDoc?.effective_date || new Date().toISOString().split("T")[0],
      created_at: existingDoc?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_html: contentHtml,
      require_acknowledgement: requireAcknowledgement,
      author_name: existingDoc?.author_name || currentUserName,
      tags,
      comments: opts?.comments ?? comments,
      versions: opts?.versions ?? versions,
      file: attachedFile
        ? {
            id: attachedFile.id,
            file_name: attachedFile.file_name,
            file_size: attachedFile.file_size || 0,
            mime_type: attachedFile.mime_type || "application/octet-stream",
            public_url: attachedFile.public_url || undefined,
            storage_path: attachedFile.storage_path,
          }
        : null,
      acknowledgements: existingDoc?.acknowledgements || [],
      shares: existingDoc?.shares || [],
    };
    const filtered = saved.filter((d) => d.id !== docId);
    filtered.unshift(updatedDoc);
    localStorage.setItem("portal_documents_catalog", JSON.stringify(filtered));
    return updatedDoc;
  }

  async function handleSave(navigateAfter = false, showSuccessToast = true) {
    const docTitle = title.trim() || "Untitled Document";
    if (!title.trim()) setTitle(docTitle);

    setSaving(true);
    try {
      const apiPayload = {
        title: docTitle,
        category,
        content_html: contentHtml || undefined,
        file_id: attachedFile?.id || undefined,
        require_acknowledgement: isHrOrAdmin ? requireAcknowledgement : false,
      };

      let savedId = existingDoc?.id || `doc-${Date.now()}`;
      try {
        if (isEdit && existingDoc?.id) {
          await documentApi.update(existingDoc.id, apiPayload);
        } else {
          const created = await documentApi.create(apiPayload);
          const createdId = (created as any)?.data?.id ?? (created as any)?.id;
          if (createdId) savedId = String(createdId);
        }
      } catch {
        // Fallback local catalog persistence handles seeded/offline docs
      }

      const snapshot: DocumentVersion = {
        id: `ver-${Date.now()}`,
        saved_at: new Date().toISOString(),
        author_name: currentUserName,
        word_count: stats.words,
        title: docTitle,
        content_html: contentHtml,
      };
      const nextVersions =
        versions[0]?.content_html === contentHtml && versions[0]?.title === docTitle
          ? versions
          : [snapshot, ...versions].slice(0, 20);
      setVersions(nextVersions);

      persistLocalDoc(savedId, { versions: nextVersions });
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      if (showSuccessToast) {
        showToast({
          tone: "success",
          title: "Saved",
          message: "Document saved and version snapshot recorded.",
        });
      }

      if (!isEdit && savedId) {
        navigate(`/documents/${savedId}/edit`, { replace: true });
      } else if (navigateAfter) {
        navigate(`/documents/${savedId}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleRestoreVersion(ver: DocumentVersion) {
    if (!window.confirm(`Restore version from ${new Date(ver.saved_at).toLocaleString()}?`)) {
      return;
    }
    setTitle(ver.title);
    setContentHtml(ver.content_html);
    if (editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(ver.content_html);
    }
    setIsDirty(true);
    showToast({
      tone: "info",
      title: "Version Restored",
      message: "Click Save to keep this restored version.",
    });
  }

  function handleExport(format: "html" | "md" | "doc" | "print") {
    setOpenMenu("none");
    const safeName = (title.trim() || "document").replace(/[^a-z0-9-_]+/gi, "_");
    const cleanHtml = DOMPurify.sanitize(contentHtml);
    if (format === "print") {
      window.print();
      return;
    }
    if (format === "md") {
      const md = `# ${title.trim() || "Untitled Document"}\n\n${htmlToMarkdown(cleanHtml)}`;
      triggerDownload(`${safeName}.md`, md, "text/markdown;charset=utf-8");
      return;
    }
    const fullDocHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${title || "Document"}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.65;color:#171717;}</style></head><body><h1>${title || "Untitled Document"}</h1>${cleanHtml}</body></html>`;
    if (format === "html") {
      triggerDownload(`${safeName}.html`, fullDocHtml, "text/html;charset=utf-8");
    } else if (format === "doc") {
      triggerDownload(`${safeName}.doc`, fullDocHtml, "application/msword;charset=utf-8");
    }
  }

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    const next: DocumentComment[] = [
      ...comments,
      {
        id: `cmt-${Date.now()}`,
        author_name: currentUserName,
        author_avatar: currentUserInitials || "ST",
        body: text,
        created_at: new Date().toISOString(),
        resolved: false,
      },
    ];
    setComments(next);
    setNewComment("");
    if (isEdit && existingDoc?.id) {
      persistLocalDoc(existingDoc.id, { comments: next });
    }
  }

  function handleToggleResolve(commentId: string) {
    const next = comments.map((c) =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c,
    );
    setComments(next);
    if (isEdit && existingDoc?.id) {
      persistLocalDoc(existingDoc.id, { comments: next });
    }
  }

  function handleShared(record: DocumentSharedRecord) {
    if (!existingDoc?.id) return;
    try {
      const saved: DocumentItem[] = JSON.parse(
        localStorage.getItem("portal_documents_catalog") || "[]",
      );
      const updated = saved.map((d) =>
        d.id === existingDoc.id ? { ...d, shares: [record, ...(d.shares || [])] } : d,
      );
      localStorage.setItem("portal_documents_catalog", JSON.stringify(updated));
    } catch {}
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f0f2f5] text-neutral-900 overflow-hidden select-none">
      {/* 1. GOOGLE DOCS TOP HEADER BAR */}
      <header className="bg-white border-b border-neutral-200 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            to={isEdit && existingDoc?.id ? `/documents/${existingDoc.id}` : "/documents"}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
            title="Back to Documents"
            aria-label="Back to Documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/60 text-[#ff6900] flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1 max-w-xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Untitled document"
                className="w-full max-w-md px-2 py-0.5 text-base font-medium font-headline text-neutral-900 bg-transparent border border-transparent hover:border-neutral-300 focus:border-[#ff6900] focus:bg-white rounded-md outline-none transition truncate"
              />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as DocumentCategory);
                  setIsDirty(true);
                }}
                className="text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200/70 border-0 rounded-md py-1 pl-2 pr-6 outline-none cursor-pointer shrink-0"
              >
                <option value="general">General</option>
                <option value="wiki">Wiki</option>
                <option value="handbook">Handbook</option>
                {isHrOrAdmin && <option value="policy">Policy</option>}
              </select>
            </div>

            <div className="flex items-center gap-3 px-2 mt-0.5 text-[11px] text-neutral-500">
              <span>
                {saving ? (
                  "Saving..."
                ) : isDirty ? (
                  <span className="text-amber-600 font-medium">Unsaved changes</span>
                ) : lastSavedAt ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Check className="h-3 w-3" /> Saved at {lastSavedAt}
                  </span>
                ) : (
                  "Auto-save ready"
                )}
              </span>
              {isHrOrAdmin && (
                <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-neutral-800">
                  <input
                    type="checkbox"
                    checked={requireAcknowledgement}
                    onChange={(e) => {
                      setRequireAcknowledgement(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="h-3 w-3 rounded border-neutral-300 text-[#ff6900] focus:ring-[#ff6900]"
                  />
                  <span>Require sign-off</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions: Collaborators, History, Comments, Export, Share, Save */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden lg:flex items-center -space-x-1.5 mr-1">
            <div
              title={currentUserName}
              className="w-7 h-7 rounded-full bg-[#ff6900] text-white text-[11px] font-medium flex items-center justify-center ring-2 ring-white"
            >
              {currentUserInitials || "ME"}
            </div>
            {(existingDoc?.shares || []).slice(0, 3).map((s) => (
              <div
                key={s.id}
                title={s.recipient_name}
                className="w-7 h-7 rounded-full bg-neutral-700 text-white text-[11px] font-medium flex items-center justify-center ring-2 ring-white"
              >
                {s.recipient_avatar || s.recipient_name.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Version History */}
          <button
            type="button"
            onClick={() => setRightPanel((p) => (p === "history" ? "none" : "history"))}
            className={`p-2 rounded-full transition-colors ${
              rightPanel === "history"
                ? "bg-orange-50 text-[#ff6900]"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Version history"
            aria-label="Version history"
          >
            <History className="h-4 w-4" />
          </button>

          {/* Comments */}
          <button
            type="button"
            onClick={() => setRightPanel((p) => (p === "comments" ? "none" : "comments"))}
            className={`relative p-2 rounded-full transition-colors ${
              rightPanel === "comments"
                ? "bg-orange-50 text-[#ff6900]"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
            title="Open comments"
            aria-label="Toggle comments"
          >
            <MessageSquare className="h-4 w-4" />
            {openCommentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff6900] text-white text-[10px] font-mono flex items-center justify-center">
                {openCommentCount}
              </span>
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === "export" ? "none" : "export"))}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors"
              title="Export document"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3 text-neutral-400" />
            </button>
            {openMenu === "export" && (
              <div className="absolute right-0 mt-1.5 z-50 w-48 rounded-xl bg-white border border-neutral-200 shadow-xl py-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleExport("doc")}
                  className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                >
                  <span>Microsoft Word</span>
                  <span className="text-[11px] text-neutral-400">.doc</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("md")}
                  className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                >
                  <span>Markdown</span>
                  <span className="text-[11px] text-neutral-400">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("html")}
                  className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                >
                  <span>Web Page</span>
                  <span className="text-[11px] text-neutral-400">.html</span>
                </button>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  type="button"
                  onClick={() => handleExport("print")}
                  className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                >
                  <span>Print / Save PDF</span>
                  <Printer className="h-3.5 w-3.5 text-neutral-400" />
                </button>
              </div>
            )}
          </div>

          {isEdit && existingDoc && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-orange-50 hover:bg-orange-100 text-[#c2410c] border border-orange-200/70 text-xs font-medium transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSave(false, true)}
            disabled={saving || uploading}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#ff6900] hover:bg-[#ea580c] active:scale-[0.98] text-white text-xs font-medium shadow-xs transition disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* 2. GOOGLE DOCS FORMATTING RIBBON */}
      <div className="bg-[#f4f5f7] border-b border-neutral-200 px-3 sm:px-5 py-1.5 shrink-0 print:hidden">
        <div className="max-w-7xl mx-auto rounded-full bg-white border border-neutral-200/90 px-3 py-1 flex flex-wrap items-center gap-0.5 shadow-2xs relative">
          <button
            type="button"
            onClick={() => setShowOutline((p) => !p)}
            title="Toggle document outline"
            className={`p-1.5 rounded-full transition-colors ${
              showOutline ? "bg-orange-50 text-[#ff6900]" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("undo"); }} title="Undo" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("redo"); }} title="Redo" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setFindOpen((p) => !p);
              setTimeout(() => findInputRef.current?.focus(), 30);
            }}
            title="Find & Replace (Ctrl+F)"
            className={`p-1.5 rounded-full transition-colors ${
              findOpen ? "bg-orange-50 text-[#ff6900]" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Zoom */}
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom level"
            className="text-xs font-medium text-neutral-700 bg-transparent hover:bg-neutral-100 border-0 rounded-md py-1 pl-2 pr-5 outline-none cursor-pointer"
          >
            <option value={90}>90%</option>
            <option value={100}>100%</option>
            <option value={115}>115%</option>
            <option value={125}>125%</option>
          </select>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Block Style */}
          <select
            defaultValue="P"
            onChange={(e) => {
              exec("formatBlock", e.target.value);
              e.target.value = "P";
            }}
            aria-label="Text style"
            className="text-xs font-medium text-neutral-700 bg-transparent hover:bg-neutral-100 border-0 rounded-md py-1 pl-2 pr-5 outline-none cursor-pointer"
          >
            <option value="P">Normal</option>
            <option value="H1">Title</option>
            <option value="H2">Heading 1</option>
            <option value="H3">Heading 2</option>
          </select>

          {/* Font Family (applies to highlighted selection) */}
          <select
            value={fontFamily}
            onMouseDown={saveSelection}
            onChange={(e) => {
              const next = e.target.value;
              setFontFamily(next);
              applySelectionStyle("fontFamily", next);
            }}
            aria-label="Font family"
            className="hidden sm:inline-block text-xs font-medium text-neutral-700 bg-transparent hover:bg-neutral-100 border-0 rounded-md py-1 pl-2 pr-5 outline-none cursor-pointer"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font Size (applies to highlighted selection) */}
          <select
            value={fontSizePx}
            onMouseDown={saveSelection}
            onChange={(e) => {
              const next = Number(e.target.value);
              setFontSizePx(next);
              applySelectionStyle("fontSize", `${next}px`);
            }}
            aria-label="Font size"
            className="hidden sm:inline-block text-xs font-medium text-neutral-700 bg-transparent hover:bg-neutral-100 border-0 rounded-md py-1 pl-2 pr-5 outline-none cursor-pointer"
          >
            {[12, 14, 15, 16, 18, 20, 24, 30].map((sz) => (
              <option key={sz} value={sz}>
                {sz}px
              </option>
            ))}
          </select>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Inline Styles */}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} title="Bold (Ctrl+B)" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} title="Italic (Ctrl+I)" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} title="Underline (Ctrl+U)" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }} title="Strikethrough" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Strikethrough className="h-3.5 w-3.5" />
          </button>

          {/* Text Color */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenMenu((m) => (m === "textColor" ? "none" : "textColor"));
              }}
              title="Text color"
              className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100"
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
            {openMenu === "textColor" && (
              <div className="absolute left-0 mt-2 z-50 p-2 rounded-xl bg-white border border-neutral-200 shadow-xl flex items-center gap-1.5">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      exec("foreColor", color);
                      setOpenMenu("none");
                    }}
                    style={{ backgroundColor: color }}
                    className="w-5 h-5 rounded-full border border-neutral-200 hover:scale-110 transition-transform"
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenMenu((m) => (m === "highlight" ? "none" : "highlight"));
              }}
              title="Highlight color"
              className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
            {openMenu === "highlight" && (
              <div className="absolute left-0 mt-2 z-50 p-2 rounded-xl bg-white border border-neutral-200 shadow-xl flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      exec("hiliteColor", color);
                      setOpenMenu("none");
                    }}
                    style={{ backgroundColor: color === "transparent" ? "#ffffff" : color }}
                    className="w-5 h-5 rounded-full border border-neutral-300 hover:scale-110 transition-transform flex items-center justify-center text-[10px] text-neutral-500"
                    title={color === "transparent" ? "Clear highlight" : color}
                  >
                    {color === "transparent" ? "×" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Alignment */}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }} title="Align left" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }} title="Align center" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }} title="Align right" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Lists, Checklist, Table, Image, Blocks */}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} title="Bullet list" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} title="Numbered list" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); insertChecklist(); }} title="Insert checklist item" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <ListChecks className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); insertTable(); }} title="Insert 3×3 table" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <TableIcon className="h-3.5 w-3.5" />
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleInlineImageSelect(e)}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
            title="Insert inline image"
            className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>

          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "BLOCKQUOTE"); }} title="Quote" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "PRE"); }} title="Code block" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Code className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertHorizontalRule"); }} title="Divider" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} title="Insert link" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }} title="Clear formatting" className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100">
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* @Mention */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenMenu((m) => (m === "mention" ? "none" : "mention"));
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-[#c2410c] bg-orange-50 hover:bg-orange-100 transition-colors"
              title="Mention a colleague"
            >
              <AtSign className="h-3.5 w-3.5" />
              <span>Mention</span>
            </button>

            {openMenu === "mention" && (
              <div className="absolute left-0 mt-2 z-50 w-64 rounded-xl bg-white border border-neutral-200 shadow-xl overflow-hidden">
                <div className="p-2 border-b border-neutral-100 bg-neutral-50/70">
                  <input
                    type="text"
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    placeholder="Search colleague..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900]"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
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

          {/* Attach Supporting File */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => void handleFileSelect(e)}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors ml-0.5"
            title="Attach supporting file"
          >
            {uploading ? (
              <Hourglass className="h-3.5 w-3.5 animate-spin text-[#ff6900]" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">{uploading ? "Uploading..." : "Attach"}</span>
          </button>
        </div>
      </div>

      {/* 3. SLIM TAGS & ATTACHMENT STRIP */}
      <div className="bg-white/90 border-b border-neutral-200/80 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
        <DocumentTagBar
          tags={tags}
          onChange={(next) => {
            setTags(next);
            setIsDirty(true);
          }}
        />

        {attachedFile && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-50/80 border border-orange-200/70 text-xs">
            <Paperclip className="h-3 w-3 text-[#ff6900]" />
            <span className="font-medium text-neutral-800 max-w-[180px] truncate">
              {attachedFile.file_name}
            </span>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="text-[#c2410c] hover:underline font-medium inline-flex items-center gap-0.5"
            >
              <Eye className="h-3 w-3" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachedFile(null);
                setIsDirty(true);
              }}
              className="text-neutral-400 hover:text-rose-600"
              title="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN 3-PANE GOOGLE DOCS WORKSPACE */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Floating Find & Replace Bar */}
        {findOpen && (
          <div className="absolute top-3 right-5 z-40 w-80 rounded-xl bg-white border border-neutral-200 shadow-xl p-3 space-y-2 print:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Find & Replace</span>
              <button
                type="button"
                onClick={() => setFindOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                ref={findInputRef}
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Find in document..."
                className="w-full pl-2.5 pr-16 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:bg-white focus:border-[#ff6900]"
              />
              {findQuery && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400">
                  {findMatchCount} found
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:bg-white focus:border-[#ff6900]"
              />
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={!findQuery.trim() || findMatchCount === 0}
                className="px-2.5 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium disabled:opacity-40 transition-colors"
              >
                Replace all
              </button>
            </div>
          </div>
        )}

        {/* Left Document Outline */}
        {showOutline && (
          <aside className="hidden md:flex w-60 flex-col border-r border-neutral-200/80 bg-[#f8f9fa] p-4 shrink-0 overflow-y-auto print:hidden">
            <p className="text-xs font-semibold text-neutral-500 mb-3">Document outline</p>
            {outline.length === 0 ? (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Headings you add to the document will appear here for quick navigation.
              </p>
            ) : (
              <nav className="space-y-1">
                {outline.map((item, idx) => (
                  <button
                    key={`${item.text}-${idx}`}
                    type="button"
                    onClick={() => scrollToHeading(idx)}
                    className={`w-full text-left text-xs text-neutral-700 hover:text-[#ff6900] hover:bg-neutral-200/50 rounded-md px-2 py-1.5 truncate transition-colors ${
                      item.level === 1
                        ? "font-semibold"
                        : item.level === 2
                          ? "pl-3 font-medium"
                          : "pl-5 text-neutral-500"
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            )}
          </aside>
        )}

        {/* Center Paper Sheet Canvas */}
        <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-8 flex justify-center items-start">
          <div
            style={{
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: "top center",
            }}
            className="w-full max-w-[816px] min-h-[1056px] bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.04)] px-10 sm:px-16 py-12 sm:py-16 mb-12 transition-transform duration-150 select-text"
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditorHtml}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onKeyDown={(e) => {
                if (e.key === "@") {
                  saveSelection();
                  setOpenMenu("mention");
                }
              }}
              data-placeholder="Start typing your document, or press @ to mention a colleague..."
              className="min-h-[900px] outline-none text-[15px] leading-7 text-neutral-800 font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:font-headline [&_h1]:text-neutral-900 [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:font-headline [&_h2]:text-neutral-900 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_h3]:mt-5 [&_h3]:mb-1.5 [&_p]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[#ff6900] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-neutral-600 [&_blockquote]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_pre]:bg-neutral-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:text-xs [&_pre]:font-mono [&_pre]:my-4 [&_hr]:my-6 [&_hr]:border-neutral-200 [&_a]:text-[#ff6900] [&_a]:underline"
            />
          </div>
        </main>

        {/* Right Panel: Comments OR Version History */}
        {rightPanel === "comments" && (
          <aside className="w-80 border-l border-neutral-200/80 bg-white flex flex-col shrink-0 print:hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 font-headline">Comments</h3>
                <p className="text-[11px] text-neutral-500">
                  {openCommentCount} open • {comments.length} total
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRightPanel("none")}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-10">
                  No comments yet. Add review notes or @mention teammates below.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      c.resolved
                        ? "bg-neutral-50 border-neutral-200/60 opacity-65"
                        : "bg-white border-neutral-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-[#c2410c] text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {c.author_avatar || c.author_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-neutral-900 truncate">
                          {c.author_name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleResolve(c.id)}
                        className={`p-1 rounded transition-colors ${
                          c.resolved
                            ? "text-emerald-600"
                            : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={c.resolved ? "Reopen" : "Resolve"}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap select-text">
                      {c.body}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              className="p-3 border-t border-neutral-100 bg-neutral-50/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl outline-none focus:border-[#ff6900]"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="p-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white disabled:opacity-40 transition-colors"
                aria-label="Post comment"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </aside>
        )}

        {rightPanel === "history" && (
          <aside className="w-80 border-l border-neutral-200/80 bg-white flex flex-col shrink-0 print:hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 font-headline">Version History</h3>
                <p className="text-[11px] text-neutral-500">
                  {versions.length} saved snapshot{versions.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRightPanel("none")}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {versions.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-10">
                  Snapshots are recorded automatically each time you save.
                </p>
              ) : (
                versions.map((ver, idx) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-900">
                          {new Date(ver.saved_at).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {ver.author_name} • {ver.word_count} words
                        </p>
                      </div>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          Latest
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c2410c] hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore this version</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 5. BOTTOM STATUS BAR */}
      <footer className="bg-white border-t border-neutral-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-neutral-500 shrink-0 print:hidden">
        <div className="flex items-center gap-4 tabular-nums">
          <span>{stats.words} words</span>
          <span>{stats.chars} characters</span>
          <span>{outline.length} headings</span>
          {stats.readMinutes > 0 && <span>~{stats.readMinutes} min read</span>}
        </div>
        <span className="hidden sm:inline">
          Ctrl+S save • Ctrl+F find &amp; replace • @ mention
        </span>
      </footer>

      <FilePreviewModal
        file={attachedFile}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fallbackHtml={contentHtml}
      />

      {existingDoc && (
        <DocumentShareModal
          document={existingDoc}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          onShared={handleShared}
        />
      )}
    </div>
  );
}
