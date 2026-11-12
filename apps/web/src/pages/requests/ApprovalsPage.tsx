import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listApprovals,
  listRequestTypes,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { formatCurrency } from "@stanforte/shared";
import {
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  FileCheck,
  Calendar,
  Building,
  User,
  AlertCircle,
} from "lucide-react";

type SortBy = "created_at" | "request_number" | "total_amount" | "status";

type UiApprovalRow = {
  id: string;
  requestId: string;
  requestNo: string;
  type: string;
  requestTypeId: string;
  categoryLabel: string;
  staff: string;
  teamName: string;
  organizationName: string;
  totalAmount: number;
  currency: string;
  submitted: string;
  dueDate: string;
  createdAtIso?: string;
  status: string;
  statusKey: string;
  tone: "success" | "warning" | "pending" | "danger" | "neutral";
  pendingStep: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateOnlyKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTone(status: string): UiApprovalRow["tone"] {
  const key = status.toLowerCase();
  if (["approved", "completed", "confirmed"].includes(key)) return "success";
  if (["rejected", "cancelled"].includes(key)) return "danger";
  if (["under_review", "review", "draft"].includes(key)) return "warning";
  if (["pending", "submitted", "approval"].includes(key)) return "pending";
  return "neutral";
}

function toTitleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPersonName(creator?: RequestRecord["creator"]) {
  if (!creator) return "-";
  const name = `${creator.first_name || ""} ${creator.last_name || ""}`.trim();
  return name || creator.email || creator.username || "-";
}

function groupLabel(groupName?: string | null): string {
  if (!groupName) return "";
  return groupName;
}

function toRow(request: RequestRecord, teamsMap?: Map<string, string>): UiApprovalRow {
  const rawStatus = String(request.status || "Pending");
  const pendingSteps = request.approvals?.pending ?? [];
  const pendingStep = pendingSteps.length > 0 ? toTitleCase(pendingSteps[0].step || "Review") : "";
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const typeName = request.request_type?.name || "General Request";
  const teamId = String((request as any).team_id ?? data.team_id ?? "").trim();
  const teamName = (teamId && teamsMap?.get(teamId)) || String(data.team_name ?? data.team ?? "").trim();
  const organizationName = String((request as any).organization?.name ?? data.organization_name ?? "").trim();
  const dueDate = formatDate(String(data.due_date ?? data.end_date ?? "").trim() || undefined);

  return {
    id: request.id,
    requestId: request.id,
    requestNo: request.request_number || `REQ-${request.id}`,
    type: typeName,
    requestTypeId: String(request.request_type?.id ?? ""),
    categoryLabel: groupLabel(request.group?.name),
    staff: formatPersonName(request.creator),
    teamName,
    organizationName,
    totalAmount: Number(request.total_amount ?? request.request_total_amount ?? 0),
    currency: request.currency || "NGN",
    submitted: formatDate(request.created_at),
    dueDate,
    createdAtIso: request.created_at,
    status: rawStatus.replaceAll("_", " "),
    statusKey: rawStatus.toLowerCase(),
    tone: toTone(rawStatus),
    pendingStep,
  };
}

function isPendingLike(row: UiApprovalRow) {
  return ["pending", "submitted", "approval", "under_review", "review", "draft"].some(
    (key) => row.statusKey.includes(key),
  );
}

export function ApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useCachedQuery(
    "approvals:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [status, setStatus] = useState("");
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const {
    data: approvalsData,
    loading,
    error,
    refetch,
  } = useCachedQuery(
    "approvals:list",
    () => listApprovals(),
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
    const source = Array.isArray(approvalsData) ? approvalsData : [];
    return source.map((r) => toRow(r, teamsMap));
  }, [approvalsData, teamsMap]);

  const requestTypeOptions = useMemo(() => {
    const types = Array.isArray(requestTypes)
      ? requestTypes.filter((t) => t?.id && t?.name).map((t) => ({ value: String(t.id), label: String(t.name) }))
      : [];
    return [{ value: "all", label: "All types" }, ...types];
  }, [requestTypes]);

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(allRows.map((r) => r.statusKey).filter(Boolean)));
    return [{ value: "", label: "All statuses" }, ...values.map((v) => ({ value: v, label: toTitleCase(v) }))];
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (status && row.statusKey !== status) return false;
      if (selectedRequestTypeId !== "all" && row.requestTypeId !== selectedRequestTypeId) return false;
      if (filterDate) {
        const key = dateOnlyKey(row.createdAtIso);
        if (!key || key !== filterDate) return false;
      }
      if (search.trim()) {
        const haystack = [row.requestNo, row.type, row.staff, row.pendingStep, row.teamName].join(" ").toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [allRows, status, selectedRequestTypeId, filterDate, search]);

  const sortedRows = useMemo(() => {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      if (sortBy === "created_at") return ((new Date(a.createdAtIso || 0).getTime() - new Date(b.createdAtIso || 0).getTime()) || 0) * dir;
      if (sortBy === "request_number") return a.requestNo.localeCompare(b.requestNo, undefined, { numeric: true }) * dir;
      if (sortBy === "total_amount") return (a.totalAmount - b.totalAmount) * dir;
      return a.status.localeCompare(b.status) * dir;
    });
  }, [filteredRows, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [sortedRows, safePage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [status, selectedRequestTypeId, filterDate, search, sortBy, sortOrder]);

  const awaiting = allRows.filter((r) => isPendingLike(r)).length;
  const approved = allRows.filter((r) => r.tone === "success").length;
  const rejected = allRows.filter((r) => r.tone === "danger").length;
  const totalPendingAmount = allRows
    .filter((r) => isPendingLike(r))
    .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  return (
    <PortalLayout activeNav="Approvals">
      <div className="space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">Approvals</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Approval Queue
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, verify, and decide on requests awaiting your authorization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#ff6900]" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
            >
              <FileCheck className="h-4 w-4" />
              <span>New Request</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Awaiting Decision</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{awaiting}</div>
              </div>
            </div>
            {awaiting > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Approved</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{approved}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Completed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Rejected / Returned</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{rejected}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Actioned
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Value Under Review</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(totalPendingAmount, "NGN")}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Exposure
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by request #, submitter name, department..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900] shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={selectedRequestTypeId}
              onChange={(e) => setSelectedRequestTypeId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
            >
              {requestTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Requests In Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {sortedRows.length} requests matching active filters.
              </p>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                Page {safePage} of {totalPages}
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 mx-5 my-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Could not load approval queue: {String(error)}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Request No</th>
                  <th className="py-3.5 px-4">Submitter</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Team / Dept</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Current Step</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading approvals...
                    </td>
                  </tr>
                ) : pagedRows.length > 0 ? (
                  pagedRows.map((row) => (
                    <tr key={row.requestId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <Link
                          to={`/requests/approvals/${row.requestId}`}
                          className="hover:text-[#ff6900] transition"
                        >
                          {row.requestNo}
                        </Link>
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          {row.submitted}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{row.staff}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{row.type}</span>
                        {row.categoryLabel && (
                          <span className="text-[10px] text-slate-400 block">{row.categoryLabel}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium">{row.teamName || "-"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.totalAmount > 0 ? formatCurrency(row.totalAmount, row.currency) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.pendingStep ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200/60">
                            {row.pendingStep}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
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
                          to={`/requests/approvals/${row.requestId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1128] hover:bg-[#162044] text-white text-[11px] font-bold transition shadow-sm"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No approvals found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Your queue is completely clear. No requests currently require your action.
                      </p>
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

export default ApprovalsPage;
