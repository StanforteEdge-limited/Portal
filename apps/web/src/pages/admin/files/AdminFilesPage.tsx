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
    if (mimeType?.startsWith("image/")) return <Image className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />;
    if (mimeType?.startsWith("video/")) return <Video className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />;
    if (mimeType?.includes("pdf") || mimeType?.includes("document") || mimeType?.includes("text")) {
      return <FileText className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />;
    }
    return <File className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />;
  };

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Media and file assets"
          description="Manage uploaded corporate assets, evidence attachments, and storage usage"
          actions={
            <div className="flex items-center gap-2">
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
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" strokeWidth={1.5} />
                )}
                <span>{uploading ? "Uploading" : "Upload file"}</span>
              </button>
            </div>
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Cataloged files</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {(totalCount || files.length).toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Stored in object vault</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Attached in workflows</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {attachedCount.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Referenced by records</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Standalone assets</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {Math.max(0, files.length - attachedCount).toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Unlinked uploads</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Upload pipeline</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline">
              Presigned
            </p>
            <p className="text-xs text-neutral-500">Direct S3 relay enabled</p>
          </article>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative min-w-[260px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search files"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              />
            </div>

            <SelectBox
              value={fileType}
              onChange={(e) => {
                setFileType(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-700 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
            >
              <option value="">All file types</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="documents">Documents</option>
            </SelectBox>

            <button
              type="button"
              onClick={() => void refetch()}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              title="Refresh files"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* View mode toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-900/[0.06] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors duration-150 ${viewMode === "grid" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors duration-150 ${viewMode === "list" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                }`}
              title="List view"
            >
              <List className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl p-14 text-center text-neutral-500 shadow-xs">
            <div className="w-5 h-5 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading media assets</p>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl p-14 text-center text-neutral-500 shadow-xs">
            <FolderOpen className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
            <div className="font-medium text-neutral-900 text-sm">No files found</div>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Upload documents, spreadsheets, or images via direct S3 storage
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file: any) => (
              <div
                key={file.id}
                className="group relative bg-white border border-neutral-900/[0.08] rounded-2xl p-3 hover:border-neutral-900/[0.16] shadow-xs transition-colors duration-150 flex flex-col justify-between"
              >
                <div className="aspect-square bg-neutral-50 rounded-xl flex items-center justify-center mb-2.5 overflow-hidden border border-neutral-900/[0.06]">
                  {file.mime_type?.startsWith("image/") && file.public_url ? (
                    <img
                      src={file.public_url}
                      alt={file.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    renderFileIcon(file.mime_type)
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-neutral-900 truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
                    <span className="font-mono tabular-nums">{formatFileSize(file.file_size)}</span>
                    {file.usage?.attached && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-600/15 px-1.5 py-0.5 rounded-md">
                        Attached
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDelete(file.id, file.file_name)}
                  disabled={deletingId === file.id}
                  className="absolute top-2 right-2 h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white text-neutral-500 hover:text-rose-600 hover:bg-rose-50 shadow-xs border border-neutral-900/[0.10] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">File name</th>
                    <th className="py-3 px-5">MIME type</th>
                    <th className="py-3 px-5 text-right">Size</th>
                    <th className="py-3 px-5">Usage</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {files.map((file: any) => (
                    <tr key={file.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-900/[0.06] flex items-center justify-center shrink-0">
                            {renderFileIcon(file.mime_type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 truncate max-w-xs">{file.file_name}</p>
                            <p className="text-xs text-neutral-500 font-mono truncate max-w-xs">
                              {file.storage_path}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <code className="font-mono text-xs text-neutral-700 bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md">
                          {file.mime_type || "application/octet-stream"}
                        </code>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="py-3.5 px-5">
                        {file.usage?.attached ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-600/15">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-900/[0.08]">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Standalone
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {file.public_url && (
                            <a
                              href={file.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Open file"
                            >
                              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(file.id, file.file_name)}
                            disabled={deletingId === file.id}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2">
            <span className="tabular-nums">
              Page <span className="font-medium text-neutral-900">{page}</span> of{" "}
              <span className="font-medium text-neutral-900">{totalPages}</span> ({totalCount} assets)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3 rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 font-medium transition-colors duration-150"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-3 rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 font-medium transition-colors duration-150"
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
