import {
  Button,
  Chip,
  Icon,
  PaginationControls,
  SelectField,
  PageHeader,
  SectionCard,
  StatCard,
  DataTable,
  ColumnDef,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { sendNativeNotification } from "@/lib/tauri-bridge";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listApprovals,
  listRequestTypes,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import {
  buildRequestsNavigation,
  requestsMobileNav,
} from "@/pages/requests/requests-data";

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
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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
        const haystack = [row.requestNo, row.type, row.staff, row.pendingStep].join(" ").toLowerCase();
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
  }, [status, selectedRequestTypeId, filterDate, search, sortBy, sortOrder, perPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const awaiting = filteredRows.filter((r) => isPendingLike(r)).length;
  const approved = filteredRows.filter((r) => r.tone === "success").length;
  const rejected = filteredRows.filter((r) => r.tone === "danger").length;

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current || awaiting === 0) return;
    notifiedRef.current = true;
    void sendNativeNotification(
      "Approvals Pending",
      `You have ${awaiting} request${awaiting === 1 ? "" : "s"} awaiting your approval.`,
    );
  }, [awaiting]);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Request No",
      cell: (row: any) => (
        <div>
          <Link
            to={`/requests/approvals/${row.requestId}`}
            className="text-sm font-semibold text-brand-900 transition hover:underline"
          >
            {row.requestNo}
          </Link>
          {row.pendingStep ? (
            <p className="mt-0.5 text-xs text-slate-400">{row.pendingStep}</p>
          ) : null}
        </div>
      )
    },
    {
      header: "Staff",
      cell: (row: any) => row.staff,
      className: "capitalize text-sm text-slate-700"
    },
    {
      header: "Module",
      cell: (row: any) => row.categoryLabel,
      className: "text-sm text-slate-600"
    },
    {
      header: "Team",
      cell: (row: any) => (
        <div>
          <p className="text-sm font-medium text-slate-800 capitalize">
            {row.teamName || "-"}
          </p>
          {row.organizationName ? (
            <p className="mt-0.5 text-xs text-slate-400">{row.organizationName}</p>
          ) : null}
        </div>
      )
    },
    {
      header: "Amount",
      cell: (row: any) => formatCurrency(row.totalAmount, row.currency),
      className: "text-sm text-slate-600"
    },
    {
      header: "Due Date",
      cell: (row: any) => row.dueDate,
      className: "text-sm text-slate-600"
    },
    {
      header: "Status",
      cell: (row: any) => <Chip variant={row.tone}>{row.status.toUpperCase()}</Chip>
    },
    {
      header: "Actions",
      cell: (row: any) => (
        <Link
          to={`/requests/approvals/${row.requestId}`}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-brand-900 transition hover:bg-brand-900/5"
          onClick={(e) => e.stopPropagation()}
        >
          Review
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      ),
      className: "text-right"
    }
  ], []);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="Approvals"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={requestsMobileNav}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[{ label: "Requests" }, { label: "Approvals" }]}
          title="Approvals"
          description="Review and act on requests awaiting your decision."
        />

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Awaiting Review" value={String(awaiting)} tone="pending" />
            <StatCard label="Approved" value={String(approved)} tone="success" />
            <StatCard label="Rejected" value={String(rejected)} tone="danger" />
          </div>

          {/* Filters */}
          <section className="section-card p-4 sm:p-5" aria-label="Approval filters">
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="min-w-[130px] flex-1 lg:flex-none"
              >
                <option value="created_at">Submitted date</option>
                <option value="request_number">Request number</option>
                <option value="total_amount">Total amount</option>
                <option value="status">Status</option>
              </SelectField>
              <SelectField
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="min-w-[110px] flex-1 lg:flex-none"
              >
                <option value="desc">Newest</option>
                <option value="asc">Oldest</option>
              </SelectField>
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="min-w-[120px] flex-1 lg:flex-none"
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </SelectField>
              <SelectField
                label="Request Type"
                value={selectedRequestTypeId}
                onChange={(e) => setSelectedRequestTypeId(e.target.value)}
                className="min-w-[180px] flex-1 lg:flex-none"
              >
                {requestTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </SelectField>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Date</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Search</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Request no, staff, type..."
                  className="rounded-2xl border border-slate-200 px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                />
              </label>
            </div>
          </section>

          {/* Table */}
          <SectionCard
            title="Pending Approvals"
            description="Requests in your approval queue."
            action={
              filteredRows.length > 0 ? (
                <Chip variant="neutral">
                  Showing{" "}
                  {Math.min(filteredRows.length, (safePage - 1) * perPage + 1)}-
                  {Math.min(filteredRows.length, safePage * perPage)} of{" "}
                  {filteredRows.length} request
                  {filteredRows.length === 1 ? "" : "s"}
                </Chip>
              ) : undefined
            }
          >
            <DataTable
              columns={columns}
              data={pagedRows}
              loading={loading}
              error={error}
              caption="Pending Approvals"
              emptyTitle="No approvals pending"
              emptyDescription="There are no requests in your approval queue."
              onRowClick={(row) => navigate(`/requests/approvals/${row.requestId}`)}
              pagination={{
                page: safePage,
                totalPages: totalPages,
                totalCount: filteredRows.length,
                perPage,
                onPageChange: setCurrentPage,
                onPerPageChange: (value) => {
                  setPerPage(value);
                  setCurrentPage(1);
                },
              }}
            />
          </SectionCard>
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
            Staff Portal
          </p>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">Approvals</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Awaiting Review" value={String(awaiting)} tone="pending" />
          <StatCard label="Approved" value={String(approved)} tone="success" />
        </div>

        {loading ? (
          <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading approvals...
          </div>
        ) : (
          <div className="space-y-3">
            {pagedRows.map((row) => (
              <Link
                key={row.id}
                to={`/requests/approvals/${row.requestId}`}
                className="flex w-full items-start justify-between gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-brand-900">{row.requestNo}</p>
                    <Chip variant={row.tone}>{row.status.toUpperCase()}</Chip>
                  </div>
                  <p className="mt-1 text-sm capitalize text-slate-600">{row.staff}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.type}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatCurrency(row.totalAmount, row.currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{row.submitted}</p>
                </div>
                <Icon name="chevron_right" className="mt-1 shrink-0 text-[18px] text-slate-400" />
              </Link>
            ))}
          </div>
        )}

        <section className="section-card grid gap-3 p-3">
          <SelectField
            label="Per Page"
            value={String(perPage)}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="w-full"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </SelectField>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
            >
              Previous
            </button>
            <span className="text-slate-600">Page {safePage} of {totalPages}</span>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default ApprovalsPage;
