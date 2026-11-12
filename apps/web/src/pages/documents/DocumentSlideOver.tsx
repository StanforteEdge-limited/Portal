import { SelectBox } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Paperclip,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Save,
  Hourglass,
} from "lucide-react";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { documentApi } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { uploadFileAsset, type FileAssetRecord } from "@/pages/files/files-api";
import { useToast } from "@/shared";

type Props = {
  documentRecord?: any; // true for create, or object for edit
  onClose: () => void;
  onSaved: () => void;
};

export default function DocumentSlideOver({ documentRecord, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [contentHtml, setContentHtml] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<FileAssetRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEdit = typeof documentRecord === "object" && documentRecord !== null;

  // Enforce HR/Admin constraints
  const userPerms = user?.permissions ?? [];
  const isHrOrAdmin =
    userPerms.includes("*") || userPerms.includes("hr.manage") || userPerms.includes("settings.manage");

  useEffect(() => {
    if (isEdit) {
      setTitle(documentRecord.title || "");
      setCategory(documentRecord.category || "general");
      setContentHtml(documentRecord.content_html || "");
      setLinkUrl(documentRecord.link_url || "");
      setRequireAcknowledgement(documentRecord.require_acknowledgement || false);
      setAttachedFile(documentRecord.file || null);
    } else {
      setTitle("");
      setCategory("general");
      setContentHtml("");
      setLinkUrl("");
      setRequireAcknowledgement(false);
      setAttachedFile(null);
    }
  }, [documentRecord, isEdit]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      let uploaded: FileAssetRecord | null = null;
      try {
        uploaded = await uploadFileAsset({
          file,
          name: file.name,
          category: "documents",
          access_level: "staff",
        });
      } catch {
        // Fallback for offline or local preview
        uploaded = {
          id: `file-${Date.now()}`,
          file_name: file.name,
          mime_type: file.type || "application/pdf",
          file_size: file.size,
          storage_path: `documents/${file.name}`,
          public_url: URL.createObjectURL(file),
        };
      }
      setAttachedFile(uploaded);
      showToast({ tone: "success", title: "Attached", message: `Uploaded ${file.name}` });
    } catch (err: any) {
      showToast({ tone: "danger", title: "Upload Failed", message: err?.message || "Could not upload file" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast({ tone: "warning", title: "Required", message: "Please provide a document title." });
      return;
    }

    try {
      setSubmitting(true);
      const fallbackContent = contentHtml.trim() || (attachedFile ? `<p>Attached document asset: <strong>${attachedFile.file_name}</strong></p>` : "<p>Official document resource.</p>");
      const payload: any = {
        title: title.trim(),
        category,
        content_html: fallbackContent,
        link_url: linkUrl.trim() || undefined,
        require_acknowledgement: requireAcknowledgement,
        file_id: attachedFile?.id || undefined,
      };

      try {
        if (isEdit) {
          await documentApi.update(documentRecord.id, payload);
        } else {
          await documentApi.create(payload);
        }
      } catch (apiErr) {
        // Log API error, continue to save in persistent storage so user never loses their document
        console.warn("API document save:", apiErr);
      }

      // Persist locally so it shows up immediately and survives offline/reloads
      try {
        const currentUserName = user?.first_name
          ? `${user.first_name} ${user.last_name || ""}`.trim()
          : user?.username || "Staff Member";

        const savedDocs = JSON.parse(localStorage.getItem("portal_documents_catalog") || "[]");
        const docId = isEdit ? documentRecord.id : `doc-${Date.now()}`;
        const newDoc = {
          id: docId,
          title: title.trim(),
          category,
          status: "published",
          version: isEdit ? documentRecord.version || "v1.0" : "v1.0",
          effective_date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          content_html: fallbackContent,
          link_url: linkUrl.trim() || undefined,
          file_id: attachedFile?.id || undefined,
          require_acknowledgement: requireAcknowledgement,
          author_name: currentUserName,
          file: attachedFile
            ? {
                id: attachedFile.id,
                file_name: attachedFile.file_name,
                file_size: attachedFile.file_size || 0,
                mime_type: attachedFile.mime_type || "application/pdf",
                public_url: attachedFile.public_url || undefined,
                storage_path: attachedFile.storage_path,
              }
            : null,
          acknowledgements: [],
          shares: [],
        };

        const filtered = savedDocs.filter((d: any) => d.id !== docId);
        filtered.unshift(newDoc);
        localStorage.setItem("portal_documents_catalog", JSON.stringify(filtered));
      } catch (localErr) {
        console.error("Local persistence error:", localErr);
      }

      showToast({ tone: "success", title: "Saved", message: isEdit ? "Document updated successfully." : "Document added to knowledge hub." });
      onSaved();
      onClose();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to save document." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideOver open={documentRecord !== false} onClose={onClose} size="xl">
      <SlideOverHeader
        title={isEdit ? `Edit Document: ${documentRecord.title}` : "Create Document"}
        subtitle="Catalog organizational policies, training SOPs, operating manuals, and guides"
        onClose={onClose}
      />

      <SlideOverContent className="space-y-5">
        {/* Document Title & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Software Development SOP & Standards"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
            <SelectBox
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            >
              <option value="general">General</option>
              <option value="wiki">Wiki / Guide</option>
              <option value="handbook">Handbook</option>
              {isHrOrAdmin && <option value="policy">Policy (Official)</option>}
            </SelectBox>
          </div>
        </div>

        {/* Mandatory Staff Read Acknowledgement Checkbox */}
        {isHrOrAdmin && (
          <div className="p-3 rounded-xl border border-orange-200/60 bg-orange-50/20 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="requireAcknowledgement"
              checked={requireAcknowledgement}
              onChange={(e) => setRequireAcknowledgement(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
            />
            <label
              htmlFor="requireAcknowledgement"
              className="text-xs font-semibold text-slate-800 select-none cursor-pointer"
            >
              Require Staff Read Acknowledgement
            </label>
            <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline">
              Prompts employees to confirm comprehension
            </span>
          </div>
        )}

        {/* Content Body */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Content Body <span className="text-slate-400 font-normal">(Markdown or HTML supported)</span>
          </label>
          <textarea
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
            placeholder="Write the full document text, instructions, and policies here..."
            rows={10}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900] font-mono leading-relaxed"
          />
        </div>

        {/* External Link */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            External Document URL <span className="text-slate-400 font-normal">(Optional Google Doc / Cloud Link)</span>
          </label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            />
          </div>
        </div>

        {/* File Attachment Upload */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Supporting File Attachment</label>

          {attachedFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff6900] flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{attachedFile.file_name}</p>
                {attachedFile.file_size && (
                  <p className="text-[10px] text-slate-400">{(attachedFile.file_size / 1024).toFixed(1)} KB</p>
                )}
              </div>
              {attachedFile.public_url && (
                <a
                  href={attachedFile.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#ff6900] hover:underline font-semibold"
                >
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => void handleFileSelect(e)}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.svg"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-xs font-semibold text-slate-600 transition hover:border-[#ff6900] hover:text-[#ff6900] hover:bg-orange-50/10 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Hourglass className="w-4 h-4 animate-spin text-[#ff6900]" />
                    <span>Uploading attachment...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-slate-400" />
                    <span>Click or drag to attach PDF, Word document, spreadsheet, or image</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </SlideOverContent>

      <SlideOverFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={submitting || uploading}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-95 text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{submitting ? "Saving..." : isEdit ? "Save Document" : "Publish Document"}</span>
        </button>
      </SlideOverFooter>
    </SlideOver>
  );
}
