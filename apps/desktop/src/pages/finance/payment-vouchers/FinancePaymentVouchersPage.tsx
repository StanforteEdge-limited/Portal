import { useState, useEffect, useCallback } from "react";
import {
  Chip,
  EmptyState,
  PageHeader,
  PaginationControls,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  StatCard,
} from "@/shared";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import PVDeductionsPanel from "@/pages/finance/deductions/PVDeductionsPanel";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";
import {
  formatRequestStatus,
} from "@/pages/requests/request-helpers";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import type { FinancePaymentVoucherRecord } from "@stanforte/shared";

function retirementLabel(value: string) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  if (key === "verified") return "Confirmed";
  if (key === "retired") return "Retired";
  if (key === "partial") return "Partial";
  return "Pending";
}

function retirementTone(
  value: string,
): "success" | "warning" | "pending" | "danger" | "neutral" {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  if (key === "verified") return "success";
  if (key === "retired") return "warning";
  if (key === "partial") return "pending";
  return "neutral";
}

type Filters = {
  voucher_number: string;
  retirement_status: string;
  method: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  voucher_number: "",
  retirement_status: "",
  method: "",
  from: "",
  to: "",
};

export default function FinancePaymentVouchersPage() {
  const { user } = useAuth();
  const [deductionsPV, setDeductionsPV] = useState<Record<string, any> | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<FinancePaymentVoucherRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useCachedQuery(
    "finance-vouchers:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, per_page: perPage };
      if (filters.voucher_number) params.voucher_number = filters.voucher_number;
      if (filters.retirement_status) params.retirement_status = filters.retirement_status;
      if (filters.method) params.method = filters.method;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const result = await financeApi.listPaymentVouchers(params);
      setRows((result as any)?.result ?? []);
      setTotal(Number((result as any)?.total ?? 0));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load payment vouchers");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filters]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => { setPage(1); setFilters(EMPTY_FILTERS); };

  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pendingRetirement = rows.filter(
    (row) => !["verified", "retired"].includes(String(row.retirement_status || "").toLowerCase()),
  ).length;
  const confirmed = rows.filter(
    (row) => String(row.retirement_status || "").toLowerCase() === "verified",
  ).length;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-vouchers"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", path: "/" },
          { label: "Finance", path: "/finance" },
          { label: "Payment Vouchers" },
        ]}
        title="Payment Vouchers"
        description="Track disbursements, retirements, and verified vouchers across finance requests."
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Vouchers"
            value={String(total)}
            tone="neutral"
          />
          <StatCard
            label="Pending Retirement"
            value={String(pendingRetirement)}
            tone="warning"
          />
          <StatCard
            label="Confirmed"
            value={String(confirmed)}
            tone="success"
          />
        </div>

        <SectionCard
          title="Voucher Register"
          description="Use this register to follow each voucher from disbursement through retirement verification."
          action={
            <Chip variant="warning">
              {pendingRetirement} pending retirement
            </Chip>
          }
        >
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-slate-500 mb-1">Voucher Number</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Search..."
                value={filters.voucher_number}
                onChange={(e) => updateFilter("voucher_number", e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="block text-xs text-slate-500 mb-1">Retirement Status</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={filters.retirement_status}
                onChange={(e) => updateFilter("retirement_status", e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="retired">Retired</option>
                <option value="partial">Partial</option>
                <option value="verified">Confirmed</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-slate-500 mb-1">Method</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={filters.method}
                onChange={(e) => updateFilter("method", e.target.value)}
              >
                <option value="">All</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={filters.from}
                onChange={(e) => updateFilter("from", e.target.value)}
              />
            </div>
            <div className="min-w-[130px]">
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={filters.to}
                onChange={(e) => updateFilter("to", e.target.value)}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-slate-500 hover:text-slate-800 underline pb-1"
              >
                Clear filters
              </button>
            )}
          </div>
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading payment vouchers...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
              {error}
            </div>
          ) : rows.length ? (
            <div className="rounded-[22px] border border-slate-200 bg-white">
              <Table caption="Payment vouchers">
                <TableHead>
                  <TableHeaderRow>
                    <TableHeaderCell>Voucher</TableHeaderCell>
                    <TableHeaderCell>Request</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                    <TableHeaderCell>Disbursed</TableHeaderCell>
                    <TableHeaderCell>Retirement</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Action
                    </TableHeaderCell>
                  </TableHeaderRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-950">
                          {row.voucher_number}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.method || "Disbursement"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-950">
                          {row.request_number}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.request_creator_name}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {formatCurrency(row.amount, "NGN")}
                        <p className="mt-1 text-xs text-slate-500">
                          Retired: {formatCurrency(row.retired_amount, "NGN")}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {formatDisplayDate(row.disbursed_at)}
                        <p className="mt-1 text-xs text-slate-500">
                          {formatRequestStatus(row.request_status)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Chip variant={retirementTone(row.retirement_status)}>
                          {retirementLabel(row.retirement_status)}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setDeductionsPV(row)}
                            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900 hover:underline"
                          >
                            Deductions
                          </button>
                          <Link
                            to={`/finance/requests/${row.request_id}`}
                            className="text-sm font-semibold text-brand-900 transition hover:underline"
                          >
                            Open request
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No payment vouchers yet"
              description="Disbursed finance requests will create payment vouchers that appear here."
            />
          )}
          {total > 0 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalCount={total}
              perPage={perPage}
              itemLabel="voucher"
              onPageChange={setPage}
              onPerPageChange={(v) => { setPage(1); setPerPage(v); }}
            />
          )}
        </SectionCard>
      </div>

      {deductionsPV && (
        <PVDeductionsPanel
          pv={deductionsPV}
          onClose={() => setDeductionsPV(null)}
          onSaved={() => setDeductionsPV(null)}
        />
      )}
    </AppShell>
  );
}
