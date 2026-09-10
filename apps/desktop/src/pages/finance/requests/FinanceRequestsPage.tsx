import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  PaginationControls,
  PageHeader,
  SelectField,
  SectionCard,
  StatCard,
  TextField,
  DataTable,
  ColumnDef,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";
import { formatDisplayDate } from "@stanforte/shared";
import {
  formatPersonName,
  formatRequestStatus,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import type { RequestRecord } from "@/pages/requests/requests-api";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { financeApi, useCachedQuery } from "@/shared/lib/core";

function toTitleCase(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function requestTotal(entry: any) {
  const raw = Number(entry?.request_total_amount ?? entry?.total_amount ?? 0);
  if (raw > 0) return raw;
  if (!Array.isArray(entry?.items)) return 0;
  return entry.items.reduce(
    (sum: number, item: any) =>
      sum + Number(item?.amount ?? 0) * Number(item?.quantity ?? 1),
    0,
  );
}


function resolveFinanceStatus(entry: RequestRecord) {
  const source = entry as unknown as { request_status?: string };
  return String(source.request_status || entry.status || "").toLowerCase();
}

function isLeaveRequest(entry: RequestRecord) {
  const typeName = String(entry.request_type?.name || "").toLowerCase();
  const categoryKey = String(entry.request_type?.taxonomy_keys?.[0] || "").toLowerCase();
  const schemaLeaveTypeKey = String(
    (entry.request_type?.form_schema as Record<string, unknown> | null)?.leave_type_key || "",
  )
    .trim()
    .toLowerCase();
  return (
    typeName.includes("leave") ||
    categoryKey.includes("leave") ||
    schemaLeaveTypeKey.length > 0
  );
}

function financeActionLabel(status: string) {
  if (status === "cleared") return "Disburse";
  if (status === "disbursed") return "Disburse +";
  if (status === "confirmed") return "Review";
  if (status === "retired") return "Complete";
  if (status === "completed") return "View";
  return "Open";
}

type SortBy =
  | "created_at"
  | "request_number"
  | "total_amount"
  | "status"
  | "request_type";
type SortDir = "asc" | "desc";
export default function FinanceRequestsPage() {
  const { user } = useAuth();
  const { data: profile } = useCachedQuery(
    "finance-admin:profile",
    () => getWorkspaceProfile(),
    {
      ttlMs: 1000 * 60,
      storage: "memory",
    },
  );
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "approval"
    | "cleared"
    | "disbursed"
    | "confirmed"
    | "retired"
    | "completed"
  >("all");
  const [staffFilter, setStaffFilter] = useState("");
  const [dueDateFromFilter, setDueDateFromFilter] = useState("");
  const [dueDateToFilter, setDueDateToFilter] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedOrganization, setSelectedOrganization] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const isRequestsView = true;

  async function handleExport() {
    setExporting(true);
    try {
      const file = await financeApi.exportRequests(financeRequestQuery);
      if (file && file.content_base64 && file.file_name) {
        const link = document.createElement("a");
        link.href = `data:${file.mime_type};base64,${file.content_base64}`;
        link.download = file.file_name;
        link.click();
      }
    } catch (err: any) {
      console.error("Export failed", err);
      alert(err?.message || "Failed to export requests");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    staffFilter,
    dueDateFromFilter,
    dueDateToFilter,
    selectedProject,
    selectedGroup,
    selectedOrganization,
    sortBy,
    sortDir,
    perPage,
  ]);

  const financeRequestQuery = useMemo(
    () => ({
      page,
      per_page: perPage,
      order_by: sortBy,
      order_dir: sortDir,
      status: statusFilter !== "all" ? statusFilter : undefined,
      q: staffFilter.trim() || undefined,
      due_date_from: dueDateFromFilter || undefined,
      due_date_to: dueDateToFilter || undefined,
      project: selectedProject !== "all" ? selectedProject : undefined,
      group: selectedGroup !== "all" ? selectedGroup : undefined,
      organization:
        selectedOrganization !== "all" ? selectedOrganization : undefined,
    }),
    [
      page,
      perPage,
      sortBy,
      sortDir,
      statusFilter,
      staffFilter,
      dueDateFromFilter,
      dueDateToFilter,
      selectedProject,
      selectedGroup,
      selectedOrganization,
    ],
  );

  const {
    data: financeRequestsPayload,
    loading,
    error,
  } = useCachedQuery(
    `finance-admin:requests:${JSON.stringify(financeRequestQuery)}`,
    () => financeApi.listRequestsPaged(financeRequestQuery),
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    },
  );

  const queueData = Array.isArray(financeRequestsPayload?.result)
    ? (financeRequestsPayload.result as RequestRecord[])
    : Array.isArray(financeRequestsPayload)
      ? (financeRequestsPayload as RequestRecord[])
      : [];
  const queue: RequestRecord[] = queueData.filter((entry) => !isLeaveRequest(entry));
  const total = Number(financeRequestsPayload?.total ?? 0);
  const lastPage = Math.max(1, Number(financeRequestsPayload?.pages ?? 1));
  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";
  const statsQueue = queue;
  const cleared = statsQueue.filter(
    (entry: RequestRecord) => resolveFinanceStatus(entry) === "cleared",
  ).length;
  const disbursed = statsQueue.filter(
    (entry: RequestRecord) => resolveFinanceStatus(entry) === "disbursed",
  ).length;
  const confirmed = statsQueue.filter(
    (entry: RequestRecord) => resolveFinanceStatus(entry) === "confirmed",
  ).length;
  const completed = statsQueue.filter((entry: RequestRecord) =>
    ["retired", "completed", "confirmed"].includes(resolveFinanceStatus(entry)),
  ).length;
  const awaitingRetirement = statsQueue.filter((entry: RequestRecord) =>
    ["disbursed", "confirmed"].includes(resolveFinanceStatus(entry)),
  ).length;
  const projectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          statsQueue
            .map((entry) => {
              const data =
                entry?.data && typeof entry.data === "object" ? entry.data : {};
              return String((data as any).project_name || "").trim();
            })
            .filter(Boolean),
        ),
      ),
    [statsQueue],
  );
  const groupOptions = useMemo(
    () =>
      Array.from(
        new Set(
          statsQueue
            .map((entry) => {
              const data =
                entry?.data && typeof entry.data === "object" ? entry.data : {};
              const payload = entry as unknown as {
                group_name?: string;
                group?: { name?: string };
              };
              return String(
                (data as any).team_name ||
                (data as any).team ||
                payload.group_name ||
                payload.group?.name ||
                "",
              ).trim();
            })
            .filter(Boolean),
        ),
      ),
    [statsQueue],
  );
  const organizationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          statsQueue
            .map((entry) => {
              const data =
                entry?.data && typeof entry.data === "object" ? entry.data : {};
              return String((data as any).organization_name || "").trim();
            })
            .filter(Boolean),
        ),
      ),
    [statsQueue],
  );
  const queueRows = isRequestsView ? queue : queue.slice(0, 8);
  const requestRangeStart = total > 0 ? (page - 1) * perPage + 1 : 0;
  const requestRangeEnd = total > 0 ? requestRangeStart + queueRows.length - 1 : 0;

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Request No",
      cell: (entry: any) => (
        <Link
          to={`/finance/requests/${entry.id}`}
          className="text-sm font-semibold text-brand-900 transition hover:underline"
        >
          {entry.request_number || entry.id}
        </Link>
      )
    },
    {
      header: "Team",
      cell: (entry: any) => entry.team_name || "-",
      className: "text-sm text-slate-700"
    },
    {
      header: "Staff",
      cell: (entry: any) => formatPersonName(entry.creator),
      className: "capitalize text-sm text-slate-700"
    },
    {
      header: "Due Date",
      cell: (entry: any) => formatDisplayDate(
        String(
          (
            (entry.data as Record<
              string,
              unknown
            > | null) || {}
          )?.due_date || "",
        ),
      ),
      className: "text-sm text-slate-700"
    },
    {
      header: "Total",
      cell: (entry: any) => formatCurrency(
        requestTotal(entry),
        entry.currency || "NGN",
      ),
      className: "text-sm text-slate-700"
    },
    {
      header: "Status",
      cell: (entry: any) => {
        const effectiveStatus = resolveFinanceStatus(entry);
        return (
          <Chip
            variant={requestStatusTone(effectiveStatus)}
          >
            {toTitleCase(
              formatRequestStatus(effectiveStatus),
            )}
          </Chip>
        );
      }
    },
    {
      header: "Action",
      cell: (entry: any) => {
        const effectiveStatus = resolveFinanceStatus(entry);
        const showVouchers = [
          "disbursed",
          "confirmed",
          "retired",
          "completed",
        ].includes(effectiveStatus);
        return (
          <div className="inline-flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Link
              to={`/finance/requests/${entry.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 transition hover:underline"
            >
              <Icon
                name="arrow_forward"
                className="text-[16px]"
              />
              {financeActionLabel(effectiveStatus)}
            </Link>
            {showVouchers ? (
              <Link
                to="/finance/payment-vouchers"
                className="text-sm hidden font-semibold text-slate-600 transition hover:underline"
              >
                Vouchers
              </Link>
            ) : null}
          </div>
        );
      },
      className: "text-right"
    }
  ], []);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-requests"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", path: "/" },
          { label: "Finance", path: "/finance" },
          ...(isRequestsView ? [{ label: "Requests" }] : []),
        ]}
        title={isRequestsView ? "Finance Requests" : "Finance Admin"}
        description={
          isRequestsView
            ? "Manage the finance request queue from cleared approval through disbursement, confirmation, retirement, and completion."
            : "Monitor the live finance workflow and move cleared requests through payout and closure."
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Finance Queue"
            value={String(total)}
            tone="neutral"
            icon="folder_open"
          />
          <StatCard
            label="Ready To Disburse"
            value={String(cleared)}
            tone="warning"
            icon="payments"
          />
          <StatCard
            label="Awaiting Retirement"
            value={String(awaitingRetirement)}
            tone="pending"
            icon="receipt_long"
          />
          <StatCard
            label="Completed"
            value={String(completed)}
            tone="success"
            icon="task_alt"
          />
        </div>

        <SectionCard
          title={
            isRequestsView ? "Finance Request Queue" : "Priority Finance Queue"
          }
          description={
            isRequestsView
              ? "Use this queue to process requests through disbursement, receipt confirmation, retirement review, and completion."
              : "Start with the requests that are ready for finance action right now."
          }
          action={
            !isRequestsView ? (
              <Link
                to="/finance/requests"
                className="text-sm font-semibold text-brand-900 transition hover:underline"
              >
                View full queue
              </Link>
            ) : total > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(total, (page - 1) * perPage + 1)}-
                {Math.min(total, page * perPage)} of {total} request
                {total === 1 ? "" : "s"}
              </Chip>
            ) : undefined
          }
        >
          <div className="mb-4 flex flex-wrap items-start gap-3 justify-start">
            <SelectField
              label="Sort By"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="min-w-[140px] flex-1 lg:flex-none"
            >
              <option value="created_at">Date Created</option>
              <option value="request_number">Request No</option>
              <option value="request_type">Request Type</option>
              <option value="status">Status</option>
              <option value="total_amount">Total Amount</option>
            </SelectField>
            <SelectField
              label="Order"
              value={sortDir}
              onChange={(event) => setSortDir(event.target.value as SortDir)}
              className="min-w-[110px] flex-1 lg:flex-none"
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </SelectField>
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="min-w-[130px] flex-1 lg:flex-none"
            >
              <option value="all">All statuses</option>
              <option value="approval">Approval</option>
              <option value="cleared">Cleared</option>
              <option value="disbursed">Disbursed</option>
              <option value="confirmed">Confirmed</option>
              <option value="retired">Retired</option>
              <option value="completed">Completed</option>
            </SelectField>
            <TextField
              label="Due Date From"
              type="date"
              value={dueDateFromFilter}
              onChange={(event) => setDueDateFromFilter(event.target.value)}
            />
            <TextField
              label="Due Date To"
              type="date"
              value={dueDateToFilter}
              onChange={(event) => setDueDateToFilter(event.target.value)}
            />
            <TextField
              label="Staff"
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
              placeholder="Search by staff or request no"
            />
            <div className="flex justify-end  h-stretch flex-col self-stretch">
              <label className="block">
      <span className="field-label">More</span>
    </label>
              <Button
                type="button"
                variant="secondary"
                className="w-auto lg:w-auto"
                onClick={() => setMoreFiltersOpen((current) => !current)}
              >
                {moreFiltersOpen ? " - " : " + "}
              </Button>
            </div>
            <div className="flex justify-end h-stretch flex-col self-stretch gap-2 lg:flex-row lg:items-end">
              <label className="block lg:hidden">
                <span className="field-label">&nbsp;</span>
              </label>
              <Button
                type="button"
                variant="secondary"
                className="w-full lg:w-auto"
                onClick={() => void handleExport()}
                disabled={exporting || total === 0}
              >
                {exporting ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>

          {moreFiltersOpen ? (
            <div className="mb-4 flex flex-wrap gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <SelectField
                label="Project"
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="min-w-[180px] flex-1 lg:flex-none"
              >
                <option value="all">All projects</option>
                {projectOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Group"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                className="min-w-[220px] flex-1 lg:flex-none"
              >
                <option value="all">All groups</option>
                {groupOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Organization"
                value={selectedOrganization}
                onChange={(event) =>
                  setSelectedOrganization(event.target.value)
                }
                className="min-w-[220px] flex-1 lg:flex-none"
              >
                <option value="all">All organizations</option>
                {organizationOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : null}

        <DataTable
          columns={columns}
          data={queueRows}
          loading={loading}
          error={error}
          caption="Finance requests"
          emptyTitle="No finance requests yet"
          emptyDescription="Once cleared requests reach finance, they'll appear here for disbursement and voucher handling."
          pagination={
            isRequestsView ? {
              page,
              totalPages: lastPage,
              totalCount: total,
              perPage,
              onPageChange: setPage,
              onPerPageChange: setPerPage,
            } : undefined
          }
        />
        </SectionCard>

        {!isRequestsView ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Workflow Coverage"
              description="The shared request details page now follows the full finance lifecycle for finance viewers."
            >
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                {[
                  "Cleared",
                  "Disbursed",
                  "Confirmed",
                  "Retired",
                  "Completed",
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Step
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <section className="section-card bg-brand-900 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
                    Finance Tools
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">
                    Payment voucher workspace
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    Review disbursements, monitor retirements, and confirm
                    voucher closure from one place.
                  </p>
                </div>
                <Icon name="payments" className="text-[26px] text-white/70" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/finance/payment-vouchers" className="inline-flex">
                  <Button className="bg-white text-brand-900 hover:bg-slate-100">
                    Open Vouchers
                  </Button>
                </Link>
                <Link to="/finance/requests" className="inline-flex">
                  <Button
                    variant="secondary"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                  >
                    Review Queue
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
