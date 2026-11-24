import React, { useRef, useState } from "react";
import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { useToast } from "@/shared";
import { httpRequest, resourceApi } from "@/shared/lib/core";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { ColleagueMultiSelect } from "@/shared/components/ui/ColleagueMultiSelect";
import { uploadFileAsset } from "@/pages/files/files-api";
import { RichTextEditor } from "@/shared/components/ui/RichTextEditor";
import { FolderKanban, Users, Upload, FileText, Trash2, Tag } from "lucide-react";

export interface ProjectAttachment {
  file_id: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at: string;
}

interface CreateProjectSlideOverProps {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId?: string) => void;
}

export function CreateProjectSlideOver({ open, onClose, onCreated }: CreateProjectSlideOverProps) {
  const { showToast } = useToast();
  const { colleagues } = useColleagues();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"planned" | "active" | "on_hold" | "completed">("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded: ProjectAttachment[] = [];
      for (const file of files) {
        const asset = await uploadFileAsset(file, { metadata: { purpose: "project_document" } });
        uploaded.push({
          file_id: asset.id,
          file_name: asset.file_name || file.name,
          mime_type: asset.mime_type || file.type || null,
          file_size: Number(asset.file_size ?? file.size ?? 0),
          uploaded_at: new Date().toISOString(),
        });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      showToast({ tone: "success", title: "Uploaded", message: `${uploaded.length} document(s) attached.` });
    } catch {
      showToast({ tone: "danger", title: "Upload failed", message: "Could not upload document." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ tone: "danger", title: "Required", message: "Project name is required." });
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created: any = await httpRequest("/projects", {
        method: "POST",
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          project_code: projectCode.trim() || undefined,
          governance_status: status,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          metadata: {
            tags,
            documents: attachments,
          },
        },
      });

      const createdId = String(created?.id ?? created?.data?.id ?? "");
      if (createdId && selectedMemberIds.length > 0) {
        await Promise.allSettled(
          selectedMemberIds.map((userId) =>
            httpRequest(`/projects/${createdId}/members`, {
              method: "POST",
              body: { user_id: userId, role: "member" },
            }),
          ),
        );
      }

      showToast({ tone: "success", title: "Project created", message: `"${name.trim()}" is ready.` });
      setName("");
      setProjectCode("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setTagsInput("");
      setSelectedMemberIds([]);
      setAttachments([]);
      onCreated(createdId || undefined);
      onClose();
    } catch {
      showToast({ tone: "danger", title: "Error", message: "Failed to create project." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} size="xl">
      <SlideOverHeader title="Create New Project" onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
        <SlideOverContent>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-neutral-700 block mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q4 Customer Onboarding Redesign"
                  className="w-full text-xs font-medium text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#ff6900]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1">Project Code</label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="e.g., PRJ-2026-01"
                  className="w-full text-xs font-mono text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#ff6900]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">Description &amp; Scope</label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe project goals, deliverables, milestones, and success criteria..."
                minHeightClass="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">Status</label>
                <SelectBox
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </SelectBox>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">Start Date</label>
                <DateInput
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">Target End Date</label>
                <DateInput
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5 mb-1">
                <Tag className="h-3.5 w-3.5 text-[#ff6900]" />
                <span>Project Tags (comma separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Frontend, Q4, Operations"
                className="w-full text-xs text-neutral-800 border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff6900]"
              />
            </div>

            {/* Team Members */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#ff6900]" />
                  <span>Assign Team Members ({selectedMemberIds.length})</span>
                </label>
                <span className="text-xs text-neutral-400">Search &amp; select staff working on this project</span>
              </div>
              <ColleagueMultiSelect
                colleagues={colleagues}
                selectedIds={selectedMemberIds}
                onChange={setSelectedMemberIds}
                placeholder="Search staff by name, email, or role..."
              />
            </div>

            {/* Document Attachments */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-[#ff6900]" />
                  <span>Project Documents ({attachments.length})</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? "Uploading..." : "Attach Document"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleFileUpload(e)}
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((doc) => (
                    <div
                      key={doc.file_id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-[#ff6900] shrink-0" />
                        <span className="truncate font-medium text-neutral-800">{doc.file_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((a) => a.file_id !== doc.file_id))}
                        className="p-1 text-neutral-400 hover:text-rose-600"
                        title="Remove attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SlideOverContent>

        <SlideOverFooter>
          <div className="w-full flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium shadow-sm disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Project"}
            </button>
          </div>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
