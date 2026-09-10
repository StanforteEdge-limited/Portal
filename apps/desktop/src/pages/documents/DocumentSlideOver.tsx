import { useState, useEffect, useRef } from "react";
import { Button, Icon, TextField, TextAreaField, SelectField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { documentApi } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { uploadFileAsset, type FileAssetRecord } from "@/pages/files/files-api";

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
  const isHrOrAdmin = userPerms.includes('*') || userPerms.includes('hr.manage') || userPerms.includes('settings.manage');

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
  }, [documentRecord]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploaded = await uploadFileAsset(file);
      setAttachedFile(uploaded);
      showToast({ tone: "success", title: "Uploaded", message: `${file.name} attached successfully.` });
    } catch (err: any) {
      showToast({ tone: "danger", title: "Upload Failed", message: err?.message || "Failed to upload file" });
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast({ tone: "warning", title: "Validation", message: "Title is required." });
      return;
    }
    if (!contentHtml.trim() && !attachedFile && !linkUrl.trim()) {
      showToast({ tone: "warning", title: "Validation", message: "Either document content, an external link, or a file attachment is required." });
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        title: title.trim(),
        category,
        content_html: contentHtml || undefined,
        link_url: linkUrl || undefined,
        file_id: attachedFile?.id || undefined,
        require_acknowledgement: requireAcknowledgement,
      };

      if (isEdit) {
        await documentApi.update(documentRecord.id, payload);
        showToast({ tone: "success", title: "Saved", message: "Document updated successfully." });
      } else {
        await documentApi.create(payload);
        showToast({ tone: "success", title: "Created", message: "Document created successfully." });
      }
      onSaved();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to save document" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideOver open={documentRecord !== false} onClose={onClose}>
      <SlideOverHeader
        title={isEdit ? `Edit Document: ${documentRecord.title}` : "Create Document"}
        onClose={onClose}
      />
      <SlideOverContent className="space-y-4">
        <TextField
          label="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q3 Dev Workflow Guide"
          required
        />
        
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="general">General</option>
          <option value="wiki">Wiki / Guide</option>
          <option value="handbook">Handbook</option>
          {isHrOrAdmin && <option value="policy">Policy (Official)</option>}
        </SelectField>

        {isHrOrAdmin && (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="requireAcknowledgement"
              checked={requireAcknowledgement}
              onChange={(e) => setRequireAcknowledgement(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="requireAcknowledgement" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
              Require Staff Read Acknowledgement
            </label>
          </div>
        )}

        <TextAreaField
          label="Content (HTML supported)"
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          placeholder="Write the document content here. You can use HTML tags for formatting."
          rows={10}
        />

        <TextField
          label="External Link URL"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://example.com/document"
          type="url"
        />

        {/* File Attachment Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">File Attachment</label>

          {attachedFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Icon name="attach_file" className="text-primary text-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{attachedFile.file_name}</p>
                {attachedFile.file_size && (
                  <p className="text-xs text-slate-500">{(attachedFile.file_size / 1024).toFixed(1)} KB</p>
                )}
              </div>
              {attachedFile.public_url && (
                <a
                  href={attachedFile.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-danger transition-colors"
                title="Remove attachment"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-primary hover:text-primary hover:bg-primary/5"
              >
                <Icon name={uploading ? "hourglass_empty" : "cloud_upload"} className="text-lg" />
                {uploading ? "Uploading..." : "Click to attach a file (PDF, Word, Image, etc.)"}
              </button>
            </div>
          )}
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={submitting || uploading}>
            {submitting ? "Saving..." : "Save Document"}
          </Button>
        </div>
      </SlideOverFooter>
    </SlideOver>
  );
}
