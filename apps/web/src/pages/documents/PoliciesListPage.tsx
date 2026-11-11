import { useState, useMemo } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Calendar,
} from "lucide-react";

export default function PoliciesListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, loading } = useCachedQuery(
    "documents:policies:required",
    () => documentApi.list({ category: "policy" }),
    { ttlMs: 1000 * 30 }
  );

  const list: any[] = useMemo(() => {
    return Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data)
      ? data
      : [];
  }, [data]);

  const totalRequired = list.filter((doc) => doc.require_acknowledgement).length;
  const totalSigned = list.filter(
    (doc) => doc.require_acknowledgement && doc.acknowledgements?.length > 0
  ).length;
  const pendingCount = totalRequired - totalSigned;
  const complianceRate =
    totalRequired > 0 ? Math.round((totalSigned / totalRequired) * 100) : 100;

  const filteredList = useMemo(() => {
    return list.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const isSigned = doc.require_acknowledgement && doc.acknowledgements?.length > 0;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "signed" && isSigned) ||
        (statusFilter === "pending" && !isSigned && doc.require_acknowledgement);
      return matchesSearch && matchesStatus;
    });
  }, [list, searchQuery, statusFilter]);

  return (
    <PortalLayout activeNav="Policies">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Policies & Handbooks"
          description="Review and acknowledge organizational regulations, compliance policies, and staff code of conduct."
          icon={FileCheck}
          iconColor="bg-orange-50 text-[#ff6900]"
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Required */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Required Policies</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalRequired}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Mandatory
            </div>
          </div>

          {/* Card 2: Signed Off */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Acknowledged</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{totalSigned}</div>
            </div>
          </div>

          {/* Card 3: Pending Signature */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Pending Sign-off</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">{pendingCount}</div>
            </div>
          </div>

          {/* Card 4: Compliance Rate */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Compliance Rate</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{complianceRate}%</div>
              </div>
            </div>
            <div
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                complianceRate === 100
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              {complianceRate === 100 ? "Complete" : "In Progress"}
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              {[
                { id: "all", label: "All Policies" },
                { id: "pending", label: "Needs Signature" },
                { id: "signed", label: "Acknowledged" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === st.id
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modern High-Density Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Corporate Governance & Compliance Handbook ({filteredList.length})
            </h3>
          </div>

          {loading && list.length === 0 ? (
            <div className="p-12 text-center text-xs font-medium text-slate-400">
              Loading policies roster...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No policies found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery
                  ? "No policies match your search keyword."
                  : "All corporate policies are up to date."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Policy Name</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Compliance Status</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredList.map((doc: any) => {
                    const ack = Array.isArray(doc.acknowledgements) ? doc.acknowledgements[0] : null;
                    const isSigned = !!ack;

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#ff6900] group-hover:text-white transition-colors">
                              <ShieldCheck className="h-4 w-4" />
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

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          v{doc.version || "1.0"}
                        </td>

                        <td className="py-3.5 px-4">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Acknowledged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="h-3 w-3" /> Action Required
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>
                              {doc.effective_date
                                ? new Date(doc.effective_date).toLocaleDateString()
                                : "Immediate"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                              isSigned
                                ? "text-slate-700 border border-slate-200 group-hover:bg-slate-100"
                                : "text-white bg-[#ff6900] hover:bg-[#ea580c] shadow-orange-500/20"
                            }`}
                          >
                            <span>{isSigned ? "Review" : "Sign Now"}</span>
                            <ArrowRight className="h-3 w-3" />
                          </span>
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
    </PortalLayout>
  );
}
