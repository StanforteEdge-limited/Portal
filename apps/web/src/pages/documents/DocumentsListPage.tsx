import { useState, useMemo } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import DocumentSlideOver from "./DocumentSlideOver";
import DocumentShareModal from "./DocumentShareModal";
import { INITIAL_DOCUMENTS, type DocumentItem, type DocumentSharedRecord } from "./types";
import {
  FileText,
  BookOpen,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Paperclip,
  Users,
} from "lucide-react";

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingDoc, setEditingDoc] = useState<any | boolean>(false);
  const [sharingDoc, setSharingDoc] = useState<DocumentItem | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  const { data, loading, refetch } = useCachedQuery(
    `documents:list:${activeCategory}:${search}`,
    () =>
      documentApi.list({
        category: activeCategory !== "all" ? activeCategory : undefined,
        search: search.trim() || undefined,
      }),
    { ttlMs: 1000 * 10 }
  );

  const documents: DocumentItem[] = useMemo(() => {
    // 1. API records
    const apiItems: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data?.data?.items)
      ? data.data.items
      : Array.isArray(data)
      ? data
      : [];

    // 2. Locally persisted records
    let localDocs: any[] = [];
    try {
      const saved = localStorage.getItem("portal_documents_catalog");
      if (saved) localDocs = JSON.parse(saved);
    } catch {}

    // Combine into a map to guarantee uniqueness by ID
    const map = new Map<string, any>();
    INITIAL_DOCUMENTS.forEach((doc) => map.set(doc.id, doc));
    apiItems.forEach((doc) => map.set(String(doc.id), doc));
    localDocs.forEach((doc) => map.set(String(doc.id), doc));

    const all = Array.from(map.values());

    return all.filter((doc) => {
      const matchesCategory =
        activeCategory === "all" ||
        String(doc.category || "").toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        String(doc.title || "").toLowerCase().includes(search.toLowerCase()) ||
        String(doc.content_html || "").toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [data, activeCategory, search, localRefresh]);

  const totalCount = documents.length;
  const policyCount = documents.filter((d) => d.category === "policy").length;
  const wikiCount = documents.filter((d) => ["wiki", "handbook", "guide"].includes(d.category)).length;
  const reqAckCount = documents.filter((d) => d.require_acknowledgement).length;

  const categories = [
    { id: "all", label: "All Documents" },
    { id: "policy", label: "Policies" },
    { id: "wiki", label: "Wikis & Guides" },
    { id: "handbook", label: "Handbooks" },
    { id: "general", label: "General" },
  ];

  function handleDocumentShared(record: DocumentSharedRecord) {
    if (!sharingDoc) return;
    try {
      const saved = JSON.parse(localStorage.getItem("portal_documents_catalog") || "[]");
      const updated = saved.map((d: any) => {
        if (d.id === sharingDoc.id) {
          const shares = d.shares || [];
          return { ...d, shares: [record, ...shares] };
        }
        return d;
      });
      // If doc not yet in local storage, add it
      if (!saved.some((d: any) => d.id === sharingDoc.id)) {
        updated.unshift({
          ...sharingDoc,
          shares: [record, ...(sharingDoc.shares || [])],
        });
      }
      localStorage.setItem("portal_documents_catalog", JSON.stringify(updated));
      setLocalRefresh((c) => c + 1);
    } catch {}
  }

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6">
        {/* Modern Grounded Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Documents & Knowledge Hub"
          description="Browse company policies, operating manuals, department wikis, and governance templates."
          icon={FileText}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <button
              type="button"
              onClick={() => setEditingDoc(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-95 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Document</span>
            </button>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Documents</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalCount}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Cataloged
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Corporate Policies</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{policyCount}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Wikis & SOPs</div>
              <div className="text-xl font-black text-purple-700 mt-0.5">{wikiCount}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Requires Sign-off</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">{reqAckCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Modern High-Density Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Document Catalog ({documents.length})
            </h3>
          </div>

          {loading && documents.length === 0 ? (
            <div className="p-12 text-center text-xs font-medium text-slate-400">
              Loading documents directory...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No documents found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {search
                  ? "No documents match your search criteria."
                  : "No documents cataloged in this category."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Document Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Sign-off Requirement</th>
                    <th className="py-3 px-4">Sharing Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map((doc: DocumentItem) => {
                    const shareCount = doc.shares?.length || 0;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#ff6900] group-hover:text-white transition-colors">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors truncate">
                                {doc.title}
                              </p>
                              {doc.file && (
                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <Paperclip className="h-3 w-3 text-slate-400" />
                                  <span>{doc.file.file_name}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 capitalize">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {doc.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-bold">
                          {doc.version || "v1.0"}
                        </td>

                        <td className="py-3.5 px-4">
                          {doc.require_acknowledgement ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="h-3 w-3" /> Required
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {shareCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <Users className="h-3 w-3" /> Shared ({shareCount})
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Not yet shared</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSharingDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-[#ff6900] text-[#ff6900] hover:text-white border border-orange-200/80 hover:border-[#ff6900] text-xs font-bold transition shadow-xs active:scale-95"
                              title="Share document with colleague via Email and Chat"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Share</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/documents/${doc.id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 transition shadow-xs"
                            >
                              <span>View</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload/Edit Document SlideOver */}
      {editingDoc !== false && (
        <DocumentSlideOver
          documentRecord={typeof editingDoc === "object" ? editingDoc : null}
          onClose={() => setEditingDoc(false)}
          onSaved={() => {
            setEditingDoc(false);
            setLocalRefresh((c) => c + 1);
            void refetch();
          }}
        />
      )}

      {/* Share Document Modal */}
      <DocumentShareModal
        document={sharingDoc}
        isOpen={!!sharingDoc}
        onClose={() => setSharingDoc(null)}
        onShared={handleDocumentShared}
      />
    </PortalLayout>
  );
}

