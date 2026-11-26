import { useState, useMemo } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { listPayrollRuns, type PayrollRunSummary } from "@/shared/api/payroll-api";
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
} from "lucide-react";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminPayrollAuthorizationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: runsResp, loading, error, refetch } = useCachedQuery(
    "admin:payroll:runs",
    () => listPayrollRuns({ per_page: 100 }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const allRuns: PayrollRunSummary[] = runsResp?.items ?? [];
  const pendingAuth = allRuns.filter((r) => r.status === "approved");
  const authorized = allRuns.filter((r) => r.status === "authorized");
  const paid = allRuns.filter((r) => r.status === "paid" && r.year === new Date().getFullYear());
  const totalWorkers = allRuns.reduce((max, r) => Math.max(max, r.worker_count || 0), 0);

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

  return (
    <PortalLayout activeNav="Payroll">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Payroll authorization"
          description="Review finance-approved payroll runs, verify statutory deductions, and authorize disbursements"
          actions={
            <Link
              to="/finance/payroll"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
            >
              <CreditCard className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Payroll components</span>
            </Link>
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Awaiting sign-off</p>
            <p className={`text-xl sm:text-[28px] leading-tight sm:leading-none font-medium font-headline tabular-nums ${pendingAuth.length > 0 ? "text-[#c2410c]" : "text-neutral-900"}`}>
              {pendingAuth.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Pending executive review</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Authorized runs</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {authorized.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Cleared for disbursement</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Paid cycles ({new Date().getFullYear()})</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {paid.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Completed disbursements</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Active workers</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {totalWorkers.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Enrolled in latest cycle</p>
          </article>
        </div>

        {/* Priority Action Callout: Awaiting Sign-off */}
        {pendingAuth.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] border-l-2 border-l-[#ff6900] p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#c2410c]">
                  Executive sign-off required
                </p>
                <h2 className="text-base font-medium text-neutral-900 font-headline">
                  {pendingAuth.length} payroll {pendingAuth.length === 1 ? "run" : "runs"} ready for verification
                </h2>
                <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
                  Finance has completed reconciliation, statutory tax withholdings, and pension contributions for this cycle. Review and sign off to trigger disbursement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/admin/payroll/authorization/${pendingAuth[0].id}`)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-sm transition-colors duration-150 active:scale-[0.98] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <span>Review run</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* All Payroll Runs Table */}
        <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-neutral-900 font-headline">Payroll cycles and runs</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Audit ledger of historical and upcoming monthly payroll cycles
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-500 tabular-nums shrink-0">
              {allRuns.length} cycles
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-neutral-500">Loading payroll history</div>
          ) : allRuns.length === 0 ? (
            <div className="p-14 text-center">
              <CreditCard className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-neutral-900">No payroll runs found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Once a payroll cycle is drafted and submitted by finance, it will appear here for authorization
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">Cycle name</th>
                    <th className="py-3 px-5">Billing period</th>
                    <th className="py-3 px-5 text-right">Staff enrolled</th>
                    <th className="py-3 px-5 text-right">Total net payable</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {allRuns.map((run) => {
                    const isPending = run.status === "approved";
                    const isAuthorized = run.status === "authorized";
                    const isPaid = run.status === "paid";

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-900/[0.08] capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                        {run.status}
                      </span>
                    );
                    if (isPending) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-600/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Awaiting sign-off
                        </span>
                      );
                    } else if (isAuthorized) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-900/[0.08]">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                          Authorized
                        </span>
                      );
                    } else if (isPaid) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-600/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Disbursed
                        </span>
                      );
                    }

                    return (
                      <tr key={run.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5 font-medium text-neutral-900">
                          {run.name}
                        </td>
                        <td className="py-3.5 px-5 text-xs font-mono text-neutral-500 tabular-nums">
                          {MONTH_NAMES[run.month] ?? run.month} {run.year}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                          {run.worker_count != null ? run.worker_count.toLocaleString() : "—"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-sm font-medium text-neutral-900 tabular-nums">
                          {run.net_total != null ? formatMoney(run.net_total, run.currency) : "—"}
                        </td>
                        <td className="py-3.5 px-5">{statusBadge}</td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/payroll/authorization/${run.id}`)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                            >
                              <span>Authorize</span>
                              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/payroll/authorization/${run.id}`)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-700 hover:bg-neutral-50 font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                            >
                              <Eye className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                              <span>Inspect</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
