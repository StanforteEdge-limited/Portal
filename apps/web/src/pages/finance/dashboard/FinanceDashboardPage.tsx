import {
  Chip,
  EmptyState,
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
import { formatCurrency } from "@stanforte/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";
import {
  formatPersonName,
} from "@/pages/requests/request-helpers";
import type { RequestRecord } from "@/pages/requests/requests-api";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { financeApi, useCachedQuery } from "@/shared/lib/core";

function toTitleCase(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function requestTotal(entry: RequestRecord) {
  const raw = Number((entry as any).request_total_amount ?? (entry as any).total_amount ?? 0);
  if (raw > 0) return raw;
  if (!Array.isArray(entry?.items)) return 0;
  return entry.items.reduce(
    (sum, item) => sum + Number(item?.amount ?? 0) * Number(item?.quantity ?? 1),
    0,
  );
}


export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useCachedQuery(
    "finance-admin:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: allRequestsData, loading, error } = useCachedQuery(
    "finance-admin:dashboard:requests",
    () => financeApi.listRequests({ page: 1, per_page: 100, order_by: "created_at", order_dir: "desc" }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const statsQueue: RequestRecord[] = Array.isArray(allRequestsData) ? allRequestsData : [];
  const recentQueue: RequestRecord[] = statsQueue.slice(0, 8);
  const totalCount = statsQueue.length;

  const cleared = statsQueue.filter(
    (e) => String(e.status || "").toLowerCase() === "cleared",
  ).length;
  const awaitingRetirement = statsQueue.filter((e) =>
    ["disbursed", "confirmed"].includes(String(e.status || "").toLowerCase()),
  ).length;
  const completed = statsQueue.filter((e) =>
    ["retired", "completed", "confirmed"].includes(String(e.status || "").toLowerCase()),
  ).length;

  // Finance action queue — only requests where finance must act
  const FINANCE_ACTION_STATUSES = ["cleared", "prepared", "disbursed", "confirmed"];
  const actionQueue = recentQueue.filter((e) =>
    FINANCE_ACTION_STATUSES.includes(String(e.status || "").toLowerCase()),
  );

  function financeActionLabel(status: string): { label: string; tone: "warning" | "pending" | "success" | "neutral" } {
    const s = String(status || "").toLowerCase();
    if (s === "cleared") return { label: "Ready to Disburse", tone: "warning" };
    if (s === "prepared") return { label: "Voucher Prepared", tone: "pending" };
    if (s === "disbursed") return { label: "Awaiting Retirement", tone: "pending" };
    if (s === "confirmed") return { label: "Awaiting Closure", tone: "neutral" };
    return { label: toTitleCase(status), tone: "neutral" };
  }

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-dashboard"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Finance" }]}
        title="Finance Admin"
        description="Monitor the live finance workflow and move cleared requests through payout and closure."
      />

      <div className="grid gap-6">
        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Finance Queue" value={String(totalCount)} tone="neutral" icon="folder_open" />
          <StatCard label="Ready To Disburse" value={String(cleared)} tone="warning" icon="payments" />
          <StatCard label="Awaiting Retirement" value={String(awaitingRetirement)} tone="pending" icon="receipt_long" />
          <StatCard label="Completed" value={String(completed)} tone="success" icon="task_alt" />
        </div>

        {/* Queue + tools side by side */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Priority queue — compact, no filters */}
          <SectionCard
            title="Finance Action Required"
            description="Requests waiting for your clearance, disbursement, or completion."
            action={
              <Link
                to="/finance/requests"
                className="text-sm font-semibold text-brand-900 transition hover:underline"
              >
                View all
              </Link>
            }
          >
            {loading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Loading finance requests...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                {error}
              </div>
            ) : actionQueue.length ? (
              <div className="rounded-[22px] border border-slate-200 bg-white">
                <Table caption="Finance requests needing action">
                  <TableHead>
                    <TableHeaderRow>
                      <TableHeaderCell>Request No</TableHeaderCell>
                      <TableHeaderCell>Staff</TableHeaderCell>
                      <TableHeaderCell>Total</TableHeaderCell>
                      <TableHeaderCell>Action Needed</TableHeaderCell>
                    </TableHeaderRow>
                  </TableHead>
                  <TableBody>
                    {actionQueue.map((entry) => {
                      const action = financeActionLabel(entry.status);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Link
                              to={`/finance/requests/${entry.id}`}
                              className="text-sm font-semibold text-brand-900 transition hover:underline"
                            >
                              {entry.request_number || entry.id}
                            </Link>
                          </TableCell>
                          <TableCell className="capitalize text-sm text-slate-700">
                            {formatPersonName(entry.creator)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">
                            {formatCurrency(requestTotal(entry), entry.currency || "NGN")}
                          </TableCell>
                          <TableCell>
                            <Chip variant={action.tone}>{action.label}</Chip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No actions pending"
                description="All requests have been processed or are awaiting other stages."
              />
            )}
          </SectionCard>

          {/* Right column — tools */}
          <div className="flex flex-col gap-6">
            <SectionCard title="Workflow Stages" description="">
              <div className="flex flex-col gap-2">
                {["Cleared", "Disbursed", "Confirmed", "Retired", "Completed"].map((step) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <Icon name="arrow_right" className="text-slate-400 text-[16px]" />
                    <p className="text-sm font-semibold text-slate-950">{step}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <section className="section-card bg-brand-900 p-5 text-white">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
                Finance Tools
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                Payment vouchers
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/85">
                Review disbursements and confirm closures.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to="/finance/payment-vouchers"
                  className="flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-slate-100"
                >
                  Open Vouchers
                </Link>
                <Link
                  to="/finance/requests"
                  className="flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Review Queue
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
