import type { MouseEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { formatCurrency } from "@stanforte/shared";
import { formatPersonName } from "@/pages/requests/request-helpers";
import type { RequestRecord } from "@/pages/requests/requests-api";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  FolderOpen,
  DollarSign,
  Receipt,
  FileText,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

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
  const navigate = useNavigate();

  const { data: allRequestsData, loading, error, refetch } = useCachedQuery(
    "finance-admin:dashboard:requests",
    () => financeApi.listRequests({ page: 1, per_page: 100, order_by: "created_at", order_dir: "desc" }).catch(() => []),
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
    ["retired", "completed"].includes(String(e.status || "").toLowerCase()),
  ).length;

  // Finance action queue — requests requiring finance action
  const FINANCE_ACTION_STATUSES = ["cleared", "prepared", "disbursed", "confirmed"];
  const actionQueue = recentQueue.filter((e) =>
    FINANCE_ACTION_STATUSES.includes(String(e.status || "").toLowerCase()),
  );

  return (
    <PortalLayout activeNav="Finance & Procurement">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Finance & Accounts</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-semibold">Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">
            Finance & Disbursements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review cleared expenditure requests, prepare payment vouchers, and track disbursement status.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/finance/payment-vouchers"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <Receipt className="h-4 w-4 text-slate-500" />
            <span>Payment Vouchers</span>
          </Link>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Metric Cards (Matching the design spec screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Finance Queue</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalCount}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>Active workflow pipeline</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FolderOpen className="h-6 w-6" />
          </div>
        </div>

        {/* Ready to Disburse */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Ready to Disburse</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {cleared}
            </div>
            <div className="text-[11px] font-bold text-amber-600">
              Awaiting payout action
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Awaiting Retirement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Awaiting Retirement</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {awaitingRetirement}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Disbursed advances
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Completed & Retired */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Completed & Closed</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {completed}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Fully reconciled
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 3. Action Queue Table & Right Column Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Action Table (Left 8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-headline">
                Action Required Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Requests approved by management waiting for disbursement, voucher preparation, or closure.
              </p>
            </div>
            <Link
              to="/finance/requests"
              className="text-xs font-bold text-[#ff6900] hover:text-[#ea580c] flex items-center gap-1"
            >
              <span>View all ({totalCount})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Request No</th>
                  <th className="px-6 py-3.5">Requester</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block w-5 h-5 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading finance queue...</div>
                    </td>
                  </tr>
                ) : actionQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">All actions up to date</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                        No financial disbursements are currently waiting for your review.
                      </div>
                    </td>
                  </tr>
                ) : (
                  actionQueue.map((entry) => {
                    const statusStr = String(entry.status || "").toLowerCase();
                    const isCleared = statusStr === "cleared";
                    const isDisbursed = statusStr === "disbursed" || statusStr === "confirmed";

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => navigate(`/finance/requests/${entry.id}`)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                          {entry.request_number || entry.id}
                        </td>
                        <td className="px-6 py-4 text-slate-700 capitalize font-medium">
                          {formatPersonName(entry.creator)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {formatCurrency(requestTotal(entry), entry.currency || "NGN")}
                        </td>
                        <td className="px-6 py-4">
                          {isCleared ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Ready to Disburse
                            </span>
                          ) : isDisbursed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              Disbursed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {toTitleCase(entry.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/finance/requests/${entry.id}`}
                            onClick={(e: MouseEvent) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff6900] hover:text-[#ea580c]"
                          >
                            <span>{isCleared ? "Disburse" : "View"}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Workflow Steps & Dark Navy Card (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Workflow Steps Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Disbursement Lifecycle
            </h3>
            <div className="space-y-2">
              {[
                { title: "1. Approval & Clearance", desc: "Approved by manager and cleared for payout", status: "completed" },
                { title: "2. Payment Voucher", desc: "Voucher generated with account allocations", status: "current" },
                { title: "3. Direct Disbursement", desc: "Funds transferred via bank or petty cash", status: "pending" },
                { title: "4. Retirement & Closure", desc: "Receipts and balance verified and audited", status: "pending" },
              ].map((step, idx) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{step.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dark Navy Next Payroll / Quick Tools Card (Matching Screenshot) */}
          <div className="bg-[#0a1128] text-white rounded-2xl shadow-lg p-6 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Payment Vouchers</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Manage accounting vouchers, general ledger postings, and statutory tax deductions.
                </p>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              <Link
                to="/finance/payment-vouchers"
                className="w-full block py-2.5 px-4 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white text-center shadow-md shadow-orange-500/25 transition"
              >
                Open Voucher Ledger &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
