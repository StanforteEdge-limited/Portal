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
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  listRequests,
  listRequestTypes,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import {
  buildRequestsNavigation,
  requestsMobileNav,
} from "@/pages/requests/requests-data";

type RequestGroupFilter = "all" | "financial" | "hr";

type UiRequestRow = {
  id: string;
  requestId: string;
  category: RequestGroupFilter;
  type: string;
  requestTypeId: string;
  categoryKey: string;
  totalAmount: number;
  projectId: string;
  projectName: string;
  teamId: string;
  teamName: string;
  organizationId: string;
  organizationName: string;
  purpose: string;
  submitted: string;
  status: string;
  statusKey: string;
  tone: "success" | "warning" | "pending" | "danger" | "neutral";
  icon: string;
  summary: string;
  detail: string;
  createdAtIso?: string;
  startDateIso?: string;
  endDateIso?: string;
  daysRequested?: number;
};

type RequestOption = {
  value: string;
  label: string;
};

type SortBy =
  | "created_at"
  | "request_number"
  | "total_amount"
  | "status"
  | "request_type";

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

function toTone(
  status: string,
): "success" | "warning" | "pending" | "danger" | "neutral" {
  const key = status.toLowerCase();
  if (["approved", "completed", "paid", "disbursed", "confirmed"].includes(key))
    return "success";
  if (["rejected", "cancelled", "voided"].includes(key)) return "danger";
  if (["under_review", "review", "draft", "prepared"].includes(key))
    return "warning";
  if (["pending", "sent", "approval", "submitted"].includes(key))
    return "pending";
  return "neutral";
}

function classifyCategory(
  categoryKey: string,
  requestType: string,
  groupName?: string | null,
): RequestGroupFilter {
  if (groupName) {
    const g = groupName.toLowerCase();
    if (g.includes("leave") || g.includes("hr")) return "hr";
    if (g.includes("finance") || g.includes("payment") || g.includes("procurement") || g.includes("expense")) return "financial";
  }
  const category = categoryKey.toLowerCase();
  const type = requestType.toLowerCase();
  if (category.includes("leave") || type.includes("leave")) return "hr";
  if (
    category.includes("finance") ||
    category.includes("payment") ||
    type.includes("cash") ||
    type.includes("reimbursement") ||
    type.includes("expense") ||
    type.includes("financial")
  ) {
    return "financial";
  }
  return "financial";
}

