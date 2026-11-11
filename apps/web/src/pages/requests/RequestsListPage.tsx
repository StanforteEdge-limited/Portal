import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listRequests,
  listRequestTypes,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { formatCurrency } from "@stanforte/shared";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  FileText,
  Calendar,
  Building,
  ArrowRight,
  Filter,
} from "lucide-react";

type RequestGroupFilter = "all" | "financial" | "hr";

type UiRequestRow = {
  id: string;
  requestId: string;
  category: RequestGroupFilter;
  type: string;
  requestTypeId: string;
  totalAmount: number;
  currency: string;
  projectName: string;
  teamName: string;
  purpose: string;
  submitted: string;
  status: string;
  statusKey: string;
  tone: "success" | "warning" | "pending" | "danger" | "neutral";
  durationLabel?: string;
  createdAtIso?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toTone(status: string): "success" | "warning" | "pending" | "danger" | "neutral" {
  const key = status.toLowerCase();
  if (["approved", "completed", "paid", "disbursed", "confirmed"].includes(key)) return "success";
  if (["rejected", "cancelled", "voided"].includes(key)) return "danger";
  if (["under_review", "review", "draft", "prepared"].includes(key)) return "warning";
  if (["pending", "submitted", "approval"].includes(key)) return "pending";
  return "neutral";
}

function classifyCategory(rawType: string, rawName: string): RequestGroupFilter {
  const t = `${rawType} ${rawName}`.toLowerCase();
  if (t.includes("leave") || t.includes("absence") || t.includes("vacation") || t.includes("sick")) return "hr";
  if (t.includes("payment") || t.includes("expense") || t.includes("reimburse") || t.includes("procurement") || t.includes("finance")) return "financial";
  return "all";
}

function toRow(request: RequestRecord, teamsMap?: Map<string, string>): UiRequestRow {
  const rawStatus = String(request.status || "Pending");
  const data = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {};
  const typeName = request.request_type?.name || "General Request";
  const category = classifyCategory(String((request.request_type as any)?.slug || (request.request_type as any)?.code_prefix || ""), typeName);
  const teamId = String((request as any).team_id ?? data.team_id ?? "").trim();
  const teamName = (teamId && teamsMap?.get(teamId)) || String(data.team_name ?? data.team ?? "").trim();
  const daysRequested = Number(data.days_requested);

  return {
    id: request.request_number || `REQ-${request.id}`,
    requestId: request.id,
    category,
    type: typeName,
    requestTypeId: String(request.request_type?.id ?? ""),
    totalAmount: Number(request.total_amount ?? request.request_total_amount ?? 0),
    currency: request.currency || "NGN",
    projectName: String(data.project_name ?? data.project ?? "").trim(),
    teamName,
    purpose: String((request as any).summary || data.purpose || data.reason || (request as any).notes || "-"),
    submitted: formatDate(request.created_at),
    status: rawStatus.replaceAll("_", " "),
    statusKey: rawStatus.toLowerCase(),
    tone: toTone(rawStatus),
    durationLabel: Number.isFinite(daysRequested) && daysRequested > 0 ? `${daysRequested} days` : undefined,
    createdAtIso: request.created_at,
  };
}

export function RequestsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const categoryParam = searchParams.get("category");
  const activeCategory: RequestGroupFilter =
    categoryParam === "financial" || categoryParam === "hr" || categoryParam === "all"
      ? categoryParam
      : "all";

  const { data: profile } = useCachedQuery(
    "requests:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const {
    data: requestsData,
    loading: loadingRequests,
    error: requestsError,
    refetch: refetchRequests,
  } = useCachedQuery(
    "requests:list:mine",
    () => listRequests({ only_mine: "true" }),
    { ttlMs: 1000 * 60 * 2, storage: "memory" },
  );

  const { data: requestTypes } = useCachedQuery(
    "requests:types",
    () => listRequestTypes(),
    { ttlMs: 1000 * 60 * 10, storage: "local" },
  );

  const teamsMap = useMemo(() => {
    const map = new Map<string, string>();
    const groups = (profile as any)?.groups ?? (profile as any)?.teams ?? [];
    (groups as Array<{ id?: unknown; name?: string | null }>).forEach((g) => {
      if (g.id && g.name) map.set(String(g.id), g.name);
    });
    return map;
  }, [profile]);

  const allRows = useMemo(() => {
    const source = Array.isArray(requestsData) ? requestsData : [];
    return source.map((r) => toRow(r, teamsMap));
  }, [requestsData, teamsMap]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (activeCategory !== "all" && row.category !== activeCategory) return false;
      if (status && row.statusKey !== status) return false;
      if (selectedRequestTypeId !== "all" && row.requestTypeId !== selectedRequestTypeId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [row.id, row.type, row.purpose, row.teamName, row.projectName].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, activeCategory, status, selectedRequestTypeId, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, safePage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, status, selectedRequestTypeId, search]);

  const pendingCount = allRows.filter((r) => r.tone === "pending" || r.tone === "warning").length;
  const approvedCount = allRows.filter((r) => r.tone === "success").length;
  const rejectedCount = allRows.filter((r) => r.tone === "danger").length;
  const totalFinancialAmount = allRows
    .filter((r) => r.category === "financial")
    .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  return (
    <PortalLayout activeNav="Approvals">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="My Requests & Submissions"
          description="Track the progress, audit trails, and status of your submitted operational requisitions."
          icon={FileText}
          iconColor="bg-amber-50 text-amber-600"
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => refetchRequests()}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? "animate-spin text-[#ff6900]" : ""}`} />
                <span>Refresh</span>
              </button>
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Request</span>
              </Link>
            </div>
          }
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">In Progress</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{pendingCount}</div>
              </div>
            </div>
            {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Approved</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{approvedCount}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Settled
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Rejected / Returned</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{rejectedCount}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Actioned
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Requested</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(totalFinancialAmount, "NGN")}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Disbursed
            </div>
          </div>
        </div>

        {/* Filter and Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("category", "all");
                setSearchParams(next);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Requests
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("category", "financial");
                setSearchParams(next);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "financial" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Financial & Expenses
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("category", "hr");
                setSearchParams(next);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "hr" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Leave & HR
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request ID, reason, team..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900] shadow-sm"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Submission Records</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredRows.length} requests in this view.
              </p>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                Page {safePage} of {totalPages}
              </span>
            )}
          </div>

          {requestsError && (
            <div className="p-4 mx-5 my-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Could not load requests: {String(requestsError)}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Request ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Summary / Purpose</th>
                  <th className="py-3.5 px-4">Team / Project</th>
                  <th className="py-3.5 px-4">Amount / Duration</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading submissions...
                    </td>
                  </tr>
                ) : pagedRows.length > 0 ? (
                  pagedRows.map((row) => (
                    <tr key={row.requestId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="hover:text-[#ff6900] transition flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>{row.id}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {row.type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {row.purpose}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium">{row.teamName || row.projectName || "-"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.durationLabel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px]">
                            {row.durationLabel}
                          </span>
                        ) : row.totalAmount > 0 ? (
                          formatCurrency(row.totalAmount, row.currency)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{row.submitted}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                            row.tone === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : row.tone === "danger"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : row.tone === "warning" || row.tone === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-slate-50 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.tone === "success"
                                ? "bg-emerald-500"
                                : row.tone === "danger"
                                ? "bg-rose-500"
                                : row.tone === "warning" || row.tone === "pending"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff6900] hover:text-[#e05d00] transition"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No requests found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        You have not created any requests matching the selected category.
                      </p>
                      <Link
                        to="/requests/new"
                        className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-[#ff6900] text-white text-xs font-bold transition shadow-sm hover:bg-[#e05d00]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create New Request</span>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

export default RequestsListPage;
