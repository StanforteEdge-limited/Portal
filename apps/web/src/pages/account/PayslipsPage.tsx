import { useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useToast, PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
import { downloadBase64File } from "@/shared/lib/download";
import {
  downloadMyPayslip,
  getMyPayslipDetails,
  listMyPayslips,
  type PayslipDetail,
  type PayslipRow,
} from "@/shared/api/payroll-api";
import {
  Receipt,
  Download,
  Calendar,
  CreditCard,
  Building2,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  X,
  Wallet,
  ShieldCheck,
  User,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

export default function PayslipsPage() {
  const { showToast } = useToast();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useCachedQuery(
    "payroll:my-payslips",
    () => listMyPayslips({ page: 1, per_page: 100 }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const rows: PayslipRow[] = Array.isArray(data?.data) ? data.data : [];

  const summary = useMemo(() => {
    const latest = rows[0] || null;
    const ytdGross = rows.reduce((sum, r) => sum + (r.gross_pay || 0), 0);
    const ytdNet = rows.reduce((sum, r) => sum + (r.net_pay || 0), 0);
    const ytdDeductions = ytdGross - ytdNet;

    return {
      total: rows.length,
      latest,
      ytdGross,
      ytdNet,
      ytdDeductions,
      distributed: rows.filter((r) => r.latest_distribution?.status === "sent").length,
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
      return `${currency} ${amount.toLocaleString()}`;
    }
  }

  async function openDetail(row: PayslipRow) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      const response = await getMyPayslipDetails(row.run_id, row.id);
      setDetail(response);
    } catch (err: any) {
      const message = err?.message || "Unable to load payslip details.";
      setDetailError(message);
      showToast({ tone: "danger", title: "Unable to load payslip", message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDownload(row: PayslipRow | PayslipDetail) {
    try {
      setDownloadingId(row.id);
      const response = await downloadMyPayslip(row.run_id, row.id);
      downloadBase64File(response.file_name, response.mime_type, response.content_base64);
      showToast({
        tone: "success",
        title: "Payslip downloaded",
        message: `${response.file_name} has been saved to your downloads.`,
      });
    } catch (err: any) {
      showToast({
        tone: "danger",
        title: "Download failed",
        message: err?.message || "Unable to download payslip.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <PortalLayout activeNav="My Payslips">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="My Payslips & Compensation"
          description="Access your itemized monthly earnings, statutory deductions, tax withholdings, and verifiable slips."
          icon={Receipt}
          iconColor="bg-emerald-50 text-emerald-600"
          badge="● Payroll Active"
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200/60"
          actions={
            summary.latest ? (
              <button
                type="button"
                onClick={() => void handleDownload(summary.latest!)}
                disabled={downloadingId === summary.latest.id}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{downloadingId === summary.latest.id ? "Downloading..." : "Download Latest Payslip"}</span>
              </button>
            ) : null
          }
        />

        {/* 4 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Latest Net Pay */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Latest Net Pay</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {summary.latest ? formatMoney(summary.latest.net_pay) : "—"}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Disbursed
            </span>
          </div>

          {/* Card 2: YTD Gross Pay */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">YTD Gross Earnings</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {formatMoney(summary.ytdGross)}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {summary.total} Cycles
            </span>
          </div>

          {/* Card 3: YTD Statutory Deductions */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">YTD Deductions (TAX/PEN)</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {formatMoney(summary.ytdDeductions)}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Compliant
            </span>
          </div>

          {/* Card 4: Next Payday */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Next Payday</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">Nov 30, 2026</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
        </div>

        {/* Payslip History Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Payslip Archive & History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official statements issued by Stanforte Edge. Slips are digitally stamped and verifiable.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
              Showing {rows.length} issued {rows.length === 1 ? "payslip" : "payslips"}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading payslip records...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-500">Error: {error}</div>
          ) : rows.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No payslips issued yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your compensation records and official payslips will appear here once the first payroll cycle is disbursed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Payroll Cycle</th>
                    <th className="py-3 px-5">Period</th>
                    <th className="py-3 px-5">Gross Pay</th>
                    <th className="py-3 px-5">Deductions</th>
                    <th className="py-3 px-5">Net Take-Home</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.map((row) => {
                    const deductions = (row.gross_pay || 0) - (row.net_pay || 0);
                    const isDownloading = downloadingId === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {row.run_name || "Monthly Payroll"}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">
                          {row.month}/{row.year}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-700">
                          {formatMoney(row.gross_pay)}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-amber-600">
                          -{formatMoney(deductions)}
                        </td>
                        <td className="py-3.5 px-5 font-black text-emerald-600">
                          {formatMoney(row.net_pay)}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{row.status || "Ready"}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => void openDetail(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] transition shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(row)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-[#ff6900] hover:bg-[#ff6900] hover:text-white font-semibold text-[11px] transition shadow-2xs disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{isDownloading ? "Saving..." : "PDF"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information Banner */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-xl bg-orange-50 text-[#ff6900] shrink-0 mt-0.5">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900">Need a salary verification letter or tax certificate?</p>
            <p className="text-slate-500 mt-0.5">
              Payslips issued on Stanforte Edge are legally compliant with PAYE tax deductions, NHF, and Pension Reform Acts. If you spot any variance, you can raise an attendance or payroll query with HR.
            </p>
          </div>
        </div>
      </div>

      {/* Slide-Over Modal for Detailed Payslip Inspection */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDetailOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full z-10 overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 bg-[#0a1128] text-white flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Verified Salary Statement</span>
                </div>
                <h2 className="text-xl font-black mt-1 tracking-tight">
                  {detail?.run_name || "Monthly Compensation"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Period: {detail ? `${detail.month}/${detail.year}` : "Loading..."} • Disbursed
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 space-y-6 text-xs">
              {detailLoading ? (
                <div className="py-16 text-center text-slate-400">Loading payslip details...</div>
              ) : detailError ? (
                <div className="py-12 text-center text-rose-500">{detailError}</div>
              ) : detail ? (
                <>
                  {/* Employee & Bank Info */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Employee Name</span>
                      <p className="font-bold text-slate-900 mt-0.5">{detail.worker_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Employment Role</span>
                      <p className="font-bold text-slate-900 mt-0.5">{detail.worker_type || "Staff"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Organization</span>
                      <p className="font-bold text-slate-900 mt-0.5">{detail.organization_name || "Stanforte"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payment Reference</span>
                      <p className="font-bold text-slate-900 mt-0.5 font-mono">{detail.payment_reference || "N/A"}</p>
                    </div>
                  </div>

                  {/* Net Pay Highlight Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                        Net Take-Home Pay
                      </span>
                      <div className="text-2xl font-black mt-0.5">
                        {formatMoney(detail.net_pay, detail.currency)}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white font-bold text-xs">
                      Paid via Direct Bank Transfer
                    </span>
                  </div>

                  {/* Earnings Section */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                      Earnings & Allowances
                    </h3>
                    <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                      {detail.earnings?.length ? (
                        detail.earnings.map((line) => (
                          <div key={line.label} className="p-3 flex items-center justify-between">
                            <span className="font-medium text-slate-700">{line.label}</span>
                            <span className="font-bold text-slate-900">
                              {formatMoney(line.amount, detail.currency)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-slate-400">No itemized earnings lines.</div>
                      )}
                      <div className="p-3 bg-slate-50 flex items-center justify-between font-bold text-slate-900">
                        <span>Total Gross Earnings</span>
                        <span>{formatMoney(detail.gross_pay, detail.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                      Statutory Deductions & Taxes
                    </h3>
                    <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                      {detail.deductions?.length ? (
                        detail.deductions.map((line) => (
                          <div key={line.label} className="p-3 flex items-center justify-between">
                            <span className="font-medium text-slate-700">{line.label}</span>
                            <span className="font-bold text-rose-600">
                              -{formatMoney(line.amount, detail.currency)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-slate-400">No deductions recorded.</div>
                      )}
                      <div className="p-3 bg-slate-50 flex items-center justify-between font-bold text-rose-700">
                        <span>Total Deductions</span>
                        <span>-{formatMoney(detail.total_deductions, detail.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employer Contributions */}
                  {detail.employer_costs?.length ? (
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                        Employer Contributions (Non-deductible)
                      </h3>
                      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                        {detail.employer_costs.map((line) => (
                          <div key={line.label} className="p-3 flex items-center justify-between">
                            <span className="font-medium text-slate-700">{line.label}</span>
                            <span className="font-bold text-slate-700">
                              {formatMoney(line.amount, detail.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            {detail && (
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(detail)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Stamped PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
