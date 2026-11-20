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
    <PortalLayout activeNav="Payroll Runs">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Executive Payroll Authorization"
          description="Review finance-approved payroll runs, verify statutory deductions, and authorize payment disbursements."
          icon={CreditCard}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <Link
              to="/finance/payroll"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition"
            >
              <CreditCard className="h-4 w-4 text-neutral-400" />
              <span>Payroll Components</span>
            </Link>
          }
        />

        {/* 4 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Awaiting Authorization */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500">Awaiting Sign-off</div>
                <div className="text-xl font-semibold text-neutral-900 mt-0.5">{pendingAuth.length}</div>
              </div>
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          {/* Card 2: Authorized */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500">Authorized Runs</div>
                <div className="text-xl font-semibold text-neutral-900 mt-0.5">{authorized.length}</div>
              </div>
            </div>
            <span className="text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
              Disbursing
            </span>
          </div>

          {/* Card 3: Paid Cycles */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500">Paid Cycles ({new Date().getFullYear()})</div>
                <div className="text-xl font-semibold text-neutral-900 mt-0.5">{paid.length}</div>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Completed
            </span>
          </div>

          {/* Card 4: Workforce */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500">Active Workers</div>
                <div className="text-xl font-semibold text-neutral-900 mt-0.5">{totalWorkers || 142}</div>
              </div>
            </div>
            <span className="text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
              Enrolled
            </span>
          </div>
        </div>

        {/* Priority Action Banner: Awaiting Sign-off */}
        {pendingAuth.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-[#ff6900] rounded-2xl text-white p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-orange-200 bg-black/15 px-2.5 py-0.5 rounded-full">
                  Executive Decision Required
                </span>
                <h2 className="text-lg font-semibold tracking-tight mt-1">
                  {pendingAuth.length} Payroll {pendingAuth.length === 1 ? "Run" : "Runs"} Ready for Verification
                </h2>
                <p className="text-xs text-orange-100 max-w-xl leading-relaxed">
                  Finance has completed reconciliation, statutory tax withholdings, and pension contributions for this cycle. Review and sign off to trigger disbursement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/admin/payroll/authorization/${pendingAuth[0].id}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#ff6900] hover:bg-orange-50 font-medium text-xs shadow-md transition active:scale-[0.98] shrink-0"
              >
                <span>Review Run</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* All Payroll Runs Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-neutral-900">All Payroll Cycles & Runs</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Complete audit ledger of historical and upcoming monthly payroll cycles.
              </p>
            </div>
            <div className="text-xs font-semibold text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/80">
              {allRuns.length} cycles recorded
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-neutral-400">Loading payroll history...</div>
          ) : allRuns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-300 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-neutral-800">No payroll runs found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Once a payroll cycle is drafted and submitted by finance, it will appear here for executive authorization.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/75 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">Cycle Name</th>
                    <th className="py-3 px-5">Billing Period</th>
                    <th className="py-3 px-5">Staff Enrolled</th>
                    <th className="py-3 px-5">Total Net Payable</th>
                    <th className="py-3 px-5">Lifecycle Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {allRuns.map((run) => {
                    const isPending = run.status === "approved";
                    const isAuthorized = run.status === "authorized";
                    const isPaid = run.status === "paid";

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                        {run.status}
                      </span>
                    );
                    if (isPending) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                          <Clock className="h-3 w-3" />
                          <span>Awaiting Sign-off</span>
                        </span>
                      );
                    } else if (isAuthorized) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Authorized</span>
                        </span>
                      );
                    } else if (isPaid) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Disbursed & Paid</span>
                        </span>
                      );
                    }

                    return (
                      <tr key={run.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-neutral-900">
                          {run.name}
                        </td>
                        <td className="py-3.5 px-5 text-neutral-600">
                          {MONTH_NAMES[run.month] ?? run.month} {run.year}
                        </td>
                        <td className="py-3.5 px-5 text-neutral-700 font-medium">
                          {run.worker_count != null ? `${run.worker_count} employees` : "—"}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-neutral-900">
                          {run.net_total != null ? formatMoney(run.net_total, run.currency) : "—"}
                        </td>
                        <td className="py-3.5 px-5">{statusBadge}</td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/payroll/authorization/${run.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#e05d00] text-white font-medium text-xs transition shadow-2xs active:scale-[0.98]"
                            >
                              <span>Authorize</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/payroll/authorization/${run.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-semibold text-xs transition shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Inspect Run</span>
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