function toRow(request: RequestRecord, teamsMap?: Map<string, string>) {
  const stateEvents = Array.isArray((request.data as any)?.state_events)
    ? (((request.data as any)?.state_events as Array<
        Record<string, unknown>
      >) ?? [])
    : [];
  const rawStatus = String(request.status || "Pending");
  const returnedForEdit = stateEvents.some((event) => {
    const action = String(event.action || "").toLowerCase();
    const to = String(event.to || "").toLowerCase();
    return action === "return" || to === "returned" || to === "returned_for_edit";
  });
  const normalizedStatus =
    rawStatus.toLowerCase() === "returned" || rawStatus.toLowerCase() === "returned_for_edit"
      ? "returned"
      : rawStatus.toLowerCase() === "draft" && returnedForEdit
        ? "returned"
        : rawStatus.toLowerCase() === "draft" &&
    (stateEvents.some((event) =>
      ["submit", "workflow_start", "workflow_auto_approved"].includes(
        String(event.action || "").toLowerCase(),
      ),
    ) ||
      (request.approvals?.pending?.length ?? 0) > 0 ||
      (request.approvals?.done?.length ?? 0) > 0)
          ? "submitted"
          : rawStatus;
  const requestType = request.request_type?.name || "General Request";
  const itemCount = Array.isArray(request.items) ? request.items.length : 0;
  const amountLabel = formatCurrency(request.total_amount, request.currency);
  const data =
    request.data && typeof request.data === "object" ? request.data : {};
  const projectId = String(data.project_id ?? "").trim();
  const projectName = String(data.project_name ?? "").trim();
  // request.group is the MODULE group (e.g. Finance dept module), NOT the user's team.
  // Team is identified by request.team_id; fall back to data payload for legacy rows.
  const teamId = String(request.team_id ?? data.team_id ?? "").trim();
  const teamName = (teamId && teamsMap?.get(teamId)) ||
    String(data.team_name ?? data.team ?? request.team_name ?? "").trim();
  const organizationId = String(request.organization_id ?? data.organization_id ?? "").trim();
  // Top-level organization object is the authoritative source when populated
  const organizationName = String(
    request.organization?.name ?? data.organization_name ?? data.organization ?? "",
  ).trim();
  const purpose = String(data.purpose ?? "").trim();
  const startDateIso =
    typeof data.start_date === "string" ? data.start_date : undefined;
  const endDateIso =
    typeof data.end_date === "string" ? data.end_date : undefined;
  const parsedDays = Number(data.days_requested ?? 0);
  const daysRequested =
    Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : undefined;

  const category = String(
    request.request_type?.taxonomy_keys?.[0] || "",
  ).toLowerCase();
  const requestCategory = classifyCategory(category, requestType, request.group?.name);
  const icon = category.includes("leave")
    ? "event_note"
    : category.includes("finance")
      ? "payments"
      : category.includes("asset")
        ? "inventory_2"
        : "description";

  return {
    id: request.request_number || `REQ-${request.id}`,
    requestId: String(request.id),
    category: requestCategory,
    type: requestType,
    requestTypeId: String(request.request_type?.id ?? ""),
    categoryKey: category,
    totalAmount: Number(request.total_amount ?? 0),
    projectId,
    projectName,
    teamId,
    teamName,
    organizationId,
    organizationName,
    purpose,
    submitted: formatDate(request.created_at),
    status: normalizedStatus.replaceAll("_", " "),
    statusKey: normalizedStatus.toLowerCase(),
    tone: toTone(normalizedStatus),
    icon,
    summary:
      itemCount > 0
        ? `${itemCount} item${itemCount > 1 ? "s" : ""}`
        : "No line items",
    detail: amountLabel,
    createdAtIso: request.created_at,
    startDateIso,
    endDateIso,
    daysRequested,
  };
}

function isPendingLike(row: UiRequestRow) {
  return (
    row.tone === "pending" ||
    row.tone === "warning" ||
    [
      "pending",
      "submitted",
      "approval",
      "under_review",
      "review",
      "draft",
      "prepared",
    ].some((key) => row.statusKey.includes(key))
  );
}

function isCompletedLike(row: UiRequestRow) {
  return (
    row.tone === "success" ||
    ["approved", "completed", "paid", "disbursed", "confirmed"].some((key) =>
      row.statusKey.includes(key),
    )
  );
}

function dateOnlyKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLeaveDateRange(row: UiRequestRow) {
  const start = row.startDateIso ? formatDate(row.startDateIso) : "-";
  const end = row.endDateIso ? formatDate(row.endDateIso) : "-";
  if (start === "-" && end === "-") return "-";
  return `${start} - ${end}`;
}

function formatLeaveDuration(row: UiRequestRow) {
  if (row.daysRequested && row.daysRequested > 0) {
    return `${row.daysRequested} day${row.daysRequested === 1 ? "" : "s"}`;
  }
  if (row.startDateIso && row.endDateIso) {
    const start = new Date(row.startDateIso);
    const end = new Date(row.endDateIso);
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end >= start
    ) {
      const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      return `${days} day${days === 1 ? "" : "s"}`;
    }
  }
  return "-";
}

