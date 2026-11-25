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
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium mb-1">
            <span>Finance & Accounts</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-neutral-900 font-semibold">Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight font-headline">
            Finance & Disbursements
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Review cleared expenditure requests, prepare payment vouchers, and track disbursement status.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/finance/payment-vouchers"
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <Receipt className="h-4 w-4 text-neutral-500" />
            <span>Payment Vouchers</span>
          </Link>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 text-neutral-500 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Metric Cards (Matching the design spec screenshot) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* Total Queue */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Finance Queue</span>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <FolderOpen className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              {totalCount}
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600 mt-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>Active pipeline</span>
            </div>
          </div>
        </div>

        {/* Ready to Disburse */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Ready to Disburse</span>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              {cleared}
            </div>
            <div className="hidden sm:block text-xs font-medium text-amber-600 mt-0.5">
              Awaiting payout action
            </div>
          </div>
        </div>

        {/* Awaiting Retirement */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Awaiting Retirement</span>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              {awaitingRetirement}
            </div>
            <div className="hidden sm:block text-xs font-medium text-neutral-400 mt-0.5">
              Disbursed advances
            </div>
          </div>
        </div>

        {/* Completed & Retired */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Completed & Closed</span>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              {completed}
            </div>
            <div className="hidden sm:block text-xs font-medium text-neutral-400 mt-0.5">
              Fully reconciled
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Queue Table & Right Column Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Action Table (Left 8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-headline">
                Action Required Queue
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Requests approved by management waiting for disbursement, voucher preparation, or closure.
              </p>
            </div>
            <Link
              to="/finance/requests"
              className="text-xs font-medium text-[#ff6900] hover:text-[#ea580c] flex items-center gap-1"
            >
              <span>View all ({totalCount})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-xs font-medium text-neutral-500">
                  <th className="px-6 py-3.5">Request No</th>
                  <th className="px-6 py-3.5">Requester</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
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
                      <div className="text-xs font-medium text-neutral-800">All actions up to date</div>
                      <div className="text-xs text-neutral-400 mt-0.5 max-w-xs mx-auto">
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
                        className="hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-medium text-neutral-900 group-hover:text-[#ff6900] transition-colors">
                          {entry.request_number || entry.id}
                        </td>
                        <td className="px-6 py-4 text-neutral-700 capitalize font-medium">
                          {formatPersonName(entry.creator)}
                        </td>
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          {formatCurrency(requestTotal(entry), entry.currency || "NGN")}
                        </td>
                        <td className="px-6 py-4">
                          {isCleared ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Ready to Disburse
                            </span>
                          ) : isDisbursed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                              Disbursed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
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

        {/* Right Column: Disbursement Lifecycle & Voucher Ledger */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-medium text-neutral-900 font-headline">
              Disbursement lifecycle
            </h3>
            <div className="divide-y divide-neutral-900/[0.06]">
              {[
                { title: "Approval & clearance", desc: "Approved by manager and cleared for payout" },
                { title: "Payment voucher", desc: "Voucher generated with account allocations" },
                { title: "Direct disbursement", desc: "Funds transferred via bank or petty cash" },
                { title: "Retirement & closure", desc: "Receipts and balance verified and audited" },
              ].map((step, idx) => (
                <div key={step.title} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 border border-neutral-900/[0.08] text-neutral-700 text-xs font-mono tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{step.title}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-neutral-900 font-headline">Payment vouchers</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Manage accounting vouchers, general ledger postings, and statutory tax deductions.
              </p>
            </div>
            <Link
              to="/finance/payment-vouchers"
              className="w-full h-9 px-4 rounded-lg font-medium text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>Open voucher ledger</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
