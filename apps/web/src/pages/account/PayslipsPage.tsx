import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  SectionCard,
  StatCard,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { useCachedQuery } from "@/shared/lib/core";
import { downloadBase64File } from "@/shared/lib/download";
import {
  downloadMyPayslip,
  getMyPayslipDetails,
  listMyPayslips,
  type PayslipDetail,
  type PayslipRow,
} from "@/shared/api/payroll-api";
import { AccountShellPage } from "./page-helpers";

const statusVariant: Record<string, "success" | "pending" | "neutral"> = {
  ready: "success",
  processing: "pending",
};

export default function PayslipsPage() {
  const { showToast } = useToast();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayslipDetail | null>(null);

  const { data, loading, error, refetch } = useCachedQuery(
    "payroll:my-payslips",
    () => listMyPayslips({ page: 1, per_page: 100 }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const rows = Array.isArray(data?.data) ? data.data : [];

  const summary = useMemo(() => {
    const latest = rows[0] || null;
    return {
      total: rows.length,
      latest,
      distributed: rows.filter(
        (row) => row.latest_distribution?.status === "sent",
      ).length,
      pending: rows.filter(
        (row) =>
          !row.latest_distribution ||
          row.latest_distribution?.status !== "sent",
      ).length,
    };
  }, [rows]);

  function formatMoney(amount: number, currency = "NGN") {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(0)}`;
    }
  }

  async function openDetail(row: PayslipRow) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      const response = await getMyPayslipDetails(row.run_id, row.id);
      setDetail(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load payslip details.";
      setDetailError(message);
      showToast({ tone: "danger", title: "Unable to load payslip", message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDownload(row: PayslipRow) {
    try {
      const response = await downloadMyPayslip(row.run_id, row.id);
      downloadBase64File(
        response.file_name,
        response.mime_type,
        response.content_base64,
      );
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Download failed",
        message:
          err instanceof Error ? err.message : "Unable to download payslip.",
      });
    }
  }

  return (
    <AccountShellPage
      activeLabel="Payslips"
      eyebrow=""
      breadcrumbs={[
        { label: "Profile", path: "/profile" },
        { label: "Payslips" },
      ]}
      title="My Payslips"
      description="Review monthly salary statements and download your payroll history."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {loading ? (
            <div className="text-sm text-slate-500">Loading payslips...</div>
          ) : null}
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          <SectionCard
            title="Payslip History"
            description="Download issued payslips or check upcoming payroll releases."
          >
            <DataTable
              columns={[
                { header: "Period", cell: (row) => <span className="font-semibold text-slate-900">{row.run_name} ({row.month}/{row.year})</span> },
                { header: "Gross", cell: (row) => formatMoney(row.gross_pay) },
                { header: "Net", cell: (row) => formatMoney(row.net_pay) },
                { header: "Status", cell: (row) => <Chip variant={statusVariant[String(row.status || "").toLowerCase()] ?? "neutral"}>{row.status}</Chip> },
                { header: "", className: "text-right space-x-2", cell: (row) => <Button size="sm" variant="ghost" onClick={() => void openDetail(row)}>View</Button> }
              ]}
              data={rows}
              emptyTitle="No payslips available yet."
              emptyDescription="There are no records to display."
            />
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <StatCard
            label="Latest Payslip"
            value={
              summary.latest
                ? `${summary.latest.run_name} (${summary.latest.month}/${summary.latest.year})`
                : "-"
            }
            tone="success"
            hint={
              summary.latest
                ? `${formatMoney(summary.latest.net_pay)} net pay`
                : "No payslip issued yet."
            }
          />
          <StatCard
            label="YTD Earnings"
            value={formatMoney(
              rows.reduce((sum, row) => sum + (row.gross_pay || 0), 0),
            )}
            tone="neutral"
            hint="Sum of issued payslips this year."
          />
          <StatCard
            label="Next Payday"
            value="Apr 30, 2026"
            tone="pending"
            hint="Subject to payroll confirmation."
          />
          <StatCard
            label="Delivered Payslips"
            value={String(summary.distributed)}
            tone="success"
            hint={`${summary.pending} pending delivery`}
          />
          <SectionCard title="Need a correction?">
            <p className="text-sm text-slate-600">
              If a payslip looks off, contact HR or submit a payroll correction
              request.
            </p>
          </SectionCard>
        </div>
      </div>

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Payslip Details
                </p>
                <h2 className="text-2xl font-semibold text-slate-950">
                  {detail?.run_name ?? "Payroll Period"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {detail
                    ? `${detail.month}/${detail.year} • ${detail.status}`
                    : "Loading details"}
                </p>
              </div>
              <div className="flex gap-2">
                {detail ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDownload(detail)}
                  >
                    Download PDF
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>

            {detailLoading ? (
              <div className="mt-6 text-sm text-slate-500">
                Loading payslip details...
              </div>
            ) : detailError ? (
              <div className="mt-6 text-sm text-danger">{detailError}</div>
            ) : detail ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <SectionCard title="Employee">
                    <div className="space-y-2 text-sm text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-900">
                          Name:
                        </span>{" "}
                        {detail.worker_name}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">
                          Role:
                        </span>{" "}
                        {detail.worker_type || "Staff"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">
                          Organization:
                        </span>{" "}
                        {detail.organization_name || "-"}
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="Payment">
                    <div className="space-y-2 text-sm text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-900">
                          Status:
                        </span>{" "}
                        {detail.payment_status || "-"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">
                          Reference:
                        </span>{" "}
                        {detail.payment_reference || "-"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">
                          Delivery:
                        </span>{" "}
                        {detail.latest_distribution?.status || "-"}
                      </div>
                    </div>
                  </SectionCard>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    label="Gross Pay"
                    value={formatMoney(detail.gross_pay, detail.currency)}
                    tone="neutral"
                  />
                  <StatCard
                    label="Deductions"
                    value={formatMoney(
                      detail.total_deductions,
                      detail.currency,
                    )}
                    tone="warning"
                  />
                  <StatCard
                    label="Net Pay"
                    value={formatMoney(detail.net_pay, detail.currency)}
                    tone="success"
                  />
                  <StatCard
                    label="Employer Cost"
                    value={formatMoney(
                      detail.employer_cost || 0,
                      detail.currency,
                    )}
                    tone="pending"
                  />
                </div>

                <SectionCard title="Earnings">
                  <div className="space-y-2 text-sm text-slate-600">
                    {detail.earnings.length ? (
                      detail.earnings.map((line) => (
                        <div
                          key={`earn-${line.label}`}
                          className="flex items-center justify-between"
                        >
                          <span>{line.label}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(line.amount, detail.currency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">
                        No earnings recorded.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Deductions">
                  <div className="space-y-2 text-sm text-slate-600">
                    {detail.deductions.length ? (
                      detail.deductions.map((line) => (
                        <div
                          key={`ded-${line.label}`}
                          className="flex items-center justify-between"
                        >
                          <span>{line.label}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(line.amount, detail.currency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">
                        No deductions recorded.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Employer Costs">
                  <div className="space-y-2 text-sm text-slate-600">
                    {detail.employer_costs.length ? (
                      detail.employer_costs.map((line) => (
                        <div
                          key={`emp-${line.label}`}
                          className="flex items-center justify-between"
                        >
                          <span>{line.label}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(line.amount, detail.currency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">
                        No employer costs recorded.
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AccountShellPage>
  );
}
