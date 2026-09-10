import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  getPayrollRun,
  generatePayrollRun,
  submitPayrollRun,
  deletePayrollRun,
  type PayrollRunDetail,
} from "@/shared/api/payroll-api";
import { formatCurrency } from "@stanforte/shared";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function runStatusTone(
  status: string,
): "neutral" | "warning" | "success" | "danger" {
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

export default function HrPayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [acting, setActing] = useState<string | null>(null);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const {
    data: run,
    loading,
    refetch,
  } = useCachedQuery(
    `hr:payroll:run:${id}`,
    () => getPayrollRun(id!),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  async function handleGenerate() {
    if (!id) return;
    setActing("generate");
    try {
      await generatePayrollRun(id);
      showToast({ message: "Run generated — review items below", tone: "success" });
      refetch();
    } catch {
      showToast({ message: "Failed to generate run", tone: "danger" });
    } finally {
      setActing(null);
    }
  }

  async function handleSubmit() {
    if (!id) return;
    setActing("submit");
    try {
      await submitPayrollRun(id);
      showToast({ message: "Run submitted to Finance for approval", tone: "success" });
      refetch();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Failed to submit run", tone: "danger" });
    } finally {
      setActing(null);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Delete this payroll run? This cannot be undone.")) return;
    setActing("delete");
    try {
      await deletePayrollRun(id);
      showToast({ message: "Run deleted", tone: "success" });
      navigate("/hr/payroll");
    } catch {
      showToast({ message: "Failed to delete run", tone: "danger" });
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <AppShell
        navigation={buildAppNavigation()}
        activeLabel="hr-payroll"
        user={{ name: userName, role: "HR Staff" }}
        mobileNav={buildAppMobileNav("HR")}
      >
        <div className="p-8 text-sm text-slate-500">Loading...</div>
      </AppShell>
    );
  }

  if (!run) {
    return (
      <AppShell
        navigation={buildAppNavigation()}
        activeLabel="hr-payroll"
        user={{ name: userName, role: "HR Staff" }}
        mobileNav={buildAppMobileNav("HR")}
      >
        <EmptyState title="Run not found" description="This payroll run does not exist." />
      </AppShell>
    );
  }

  const period = `${MONTH_NAMES[run.month] ?? run.month} ${run.year}`;
  const canGenerate = run.status === "draft" || run.status === "prepared";
  const canSubmit = run.status === "prepared";
  const canDelete = ["draft", "prepared"].includes(run.status);
  const canEdit = ["draft"].includes(run.status);
  const items = run.items ?? [];

  const totalGross = items.reduce((sum, i) => sum + Number(i.gross_pay ?? i.grossPay ?? 0), 0);
  const totalNet = items.reduce((sum, i) => sum + Number(i.net_pay ?? i.netPay ?? 0), 0);
  const totalDeductions = items.reduce((sum, i) => sum + Number(i.total_deductions ?? i.totalDeductions ?? 0), 0);

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
        breadcrumbs={[
          { label: "HR", path: "/hr" },
          { label: "Payroll", path: "/hr/payroll" },
          { label: run.name },
        ]}
        title={run.name}
        description={`${period} · ${run.currency}`}
        actions={
          <div className="flex gap-2">
            {canGenerate && (
              <Button
                size="sm"
                requiredPermissions={["payroll.manage"]}
                disabled={acting === "generate"}
                onClick={handleGenerate}
              >
                {acting === "generate" ? "Generating..." : "Generate Items"}
              </Button>
            )}
            {canSubmit && (
              <Button
                size="sm"
                requiredPermissions={["payroll.manage"]}
                disabled={acting === "submit"}
                onClick={handleSubmit}
              >
                {acting === "submit" ? "Submitting..." : "Submit to Finance"}
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                requiredPermissions={["payroll.manage"]}
                disabled={acting === "delete"}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Status"
            value={run.status}
            tone={runStatusTone(run.status)}
            icon="info"
          />
          <StatCard
            label="Workers"
            value={String(run.item_count ?? items.length)}
            tone="neutral"
            icon="group"
          />
          <StatCard
            label="Total Net Pay"
            value={totalNet > 0 ? formatCurrency(totalNet, run.currency) : (run.totals?.net && run.totals?.net > 0 ? formatCurrency(run.totals.net, run.currency) : "-")}
            tone="neutral"
            icon="payments"
          />
        </div>

        {run.notes ? (
          <SectionCard title="Notes">
            <div className="space-y-1">
              {run.notes.split('\n').filter(Boolean).map((note: string, idx: number) => (
                <p key={idx} className="text-sm text-slate-700">{note}</p>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Payroll Items"
          description={
            canGenerate
              ? "Click 'Generate Items' to pull worker records for this period."
              : "Employee-level breakdown for this run."
          }
        >
          {items.length ? (
            <DataTable
              columns={[
                { header: "Employee", cell: (item: any) => <p className="font-semibold text-slate-900">{item.worker?.fullName ?? item.worker?.full_name ?? item.worker_name ?? "-"}</p> },
                { header: "Gross Pay", cell: (item: any) => formatCurrency(item.grossPay ?? item.gross_pay ?? 0, run.currency) },
                { header: "Deductions", cell: (item: any) => formatCurrency(item.totalDeductions ?? item.total_deductions ?? 0, run.currency) },
                { header: "Net Pay", cell: (item: any) => <span className="font-semibold">{formatCurrency(item.netPay ?? item.net_pay ?? 0, run.currency)}</span> },
                { header: "Payment", cell: (item: any) => (
                  <Chip variant={(item.paymentStatus ?? item.payment_status ?? "pending") === "paid" ? "success" : "neutral"}>
                    {item.paymentStatus ?? item.payment_status ?? "pending"}
                  </Chip>
                ) },
              ]}
              data={items}
            />
          ) : (
            <EmptyState
              title="No items yet"
              description={
                canGenerate
                  ? "Generate items to populate this run."
                  : "No payroll items for this run."
              }
            />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
