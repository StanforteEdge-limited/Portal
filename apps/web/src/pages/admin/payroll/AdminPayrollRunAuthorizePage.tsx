import { useState } from "react";
import { useParams } from "react-router-dom";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { useToast, PageHeader } from "@/shared";
import {
  getPayrollRun,
  authorizePayrollRun,
  rejectPayrollRun,
  downloadMonthlyBreakdown,
} from "@/shared/api/payroll-api";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Building2,
  Users,
  ShieldCheck,
  Eye,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Wallet,
  Download,
  RotateCcw,
  Check,
  X,
  FileText,
} from "lucide-react";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function triggerDownload(fileName: string, mimeType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPayrollRunAuthorizePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const { data: run, loading, refetch } = useCachedQuery(
    `admin:payroll:run:${id}`,
    () => getPayrollRun(id!),
    { ttlMs: 0, storage: "memory" },
  );

  async function handleAuthorize() {
    if (!id) return;
    setActing("authorize");
    try {
      await authorizePayrollRun(id, { notes: notes.trim() || undefined });
      showToast("Payroll run authorized. Finance can now proceed with disbursement.", "success");
      setNotes("");
      refetch();
    } catch (err: any) {
      showToast(err?.message || "Authorization failed.", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleReturnToFinance() {
    if (!id) return;
    const trimmed = notes.trim();
    if (!trimmed) {
      showToast("Add a review note explaining what must be corrected before returning.", "error");
      return;
    }
    setActing("reject");
    try {
      await rejectPayrollRun(id, { note: trimmed });
      showToast("Payroll run returned to Finance for adjustment.", "info");
      setNotes("");
      refetch();
    } catch (err: any) {
      showToast(err?.message || "Failed to return run.", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleExport() {
    if (!id) return;
    setActing("export");
    try {
      const res = await downloadMonthlyBreakdown(id);
      if (res?.content_base64) {
        triggerDownload(
          res.file_name || `payroll-breakdown-${id}.xlsx`,
          res.mime_type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          res.content_base64,
        );
        showToast("Breakdown downloaded.", "success");
      }
    } catch {
      showToast("Unable to download breakdown file.", "error");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <PortalLayout activeNav="Payroll">
        <div className="py-24 text-center">
          <div className="w-5 h-5 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-neutral-500">Loading payroll authorization docket</p>
        </div>
      </PortalLayout>
    );
  }

  if (!run) {
    return (
      <PortalLayout activeNav="Payroll">
        <div className="bg-white p-12 rounded-2xl border border-neutral-900/[0.08] shadow-xs text-center max-w-md mx-auto my-12">
          <AlertCircle className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
          <h2 className="text-base font-medium text-neutral-900 font-headline">Run not found</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5">This payroll run does not exist or has been archived</p>
          <Link
            to="/admin/payroll/authorization"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-sm transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Back to authorization queue</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const canAuthorize = run.status === "approved";
  const items = run.items ?? [];
  const period = `${MONTH_NAMES[run.month] ?? run.month} ${run.year}`;

  return (
    <PortalLayout activeNav="Payroll">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title={run.name}
          description={`Cycle ${period} · Currency ${run.currency}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/admin/payroll/authorization"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                <span>Back</span>
              </Link>

              <button
                type="button"
                disabled={acting === "export"}
                onClick={() => void handleExport()}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium transition-colors duration-150"
              >
                <Download className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                <span>{acting === "export" ? "Exporting" : "Download Excel"}</span>
              </button>

              {canAuthorize && (
                <>
                  <button
                    type="button"
                    disabled={acting === "reject"}
                    onClick={() => void handleReturnToFinance()}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-rose-600/20 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium transition-colors duration-150"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                    <span>{acting === "reject" ? "Returning" : "Return to finance"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={acting === "authorize"}
                    onClick={() => void handleAuthorize()}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98]"
                  >
                    {acting === "authorize" ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    <span>Authorize disbursement</span>
                  </button>
                </>
              )}
            </div>
          }
        />

        {/* 3 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <article className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Run status</p>
            <p className="text-base sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline capitalize truncate">
              {run.status}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 font-mono tabular-nums truncate hidden sm:block">{period}</p>
          </article>

          <article className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Enrolled</p>
            <p className="text-base sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums truncate">
              {(run.worker_count ?? items.length).toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Included in this cycle</p>
          </article>

          <article className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Net payout</p>
            <p className="text-base sm:text-[28px] leading-tight sm:leading-none font-medium text-[#c2410c] font-headline tabular-nums truncate">
              {run.net_total != null ? `${run.currency} ${run.net_total.toLocaleString()}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Reconciled net disbursement</p>
          </article>
        </div>

        {/* Authorization Sign-off Note Box */}
        {canAuthorize && (
          <div className="bg-white border border-neutral-900/[0.08] border-l-2 border-l-[#ff6900] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <ShieldCheck className="h-4 w-4 text-[#c2410c]" strokeWidth={1.5} />
              <span>Executive sign-off declaration</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-3xl">
              By selecting <span className="font-medium text-neutral-900">Authorize disbursement</span>, you confirm that gross earnings, statutory PAYE tax, pension deductions, and employee bank details have been verified for release.
            </p>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Executive notes (optional for approval, required if returning)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add audit sign-off remarks or reasons for return"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              />
            </div>
          </div>
        )}

        {run.status === "authorized" && (
          <div className="bg-emerald-50 border border-emerald-600/15 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
            <span>Authorized by executive management — Treasury and Finance can proceed with bank disbursements</span>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-neutral-900 font-headline">Per-employee breakdown</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Itemized compensation and statutory deductions for this pay run</p>
            </div>
            <span className="text-xs font-mono text-neutral-500 tabular-nums shrink-0">{items.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5 text-right">Gross compensation</th>
                  <th className="py-3 px-5 text-right">Total deductions</th>
                  <th className="py-3 px-5 text-right">Net payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-neutral-500">
                      No payroll line items available in this run
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-neutral-50 transition-colors duration-150">
                      <td className="py-3.5 px-5 font-medium text-neutral-900">
                        {item.worker_name ?? "Employee"}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                        {run.currency} {item.gross_pay?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs text-rose-700 tabular-nums">
                        {run.currency} {item.total_deductions?.toLocaleString() ?? "0"}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-sm font-medium text-neutral-900 tabular-nums">
                        {run.currency} {item.net_pay?.toLocaleString() ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
