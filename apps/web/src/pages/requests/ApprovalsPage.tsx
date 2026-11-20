import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-neutral-900/[0.08]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] leading-tight font-medium text-neutral-900 tracking-tight font-headline">
              Approval queue
            </h1>
            <p className="text-sm text-neutral-500">
              Review, verify, and decide on requests awaiting your authorization.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white border border-neutral-900/[0.10] hover:bg-neutral-50 text-neutral-900 text-sm font-medium transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-neutral-500 ${loading ? "animate-spin text-[#ff6900]" : ""}`} strokeWidth={1.5} />
              <span>Refresh</span>
            </button>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors active:scale-[0.98]"
            >
              <FileCheck className="h-4 w-4" strokeWidth={1.5} />
              <span>New request</span>
            </Link>
          </div>
        </header>

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Awaiting decision</p>
            <p className="text-[28px] leading-none font-medium text-[#c2410c] font-headline tabular-nums">
              {awaiting}
            </p>
            <p className="text-xs text-neutral-500">Requires your review</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Approved</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {approved}
            </p>
            <p className="text-xs text-neutral-500">Completed sign-offs</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Rejected or returned</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {rejected}
            </p>
            <p className="text-xs text-neutral-500">Actioned items</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Value under review</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {formatCurrency(totalPendingAmount, "NGN")}
            </p>
            <p className="text-xs text-neutral-500">Pending financial exposure</p>
          </article>
        </div>

        {/* Single-Row Filter and Search Bar */}
        <div className="p-3.5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request #, submitter, or department"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#ff6900]"
            />
          </div>

          <div className="md:col-span-2">
            <SelectBox
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-xs font-medium text-neutral-700"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectBox>
          </div>

          <div className="md:col-span-3">
            <SelectBox
              value={selectedRequestTypeId}
              onChange={(e) => setSelectedRequestTypeId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-xs font-medium text-neutral-700"
            >
              {requestTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectBox>
          </div>

          <div className="md:col-span-2">
            <DateInput
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-xs font-medium text-neutral-700"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-neutral-900">Requests In Queue</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Showing {sortedRows.length} requests matching active filters.
              </p>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-xs font-semibold text-neutral-500">
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
              <thead className="bg-neutral-50/75 text-neutral-500 font-medium border-b border-neutral-100">
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
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400">
                      Loading approvals...
                    </td>
                  </tr>
                ) : pagedRows.length > 0 ? (
                  pagedRows.map((row) => (
                    <tr key={row.requestId} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3.5 px-5 font-medium text-neutral-900">
                        <Link
                          to={`/requests/approvals/${row.requestId}`}
                          className="hover:text-[#ff6900] transition"
                        >
                          {row.requestNo}
                        </Link>
                        <div className="text-xs font-normal text-neutral-400 mt-0.5">
                          {row.submitted}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-800">{row.staff}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-700">{row.type}</span>
                        {row.categoryLabel && (
                          <span className="text-xs text-neutral-400 block">{row.categoryLabel}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        <span className="font-medium">{row.teamName || "-"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-900">
                        {row.totalAmount > 0 ? formatCurrency(row.totalAmount, row.currency) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.pendingStep ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-200/60">
                            {row.pendingStep}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-xs ${
                            row.tone === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : row.tone === "danger"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : row.tone === "warning" || row.tone === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-neutral-50 text-neutral-700 border border-neutral-200"
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
                                : "bg-neutral-400"
                            }`}
                          />
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/requests/approvals/${row.requestId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1128] hover:bg-[#162044] text-white text-xs font-medium transition shadow-sm"
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
                      <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-neutral-700 text-sm">No approvals found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
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
            <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-neutral-600">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
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
