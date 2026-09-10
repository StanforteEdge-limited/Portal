import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/shared";
import { roleLabel, userDisplayName } from "@stanforte/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import {
  getMyLeaveBalance,
  listRequests,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { formatDisplayDate } from "@stanforte/shared";
import {
  requestCategoryFromRecord,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";

type LeaveRow = {
  id: string;
  requestId: string;
  type: string;
  submittedOn: string;
  fromDate: string;
  toDate: string;
  durationLabel: string;
  status: string;
  tone: "success" | "warning" | "pending" | "danger" | "neutral";
};

function isPendingStatus(status?: string | null) {
  const key = String(status || "").toLowerCase();
  return [
    "pending",
    "submitted",
    "approval",
    "under_review",
    "review",
    "draft",
    "prepared",
  ].includes(key);
}

function toLeaveRow(record: RequestRecord): LeaveRow {
  const data = record.data && typeof record.data === "object" ? record.data : {};
  const startDate = String(data.start_date || "");
  const endDate = String(data.end_date || "");
  const daysRequested = Number(data.days_requested);
  const requestId = String(record.id || "");

  return {
    id: String(record.request_number || `REQ-${requestId}`),
    requestId,
    type: String(record.request_type?.name || "Leave Request"),
    submittedOn: formatDisplayDate(record.created_at),
    fromDate: formatDisplayDate(startDate),
    toDate: formatDisplayDate(endDate),
    durationLabel:
      Number.isFinite(daysRequested) && daysRequested > 0
        ? `${daysRequested} day${daysRequested === 1 ? "" : "s"}`
        : "-",
    status: String(record.status || "draft").replaceAll("_", " "),
    tone: requestStatusTone(record.status),
  };
}

export default function LeavePage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const {
    data: leaveBalanceData,
    loading: loadingLeaveBalance,
    error: leaveBalanceError,
  } = useCachedQuery(
    `requests:leave-balance:${currentYear}`,
    () => getMyLeaveBalance({ year: currentYear }),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const {
    data: allRequests,
    loading: loadingRequests,
    error: requestsError,
  } = useCachedQuery(
    "requests:list:mine:leave-page",
    () => listRequests({ only_mine: "true" }),
    { ttlMs: 1000 * 60 * 2, storage: "memory" },
  );

  const leaveRequests = (allRequests ?? []).filter(
    (record) => requestCategoryFromRecord(record) === "leave",
  );
  const leaveRows = leaveRequests.map(toLeaveRow);
  const recentRows = leaveRows.slice(0, 8);

  const approvedCount = leaveRows.filter((row) => row.tone === "success").length;
  const pendingCount = leaveRequests.filter((row) =>
    isPendingStatus(row.status),
  ).length;

  const leaveSummary = leaveBalanceData?.summary ?? [];
  const availableDays = leaveSummary.reduce(
    (sum, item) => sum + Number(item.available_days || 0),
    0,
  );
  const entitledDays = leaveSummary.reduce(
    (sum, item) => sum + Number(item.entitled_days || 0),
    0,
  );
  const usedDays = Math.max(entitledDays - availableDays, 0);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="Leave"
      user={{
        name: userDisplayName(user),
        role: roleLabel(user?.roles?.[0] || "staff"),
      }}
      mobileNav={buildAppMobileNav("Profile")}
    >
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Home", path: "/" }, { label: "Leave" }]}
          title="Leave Tracker"
          description="Track leave balances, submit leave requests, and follow approval progress in one place."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/requests/new">
                <Button className="gap-2">
                  <Icon name="add_circle" className="text-[18px]" />
                  New Leave Request
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available Days"
            value={loadingLeaveBalance ? "..." : String(availableDays)}
            tone="success"
          />
          <StatCard
            label="Used Days"
            value={loadingLeaveBalance ? "..." : String(usedDays)}
            tone="warning"
          />
          <StatCard
            label="Pending Requests"
            value={loadingRequests ? "..." : String(pendingCount)}
            tone="pending"
          />
          <StatCard
            label="Approved Requests"
            value={loadingRequests ? "..." : String(approvedCount)}
            tone="neutral"
          />
        </div>

        <SectionCard
          title="Policy Snapshot"
          description="Quick checks before you submit leave."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Notice Window
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Request leave early
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Leave type rules in the form enforce minimum notice days.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Handover
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Required for submission
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Include colleague coverage and notes before submitting.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Leave Year
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {currentYear}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Balance summary is grouped by leave type for this year.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Leave Requests"
          description="Your latest leave submissions and current approval status."
          action={
            <Link to="/requests?category=leave">
              <Button variant="secondary">View All Leave Requests</Button>
            </Link>
          }
        >
          {leaveBalanceError ? (
            <p className="mb-4 text-sm text-danger">
              Could not load leave balance: {leaveBalanceError}
            </p>
          ) : null}
          {requestsError ? (
            <p className="mb-4 text-sm text-danger">
              Could not load leave requests: {requestsError}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
            <Table caption="Recent leave requests">
              <TableHead>
                <TableHeaderRow>
                  <TableHeaderCell>Request ID</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Leave Dates</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Submitted</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableHeaderRow>
              </TableHead>
              <TableBody>
                {loadingRequests ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-slate-500">
                      Loading leave requests...
                    </TableCell>
                  </TableRow>
                ) : recentRows.length ? (
                  recentRows.map((row) => (
                    <TableRow key={row.requestId}>
                      <TableCell className="rounded-l-2xl">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="text-sm font-semibold text-brand-900 transition hover:underline"
                        >
                          {row.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {row.type}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {row.fromDate} - {row.toDate}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {row.durationLabel}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {row.submittedOn}
                      </TableCell>
                      <TableCell className="rounded-r-2xl">
                        <Chip variant={row.tone}>{row.status.toUpperCase()}</Chip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-slate-500">
                      No leave requests found yet. Start a new leave request to
                      populate this list.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
