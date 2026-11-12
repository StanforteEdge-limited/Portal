import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import type { FinancePaymentVoucherRecord } from "@stanforte/shared";
import PVDeductionsPanel from "@/pages/finance/deductions/PVDeductionsPanel";
import PaymentVoucherDetailSlideOver from "./PaymentVoucherDetailSlideOver";
import {
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Search,
  Filter,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  Percent,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  CreditCard,
  User,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

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
  const [selectedVoucher, setSelectedVoucher] = useState<FinancePaymentVoucherRecord | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<FinancePaymentVoucherRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Metrics derived from loaded vouchers
  const metrics = useMemo(() => {
    const totalAmount = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const retiredAmount = rows.reduce((acc, r) => acc + Number(r.retired_amount || 0), 0);
    const pendingRetirement = rows.filter(
      (r) => !["verified", "retired"].includes(String(r.retirement_status || "").toLowerCase())
    ).length;
    const confirmedCount = rows.filter(
      (r) => String(r.retirement_status || "").toLowerCase() === "verified"
    ).length;
    const retiredCount = rows.filter(
      (r) => String(r.retirement_status || "").toLowerCase() === "retired"
    ).length;

    const retiredPct = totalAmount > 0 ? Math.round((retiredAmount / totalAmount) * 100) : 0;

    return {
      totalAmount,
      retiredAmount,
      pendingRetirement,
      confirmedCount,
      retiredCount,
      retiredPct,
    };
  }, [rows]);

  const getRetirementBadge = (status?: string | null) => {
    const s = String(status || "pending").toLowerCase();
    switch (s) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confirmed
          </span>
        );
      case "retired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Retired (Pending Audit)
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Pending Retirement
          </span>
        );
    }
  };

  const statusTabs = [
    { label: "All Vouchers", value: "" },
    { label: "Pending Retirement", value: "pending" },
    { label: "Retired", value: "retired" },
    { label: "Partial", value: "partial" },
    { label: "Confirmed", value: "verified" },
  ];

  return (
    <PortalLayout activeNav="Payment Vouchers">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <Link to="/finance" className="hover:text-slate-600 transition">
                Finance & Treasury
              </Link>
              <span>/</span>
              <span className="text-[#ff6900] font-bold">Payment Vouchers</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Payment Vouchers
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Disbursement register, retirement verification, and deduction reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchVouchers}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              title="Refresh register"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#ff6900]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/finance/requests"
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>Finance Requests Queue</span>
            </Link>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Vouchers */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Vouchers
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-headline">
                {total}
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {formatCurrency(metrics.totalAmount, "NGN")} disbursed
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Receipt className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Pending Retirement */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Pending Retirement
              </span>
              <div className="text-2xl font-black text-amber-600 tracking-tight font-headline">
                {metrics.pendingRetirement}
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Awaiting receipts & verification
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Confirmed / Verified */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Confirmed & Verified
              </span>
              <div className="text-2xl font-black text-emerald-600 tracking-tight font-headline">
                {metrics.confirmedCount}
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Audit sign-off completed
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          {/* Card 4: Retirement Progress */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Retirement Rate
              </span>
              <div className="text-2xl font-black text-purple-600 tracking-tight font-headline">
                {metrics.retiredPct}%
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {formatCurrency(metrics.retiredAmount, "NGN")} documented
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter Bar & Status Tabs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
            {statusTabs.map((tab) => {
              const active = filters.retirement_status === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => updateFilter("retirement_status", tab.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search voucher # (e.g. PV-2026-001)..."
                value={filters.voucher_number}
                onChange={(e) => updateFilter("voucher_number", e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900] transition"
              />
            </div>

            {/* Payment Method Filter */}
            <div className="lg:col-span-3">
              <SelectBox
                value={filters.method}
                onChange={(e) => updateFilter("method", e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900] transition"
              >
                <option value="">All Payment Methods</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </SelectBox>
            </div>

            {/* Date Range: From */}
            <div className="lg:col-span-2">
              <DateInput
                
                value={filters.from}
                onChange={(e) => updateFilter("from", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900] transition text-slate-600"
                placeholder="From date"
                title="Disbursed from"
              />
            </div>

            {/* Date Range: To */}
            <div className="lg:col-span-2">
              <DateInput
                
                value={filters.to}
                onChange={(e) => updateFilter("to", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#ff6900] transition text-slate-600"
                placeholder="To date"
                title="Disbursed to"
              />
            </div>

            {/* Clear Button */}
            <div className="lg:col-span-1 flex justify-end">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5"
                  title="Clear all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Vouchers Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                Loading payment vouchers from treasury...
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-headline">
                Unable to load vouchers
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchVouchers}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">
                No payment vouchers found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {hasFilters
                  ? "No vouchers match your current search and filter criteria. Try adjusting your filters."
                  : "Disbursed finance requisitions will automatically generate verified payment vouchers here."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl bg-[#ff6900] text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 pl-6">Voucher & Source</th>
                    <th className="py-3.5 px-4">Request & Requester</th>
                    <th className="py-3.5 px-4">Disbursed Amount</th>
                    <th className="py-3.5 px-4">Disbursed Date</th>
                    <th className="py-3.5 px-4">Retirement Status</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedVoucher(row)}
                    >
                      {/* Column 1: Voucher & Source */}
                      <td className="py-4 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6900] font-bold flex items-center justify-center shrink-0 border border-orange-100 shadow-sm">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-[#ff6900] transition block font-headline">
                              {row.voucher_number}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <span className="capitalize font-medium">
                                {(row.method || "bank_transfer").replace(/_/g, " ")}
                              </span>
                              {row.paid_from_account?.name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[130px]" title={row.paid_from_account.name}>
                                    {row.paid_from_account.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Request & Requester */}
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/finance/requests/${row.request_id}`}
                          className="font-bold text-slate-900 hover:text-[#ff6900] hover:underline transition font-headline block"
                        >
                          {row.request_number}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{row.request_creator_name || "Staff"}</span>
                        </div>
                      </td>

                      {/* Column 3: Disbursed Amount */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 font-headline text-sm">
                          {formatCurrency(row.amount, "NGN")}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Retired: <span className="font-semibold text-emerald-700">{formatCurrency(row.retired_amount || 0, "NGN")}</span>
                        </div>
                      </td>

                      {/* Column 4: Disbursed Date */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">
                          {formatDisplayDate(row.disbursed_at)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {row.request_status ? `Req: ${row.request_status}` : "Disbursed"}
                        </div>
                      </td>

                      {/* Column 5: Retirement Status */}
                      <td className="py-4 px-4">
                        {getRetirementBadge(row.retirement_status)}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-4 px-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDeductionsPV(row)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition"
                            title="Manage Tax & WHT Deductions"
                          >
                            Deductions
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(row)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            View
                          </button>

                          <Link
                            to={`/finance/requests/${row.request_id}`}
                            className="p-1.5 text-slate-400 hover:text-[#ff6900] transition"
                            title="Open Request"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50">
              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{(page - 1) * perPage + 1}</span> to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(page * perPage, total)}
                </span>{" "}
                of <span className="font-bold text-slate-800">{total}</span> payment vouchers
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Per page:</span>
                  <SelectBox
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#ff6900]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </SelectBox>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-2 text-slate-700 font-bold">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-Overs */}
      {selectedVoucher && (
        <PaymentVoucherDetailSlideOver
          voucher={selectedVoucher}
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          onManageDeductions={() => {
            const v = selectedVoucher;
            setSelectedVoucher(null);
            setDeductionsPV(v);
          }}
        />
      )}

      {deductionsPV && (
        <PVDeductionsPanel
          pv={deductionsPV}
          onClose={() => setDeductionsPV(null)}
          onSaved={() => {
            setDeductionsPV(null);
            void fetchVouchers();
          }}
        />
      )}
    </PortalLayout>
  );
}
