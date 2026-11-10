import { useState, useMemo } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import DocumentSlideOver from "./DocumentSlideOver";
import {
  FileText,
  BookOpen,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingDoc, setEditingDoc] = useState<any | boolean>(false);

  const { data, loading, refetch } = useCachedQuery(
    `documents:list:${activeCategory}:${search}`,
    () =>
      documentApi.list({
        category: activeCategory !== "all" ? activeCategory : undefined,
        search: search.trim() || undefined,
      }),
    { ttlMs: 1000 * 10 }
  );

  const documents: any[] = useMemo(() => {
    return Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data)
      ? data
      : [];
  }, [data]);

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

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>Knowledge Base</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900]">Documents</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Documents & Knowledge Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse company policies, operating manuals, department wikis, and governance templates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingDoc(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Document</span>
            </button>
          </div>
        </div>

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
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map((doc: any) => (
                    <tr
                      key={doc.id}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#ff6900] group-hover:text-white transition-colors">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors truncate">
                              {doc.title}
                            </p>
                            {doc.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-sm">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {doc.category === "job_description" ? "Job Description" : doc.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        v{doc.version || "1.0"}
                      </td>

                      <td className="py-3.5 px-4">
                        {doc.require_acknowledgement ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> Required
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 group-hover:text-white group-hover:bg-[#ff6900] border border-slate-200 group-hover:border-[#ff6900] transition shadow-sm">
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingDoc !== false && (
        <DocumentSlideOver
          documentRecord={typeof editingDoc === "object" ? editingDoc : null}
          onClose={() => setEditingDoc(false)}
          onSaved={() => {
            setEditingDoc(false);
            void refetch();
          }}
        />
      )}
    </PortalLayout>
  );
}
