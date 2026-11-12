import { SelectBox } from "@/components/ui/select";
import { useState, useRef, useMemo } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi } from "@/shared/lib/core";
import { useToast, PageHeader } from "@/shared";
import { formatFileSize } from "@stanforte/shared";
import {
  FolderOpen,
  Upload,
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  Trash2,
  FileText,
  Image,
  Video,
  File,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Database,
  Paperclip,
} from "lucide-react";

type ViewMode = "grid" | "list";

export default function AdminFilesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listKey, setListKey] = useState(0);
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [totalCount, setTotalCount] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: filesData, loading, refetch } = useCachedQuery(
    `admin:files:${listKey}:${search}:${fileType}:${page}:${perPage}`,
    async () => {
      const result = await resourceApi.listFiles({
        search: search || undefined,
        include_usage: true,
        file_type: (fileType as "images" | "videos" | "documents") || undefined,
        page,
        per_page: perPage,
      });
      setTotalCount((result as any)?.data?.meta?.total ?? (Array.isArray(result) ? result.length : 0));
      return result;
    },
    { ttlMs: 0, storage: "memory" },
  );

  const files = Array.isArray(filesData?.result)
    ? filesData.result
    : Array.isArray(filesData)
    ? filesData
    : [];

  const totalPages = Math.ceil(totalCount / perPage) || 1;
  const attachedCount = files.filter((f: any) => f.usage?.attached).length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await resourceApi.uploadFile(file, { metadata: { source: "media_library" } });
      showToast(`${file.name} uploaded successfully.`, "success");
      setListKey((k) => k + 1);
    } catch (err: any) {
      showToast(err?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    setDeletingId(fileId);
    try {
      await resourceApi.deleteFile(fileId);
      showToast(`"${fileName}" deleted successfully.`, "success");
      setListKey((k) => k + 1);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete file.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const renderFileIcon = (mimeType?: string | null) => {
    if (mimeType?.startsWith("image/")) return <Image className="h-6 w-6 text-blue-500" />;
    if (mimeType?.startsWith("video/")) return <Video className="h-6 w-6 text-purple-500" />;
    if (mimeType?.includes("pdf") || mimeType?.includes("document") || mimeType?.includes("text")) {
      return <FileText className="h-6 w-6 text-amber-500" />;
    }
    return <File className="h-6 w-6 text-slate-400" />;
  };

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Enterprise Media & File Assets"
          description="Manage uploaded corporate assets, evidence attachments, and storage quota."
          icon={FolderOpen}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{uploading ? "Uploading..." : "Upload File Asset"}</span>
              </button>
            </div>
          }
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Cataloged Files</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalCount || files.length}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              S3 Vault
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Paperclip className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Attached in Workflows</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{attachedCount}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Active Use
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Standalone Assets</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {Math.max(0, files.length - attachedCount)}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Unlinked
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Direct Presign</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Zero-Byte Relay</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Enabled
            </span>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative min-w-[240px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search file name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            <SelectBox
              value={fileType}
              onChange={(e) => {
                setFileType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
            >
              <option value="">All File Types</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="documents">Documents</option>
            </SelectBox>

            <button
              type="button"
              onClick={() => void refetch()}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              title="Refresh files"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading media assets...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-500">
            <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <div className="font-bold text-slate-800 text-sm">No files found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Upload documents, spreadsheets, or images via direct S3 storage.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file: any) => (
              <div
                key={file.id}
                className="group relative bg-white border border-slate-200/80 rounded-2xl p-3 hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-2.5 overflow-hidden border border-slate-100">
                  {file.mime_type?.startsWith("image/") && file.public_url ? (
                    <img
                      src={file.public_url}
                      alt={file.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    renderFileIcon(file.mime_type)
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span>{formatFileSize(file.file_size)}</span>
                    {file.usage?.attached && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                        Attached
                      </span>
                    )}
                  </div>
                </div>

                {/* Floating delete button */}
                <button
                  type="button"
                  onClick={() => void handleDelete(file.id, file.file_name)}
                  disabled={deletingId === file.id}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 backdrop-blur-xs text-rose-600 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition hover:bg-rose-50"
                  title="Delete file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">File Name</th>
                    <th className="py-3 px-4">MIME Type</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">Usage State</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {files.map((file: any) => (
                    <tr key={file.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            {renderFileIcon(file.mime_type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-xs">{file.file_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                              {file.storage_path}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {file.mime_type || "application/octet-stream"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="py-3 px-4">
                        {file.usage?.attached ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Attached
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Standalone
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {file.public_url && (
                            <a
                              href={file.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Open file"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(file.id, file.file_name)}
                            disabled={deletingId === file.id}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Showing page {page} of {totalPages} ({totalCount} total assets)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
