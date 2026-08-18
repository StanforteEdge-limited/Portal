import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { listPayrollRuns, type PayrollRunSummary } from "@/shared/api/payroll-api";
import { formatCurrency } from "@stanforte/shared";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function runStatusTone(status: string): "neutral" | "warning" | "success" | "danger" {
  switch (status) {
    case "draft": return "neutral";
    case "prepared": return "neutral";
    case "under_review": return "warning";
    case "approved": return "success";
    case "authorized": return "success";
    case "paid": return "success";
    case "closed": return "neutral";
    case "rejected": return "danger";
    default: return "neutral";
  }
}

function periodLabel(run: any) {
  return `${MONTH_NAMES[run.month] ?? run.month} ${run.year}`;
}

export default function HrPayrollPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: runsResp, loading } = useCachedQuery(
    "hr:payroll:runs",
    () => listPayrollRuns({ per_page: 100, status_in: "draft,prepared,rejected" }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const allRuns: PayrollRunSummary[] = runsResp?.items ?? [];

  const pendingSubmission = allRuns.filter((r) =>
    r.status === "draft" || r.status === "prepared",
  ).length;
  const awaitingApproval = allRuns.filter((r) =>
    r.status === "under_review" || r.status === "approved" || r.status === "authorized",
  ).length;
  const paidThisYear = allRuns.filter((r) =>
    r.status === "paid" && r.year === new Date().getFullYear(),
  ).length;

  const filteredRuns =
    statusFilter === "all"
      ? allRuns
      : allRuns.filter((r) => r.status === statusFilter);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-payroll"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[{ label: "HR", path: "/hr" }, { label: "Payroll" }]}
        title="Payroll"
        description="Create and submit payroll runs for Finance approval."
        actions={
          <Button
            size="sm"
            requiredPermissions={["payroll.manage"]}
            onClick={() => navigate("/hr/payroll/runs/new")}
          >
            New Payroll Run
          </Button>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Draft / Generated"
            value={String(pendingSubmission)}
            tone="neutral"
            icon="edit_note"
          />
          <StatCard
            label="Awaiting Finance Approval"
            value={String(awaitingApproval)}
            tone="warning"
            icon="pending_actions"
          />
          <StatCard
            label={`Paid Runs (${new Date().getFullYear()})`}
            value={String(paidThisYear)}
            tone="success"
            icon="payments"
          />
        </div>

        <SectionCard
          title="Payroll Runs"
          description="All runs you have created. Submit a prepared run to send it to Finance for approval."
        >
          <div className="mb-4">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="prepared">Prepared</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="authorized">Authorized</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </SelectField>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading runs...</div>
          ) : filteredRuns.length ? (
            <DataTable
              columns={[
                { header: "Name", cell: (run: any) => <p className="font-semibold text-slate-900">{run.name}</p> },
                { header: "Period", cell: (run: any) => periodLabel(run) },
                { header: "Workers", cell: (run: any) => run.item_count ?? "-" },
                { header: "Gross", cell: (run: any) => run.totals?.gross != null ? formatCurrency(run.totals.gross, run.currency) : "-" },
                { header: "Net", cell: (run: any) => run.totals?.net != null ? formatCurrency(run.totals.net, run.currency) : "-" },
                { header: "Status", cell: (run: any) => <Chip variant={runStatusTone(run.status)}>{run.status}</Chip> },
                { header: "", cell: (run: any) => (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/hr/payroll/runs/${run.id}`)}>
                    Open
                  </Button>
                ) },
              ]}
              data={filteredRuns}
            />
          ) : (
            <EmptyState
              title="No payroll runs"
              description="Create a new payroll run to get started."
            />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
