import { useState } from "react";
import { useParams } from "react-router-dom";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { useToast } from "@/shared";
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
      if (res?.base64) {
        triggerDownload(
          res.fileName || `payroll-breakdown-${id}.xlsx`,
          res.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          res.base64,
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
      <PortalLayout activeNav="Payroll Runs">
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading payroll authorization docket...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!run) {
    return (
      <PortalLayout activeNav="Payroll Runs">
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center max-w-md mx-auto my-12">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Run Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">This payroll run does not exist or has been archived.</p>
          <Link
            to="/admin/payroll/authorization"
            className="inline-flex px-4 py-2 rounded-xl bg-[#ff6900] text-white font-bold text-xs"
          >
            &larr; Back to Authorization Queue
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const canAuthorize = run.status === "approved";
  const items = run.items ?? [];
  const period = `${MONTH_NAMES[run.month] ?? run.month} ${run.year}`;

  return (
    <PortalLayout activeNav="Payroll Runs">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/admin/payroll/authorization" className="hover:text-slate-800 transition">
                Payroll Runs
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">{run.name}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              {run.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cycle: <strong className="text-slate-700">{period}</strong> • Currency: <span className="font-mono">{run.currency}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={acting === "export"}
              onClick={() => void handleExport()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            >
              <Download className="h-4 w-4 text-slate-400" />
              <span>{acting === "export" ? "Exporting..." : "Download Excel"}</span>
            </button>

            {canAuthorize && (
              <>
                <button
                  type="button"
                  disabled={acting === "reject"}
                  onClick={() => void handleReturnToFinance()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
                >
                  <X className="h-4 w-4" />
                  <span>{acting === "reject" ? "Returning..." : "Return to Finance"}</span>
                </button>
                <button
                  type="button"
                  disabled={acting === "authorize"}
                  onClick={() => void handleAuthorize()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition active:scale-95"
                >
                  {acting === "authorize" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Authorize Disbursement</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Run Status</div>
                <div className="text-xl font-black text-slate-900 mt-0.5 capitalize">{run.status}</div>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                run.status === "authorized" || run.status === "paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : run.status === "approved"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {run.status}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Enrolled Workers</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{run.worker_count ?? items.length}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Employees
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Net Payout</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5 font-headline">
                  {run.net_total != null ? `${run.currency} ${run.net_total.toLocaleString()}` : "-"}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Reconciled
            </span>
          </div>
        </div>

        {/* Authorization Sign-off Note Box */}
        {canAuthorize && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Executive Sign-Off Declaration
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              By clicking <strong>Authorize Disbursement</strong>, you confirm that gross earnings, statutory PAYE tax, pension deductions, and employee bank details have been verified for release.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Executive Notes & Comments (optional for approval, required if returning)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add audit sign-off remarks or reasons for return..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-amber-200/80 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>
          </div>
        )}

        {run.status === "authorized" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Authorized by Executive Management — Treasury and Finance can proceed with bank disbursements.</span>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Per-Employee Breakdown</h3>
              <p className="text-xs text-slate-500">Itemized compensation and statutory deductions for this pay run.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{items.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-4">Gross Compensation</th>
                  <th className="py-3 px-4">Total Deductions</th>
                  <th className="py-3 px-5 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      No payroll line items available in this run.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-5 font-bold text-slate-900">
                        {item.worker_name ?? "Employee"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {run.currency} {item.gross_pay?.toLocaleString() ?? "-"}
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-medium">
                        {run.currency} {item.total_deductions?.toLocaleString() ?? "0"}
                      </td>
                      <td className="py-3 px-5 text-right font-black text-slate-900 font-headline">
                        {run.currency} {item.net_pay?.toLocaleString() ?? "-"}
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