function ListFilters({
  activeCategory,
  status,
  statusOptions,
  onStatusChange,
  requestTypes,
  selectedRequestTypeId,
  onRequestTypeChange,
  filterDate,
  onFilterDateChange,
  moreFiltersOpen,
  onToggleMoreFilters,
  search,
  onSearchChange,
  projectOptions,
  selectedProject,
  onProjectChange,
  teamOptions,
  selectedTeam,
  onTeamChange,
  organizationOptions,
  selectedOrganization,
  onOrganizationChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: {
  activeCategory: RequestGroupFilter;
  status: string;
  statusOptions: RequestOption[];
  onStatusChange: (status: string) => void;
  requestTypes: RequestOption[];
  selectedRequestTypeId: string;
  onRequestTypeChange: (value: string) => void;
  filterDate: string;
  onFilterDateChange: (value: string) => void;
  moreFiltersOpen: boolean;
  onToggleMoreFilters: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  projectOptions: RequestOption[];
  selectedProject: string;
  onProjectChange: (value: string) => void;
  teamOptions: RequestOption[];
  selectedTeam: string;
  onTeamChange: (value: string) => void;
  organizationOptions: RequestOption[];
  selectedOrganization: string;
  onOrganizationChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
}) {
  const requestTypeLabel =
    activeCategory === "financial"
      ? "Financial Type"
      : activeCategory === "hr"
        ? "Leave Type"
        : "Request Subtype";
  const searchPlaceholder =
    activeCategory === "hr"
      ? "Request no, leave type, reason"
      : activeCategory === "financial"
        ? "Request no, financial type, purpose"
        : "Request no, subtype, purpose";

  return (
    <section className="section-card p-4 sm:p-5" aria-label="Request filters">
      <div className="flex flex-wrap items-start gap-3">
        <SelectField
          label="Sort By"
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value as SortBy)}
          className="min-w-[130px] flex-1 lg:flex-none"
        >
          <option value="created_at">Created date</option>
          <option value="due_date">Due date</option>
          <option value="request_number">Request number</option>
          <option value="total_amount">Total amount</option>
          <option value="status">Status</option>
          <option value="request_type">Request type</option>
        </SelectField>
        <SelectField
          label="Order"
          value={sortOrder}
          onChange={(event) =>
            onSortOrderChange(event.target.value as "asc" | "desc")
          }
          className="min-w-[110px] flex-1 lg:flex-none"
        >
          <option value="desc">Newest</option>
          <option value="asc">Oldest</option>
        </SelectField>
        <SelectField
          label="Status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="min-w-[120px] flex-1 lg:flex-none"
        >
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={requestTypeLabel}
          value={selectedRequestTypeId}
          onChange={(event) => onRequestTypeChange(event.target.value)}
          className="min-w-[200px] flex-1 lg:flex-none"
        >
          {requestTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-slate-700">Date</span>
          <input
            type="date"
            value={filterDate}
            onChange={(event) => onFilterDateChange(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
          />
        </label>

        <button
          type="button"
          onClick={onToggleMoreFilters}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
        >
          <Icon name="tune" className="text-[18px] text-slate-400" />
          More Filters
        </button>
      </div>

      {moreFiltersOpen ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
            />
          </label>

          {activeCategory !== "hr" ? (
            <SelectField
              label="Project"
              value={selectedProject}
              onChange={(event) => onProjectChange(event.target.value)}
              className="min-w-0"
            >
              {projectOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          ) : null}

          {activeCategory === "financial" ? (
            <SelectField
              label="Team"
              value={selectedTeam}
              onChange={(event) => onTeamChange(event.target.value)}
              className="min-w-0"
            >
              {teamOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          ) : null}

          <SelectField
            label="Organization"
            value={selectedOrganization}
            onChange={(event) => onOrganizationChange(event.target.value)}
            className="min-w-0"
          >
            {organizationOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}
    </section>
  );
}

function RequestsListTable({
  activeCategory,
  rows,
  loading,
  error,
  onRetry,
  currentPage,
  totalPages,
  totalCount,
  perPage,
  onPerPageChange,
  onPageChange,
  isMultiTeam,
}: {
  activeCategory: RequestGroupFilter;
  rows: UiRequestRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
  isMultiTeam: boolean;
}) {
  const navigate = useNavigate();
  const columns: ColumnDef<UiRequestRow>[] = useMemo(() => {
    const cols: ColumnDef<UiRequestRow>[] = [
      {
        header: "Request ID",
        cell: (row) => (
          <div>
            <Link
              to={`/requests/${row.requestId}`}
              className="text-sm font-semibold text-brand-900 transition hover:underline"
            >
              {row.id}
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Icon name={row.icon} className="text-[16px]" />
              <span>{row.type}</span>
            </div>
          </div>
        )
      },
      {
        header: "Total",
        cell: (row) => row.category === "hr"
          ? formatLeaveDuration(row)
          : row.totalAmount > 0
            ? row.detail
            : "-",
        className: "text-sm text-slate-700 font-medium"
      }
    ];

    if (isMultiTeam) {
      cols.push({
        header: "Team",
        cell: (row) => (
          <div>
            <p className="text-sm font-medium text-slate-800 capitalize">
              {row.teamName || "-"}
            </p>
            {row.organizationName ? (
              <p className="mt-0.5 text-xs text-slate-400">
                {row.organizationName}
              </p>
            ) : null}
          </div>
        )
      });
    }

    if (activeCategory === "financial") {
      cols.push({
        header: "Project",
        cell: (row) => row.projectName || "-",
        className: "text-sm text-slate-600"
      });
    }

    if (activeCategory === "hr") {
      cols.push({
        header: "Leave Dates",
        cell: (row) => formatLeaveDateRange(row),
        className: "text-sm text-slate-600"
      });
    }

    cols.push(
      {
        header: "Submitted",
        cell: (row) => row.submitted,
        className: "text-sm text-slate-600"
      },
      {
        header: "Status",
        cell: (row) => <Chip variant={row.tone}>{row.status.toUpperCase()}</Chip>
      },
      {
        header: "Action",
        cell: (row) => row.statusKey === "draft" || row.statusKey === "returned" ? (
          <Link
            to={`${row.category === "hr" ? "/leave/new/form" : "/requests/new/form"}?edit=${row.requestId}&typeId=${row.requestTypeId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="edit" className="text-[14px]" />
            Edit
          </Link>
        ) : (
          <Link
            to={`/requests/${row.requestId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View
          </Link>
        ),
        className: "text-right"
      }
    );

    return cols;
  }, [activeCategory, isMultiTeam]);

  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const pageEnd =
    totalCount === 0 ? 0 : Math.min(totalCount, currentPage * perPage);
  return (
    <SectionCard
      title={
        activeCategory === "hr"
          ? "Leave Requests"
          : activeCategory === "financial"
            ? "Financial Requests"
            : "All Requests"
      }
      description="Track and manage your operational submissions."
      action={
        <Chip variant="neutral">
          Showing {pageStart}-{pageEnd} of {totalCount} request
          {totalCount === 1 ? "" : "s"}
        </Chip>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        caption="Requests list"
        emptyTitle="No requests found"
        emptyDescription="Try adjusting your filters or search query."
        onRowClick={(row) => navigate(`/requests/${row.requestId}`)}
        pagination={{
          page: currentPage,
          totalPages: totalPages,
          totalCount: totalCount,
          perPage: perPage,
          onPageChange: onPageChange,
          onPerPageChange: onPerPageChange,
        }}
      />
    </SectionCard>
  );
}

function RequestsMobileList({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: UiRequestRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">
        Loading requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[22px] border border-danger/20 bg-danger/10 px-4 py-5 text-sm text-danger">
        {error}
        <button
          className="ml-2 font-semibold underline"
          type="button"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Link
          key={row.id}
          to={`/requests/${row.requestId}`}
          className="flex w-full items-start justify-between gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
        >
          <div className="flex min-w-0 gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-brand-900">
              <Icon name={row.icon} className="text-[20px]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">
                  {row.type}
                </p>
                <Chip variant={row.tone}>{row.status.toUpperCase()}</Chip>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {row.category === "hr"
                  ? formatLeaveDuration(row)
                  : row.totalAmount > 0
                    ? row.detail
                    : row.summary}
              </p>
              <p className="mt-1 text-xs text-slate-500">{row.submitted}</p>
            </div>
          </div>
          <Icon
            name="chevron_right"
            className="mt-1 text-[18px] text-slate-400"
          />
        </Link>
      ))}
    </div>
  );
}

export function RequestsListPage() {
  const { user } = useAuth();
  const { data: profile } = useCachedQuery(
    "requests:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [selectedRequestTypeId, setSelectedRequestTypeId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const categoryParam = searchParams.get("category");
  const activeCategory: RequestGroupFilter =
    categoryParam === "financial" || categoryParam === "hr" || categoryParam === "all"
      ? categoryParam
      : "all";

  const organizations = useMemo(
    () =>
      Array.isArray(user?.organizations)
        ? user.organizations.filter((entry) => entry.id)
        : [],
    [user?.organizations],
  );

  const isMultiTeam = (profile?.teams?.length ?? 0) > 1;

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

  const apiRows = useMemo(() => {
    const source = Array.isArray(requestsData) ? requestsData : [];
    return source.map((r) => toRow(r, teamsMap));
  }, [requestsData, teamsMap]);

  const allRows: UiRequestRow[] = requestsError ? [] : apiRows;

  const requestTypeOptions = useMemo(() => {
    const apiTypeOptions = Array.isArray(requestTypes)
      ? requestTypes
          .filter((item) => item?.id && item?.name)
          .map((item) => ({
            value: String(item.id),
            label: String(item.name),
            category: classifyCategory(
              String(item.taxonomy_keys?.[0] || "").toLowerCase(),
              String(item.name),
            ),
          }))
      : [];

    if (apiTypeOptions.length > 0) {
      return [
        {
          value: "all",
          label:
            activeCategory === "financial"
              ? "All financial types"
              : activeCategory === "hr"
                ? "All leave types"
                : "All request subtypes",
        },
        ...apiTypeOptions
          .filter(
            (item) => activeCategory === "all" || item.category === activeCategory,
          )
          .map(({ value, label }) => ({ value, label })),
      ];
    }

    const inferred = new Map<string, string>();
    allRows.forEach((row) => {
      if (
        row.requestTypeId &&
        row.type &&
        (activeCategory === "all" || row.category === activeCategory)
      ) {
        inferred.set(row.requestTypeId, row.type);
      }
    });
    return [
      {
        value: "all",
        label:
          activeCategory === "financial"
            ? "All financial types"
            : activeCategory === "hr"
              ? "All leave types"
              : "All request subtypes",
      },
      ...Array.from(inferred.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [activeCategory, allRows, requestTypes]);

  const statusOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        allRows
          .filter(
            (row) => activeCategory === "all" || row.category === activeCategory,
          )
          .map((row) => row.statusKey)
          .filter(Boolean),
      ),
    );
    return [
      { value: "", label: "All statuses" },
      ...values.map((value) => ({ value, label: toTitleCase(value) })),
    ];
  }, [activeCategory, allRows]);

  const projectOptions = useMemo(() => {
    const values = new Map<string, string>();
    allRows.forEach((row) => {
      if (row.projectId || row.projectName) {
        values.set(
          row.projectId || row.projectName,
          row.projectName || row.projectId,
        );
      }
    });
    return [
      { value: "", label: "All projects" },
      ...Array.from(values.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [allRows]);

  const teamOptions = useMemo(() => {
    const values = new Map<string, string>();
    allRows.forEach((row) => {
      if (row.teamId || row.teamName) {
        values.set(row.teamId || row.teamName, row.teamName || row.teamId);
      }
    });
    return [
      { value: "", label: "All teams" },
      ...Array.from(values.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [allRows]);

  const organizationOptions = useMemo(() => {
    const values = new Map<string, string>();
    organizations.forEach((organization) => {
      values.set(organization.id, organization.name);
    });
    allRows.forEach((row) => {
      if (row.organizationId || row.organizationName) {
        values.set(
          row.organizationId || row.organizationName,
          row.organizationName || row.organizationId,
        );
      }
    });
    return [
      { value: "", label: "All organizations" },
      ...Array.from(values.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [allRows, organizations]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (activeCategory !== "all" && row.category !== activeCategory) return false;
      if (status && row.statusKey !== status) return false;
      if (selectedRequestTypeId !== "all" && row.requestTypeId !== selectedRequestTypeId) return false;
      if (filterDate) {
        const createdKey = dateOnlyKey(row.createdAtIso);
        if (!createdKey || createdKey !== filterDate) return false;
      }
      if (search.trim()) {
        const haystack = [row.id, row.type, row.projectName, row.teamName, row.organizationName, row.purpose]
          .join(" ").toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      if (activeCategory !== "hr" && selectedProject && row.projectId !== selectedProject && row.projectName !== selectedProject) return false;
      if (activeCategory === "financial" && selectedTeam && row.teamId !== selectedTeam && row.teamName !== selectedTeam) return false;
      if (selectedOrganization && row.organizationId !== selectedOrganization && row.organizationName !== selectedOrganization) return false;
      return true;
    });
  }, [allRows, filterDate, activeCategory, search, selectedOrganization, selectedProject, selectedRequestTypeId, selectedTeam, status]);

  const sortedRows = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...filteredRows].sort((first, second) => {
      if (sortBy === "created_at") {
        return (
          (new Date(first.createdAtIso || 0).getTime() -
            new Date(second.createdAtIso || 0).getTime() || 0) * direction
        );
      }
      if (sortBy === "request_number") {
        return (
          first.id.localeCompare(second.id, undefined, { numeric: true }) *
          direction
        );
      }
      if (sortBy === "total_amount") {
        return (first.totalAmount - second.totalAmount) * direction;
      }
      if (sortBy === "status") {
        return first.status.localeCompare(second.status) * direction;
      }
      return first.type.localeCompare(second.type) * direction;
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
  }, [status, selectedRequestTypeId, filterDate, activeCategory, search, selectedProject, selectedTeam, selectedOrganization, sortBy, sortOrder, perPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(
    () => [
      {
        label: "Total Requests",
        value: String(filteredRows.length),
        tone: "neutral" as const,
      },
      {
        label: "Pending Action",
        value: String(filteredRows.filter((row) => isPendingLike(row)).length),
        tone: "pending" as const,
      },
      {
        label: "Completed",
        value: String(
          filteredRows.filter((row) => isCompletedLike(row)).length,
        ),
        tone: "success" as const,
      },
    ],
    [filteredRows],
  );

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="My Requests"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={requestsMobileNav}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[{ label: "Requests" }, { label: "My Requests" }]}
          title="My Requests"
          description="Track and manage your operational submissions."
          actions={
            <Link to="/requests/new" className="inline-flex">
              <Button className="gap-2">
                <Icon name="add" className="text-[18px]" />
                New Request
              </Button>
            </Link>
          }
        />

        <nav className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-500">
          {[
            { key: "all" as const, label: "All" },
            { key: "financial" as const, label: "Financial" },
            { key: "hr" as const, label: "HR" },
            { key: "other" as const, label: "Other" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("category", tab.key);
                setSearchParams(next);
              }}
              className={[
                "rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                activeCategory === tab.key
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
            ))}
          </div>

          <ListFilters
            activeCategory={activeCategory}
            status={status}
            statusOptions={statusOptions}
            onStatusChange={setStatus}
            requestTypes={requestTypeOptions}
            selectedRequestTypeId={selectedRequestTypeId}
            onRequestTypeChange={setSelectedRequestTypeId}
            filterDate={filterDate}
            onFilterDateChange={setFilterDate}
            moreFiltersOpen={moreFiltersOpen}
            onToggleMoreFilters={() => setMoreFiltersOpen((v) => !v)}
            search={search}
            onSearchChange={setSearch}
            projectOptions={projectOptions}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            teamOptions={teamOptions}
            selectedTeam={selectedTeam}
            onTeamChange={setSelectedTeam}
            organizationOptions={organizationOptions}
            selectedOrganization={selectedOrganization}
            onOrganizationChange={setSelectedOrganization}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />

          <RequestsListTable
            activeCategory={activeCategory}
            rows={requestsError ? [] : pagedRows}
            loading={loadingRequests}
            error={requestsError}
            currentPage={safePage}
            totalPages={totalPages}
            totalCount={filteredRows.length}
            perPage={perPage}
            onPerPageChange={setPerPage}
            onPageChange={setCurrentPage}
            onRetry={() => { void refetchRequests(); }}
            isMultiTeam={isMultiTeam}
          />
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
            Staff Portal
          </p>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
            My Requests
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Active"
            value={String(filteredRows.filter((row) => row.tone === "pending" || row.tone === "warning").length)}
            tone="neutral"
          />
          <StatCard
            label="Approved"
            value={String(filteredRows.filter((row) => row.tone === "success").length)}
            tone="success"
          />
        </div>

        <section className="section-card p-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "All" },
              { key: "financial" as const, label: "Financial" },
              { key: "hr" as const, label: "HR" },
              { key: "other" as const, label: "Other" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("category", item.key);
                  setSearchParams(next);
                }}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  activeCategory === item.key ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <RequestsMobileList
          rows={pagedRows}
          loading={loadingRequests}
          error={requestsError}
          onRetry={() => { void refetchRequests(); }}
        />

        <section className="section-card grid gap-3 p-3">
          <SelectField
            label="Per Page"
            value={String(perPage)}
            onChange={(event) => setPerPage(Number(event.target.value))}
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

export default RequestsListPage;
