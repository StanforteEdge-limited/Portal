import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import type { FinancePaymentVoucherRecord } from "@stanforte/shared";
import {
  Receipt,
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
  ExternalLink,
  Download,
  Paperclip,
  Percent,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

type Props = {
  voucher: FinancePaymentVoucherRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onManageDeductions: () => void;
};

export default function PaymentVoucherDetailSlideOver({
  voucher,
  isOpen,
  onClose,
  onManageDeductions,
}: Props) {
  if (!voucher) return null;

  const retStatus = String(voucher.retirement_status || "pending").toLowerCase();
  const isConfirmed = retStatus === "verified";
  const isRetired = retStatus === "retired";
  const isPartial = retStatus === "partial";

  const getStatusBadge = () => {
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed / Verified
        </span>
      );
    }
    if (isRetired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Retired (Awaiting Verification)
        </span>
      );
    }
    if (isPartial) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <AlertCircle className="h-3.5 w-3.5" />
          Partially Retired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="h-3.5 w-3.5" />
        Retirement Pending
      </span>
    );
  };

  const deductions = voucher.deductions || [];
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + Number(d.deduction_amount || 0),
    0
  );

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} size="xl">
      <SlideOverHeader
        title={voucher.voucher_number}
        subtitle="Payment voucher breakdown, source account, and retirement reconciliations"
        onClose={onClose}
      />

      <SlideOverContent className="space-y-6">
        {/* Status & Quick Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Retirement Status
            </span>
            {getStatusBadge()}
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Disbursed On
            </span>
            <span className="text-xs font-bold text-slate-800">
              {formatDisplayDate(voucher.disbursed_at)}
            </span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Amount Disbursed
            </span>
            <div className="text-lg font-black text-slate-900 mt-1 font-headline">
              {formatCurrency(voucher.amount, "NGN")}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">
              Net payout executed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Amount Retired
            </span>
            <div className="text-lg font-black text-emerald-700 mt-1 font-headline">
              {formatCurrency(voucher.retired_amount || 0, "NGN")}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">
              Documented expense receipts
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Voucher Balance
            </span>
            <div className="text-lg font-black text-amber-700 mt-1 font-headline">
              {formatCurrency(voucher.voucher_balance ?? (voucher.amount - (voucher.retired_amount || 0)), "NGN")}
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">
              Awaiting retirement
            </span>
          </div>
        </div>

        {/* Disbursement Source & Method */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="h-4 w-4 text-[#ff6900]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Disbursement Details
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Source Account</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {voucher.paid_from_account?.name || "Corporate Treasury Account"}
              </span>
              {voucher.paid_from_account?.code && (
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  GL Code: {voucher.paid_from_account.code}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Payment Method</span>
              <span className="font-bold text-slate-800 capitalize mt-0.5 block">
                {(voucher.method || "bank_transfer").replace(/_/g, " ")}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Transaction Reference</span>
              <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                {voucher.transaction_ref || "N/A (Direct Debit / Check)"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Retirement Date</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {voucher.retired_at ? formatDisplayDate(voucher.retired_at) : "Pending submission"}
              </span>
            </div>
          </div>

          {voucher.note && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-medium block">Notes & Narration</span>
              <p className="text-xs text-slate-700 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {voucher.note}
              </p>
            </div>
          )}
        </div>

        {/* Request Context */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Related Requisition
              </h4>
            </div>
            <Link
              to={`/finance/requests/${voucher.request_id}`}
              className="text-xs font-bold text-[#ff6900] hover:underline flex items-center gap-1"
            >
              Open Request <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Requisition Number</span>
              <span className="font-bold text-slate-900 font-headline mt-0.5 block">
                {voucher.request_number}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Requester / Officer</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-[#ff6900] font-bold text-[10px] flex items-center justify-center">
                  {(voucher.request_creator_name || "ST").slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-slate-800">
                  {voucher.request_creator_name || "Staff Member"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Requisition Total</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {formatCurrency(voucher.request_total_amount || voucher.amount, "NGN")}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Workflow Type</span>
              <span className="font-bold text-slate-800 capitalize mt-0.5 block">
                {(voucher.request_type || "Finance Requisition").replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Deductions & WHT Section */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Statutory Deductions & WHT
              </h4>
            </div>
            <button
              type="button"
              onClick={onManageDeductions}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200/60 transition"
            >
              Configure Deductions
            </button>
          </div>

          {deductions.length > 0 ? (
            <div className="space-y-2">
              {deductions.map((d, i) => (
                <div
                  key={d.id || i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {d.deduction_type_name || "Statutory WHT"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Rate: {d.rate}% • Base: {formatCurrency(d.gross_amount || voucher.amount, "NGN")}
                    </span>
                  </div>
                  <span className="font-bold text-rose-600 font-mono">
                    -{formatCurrency(d.deduction_amount, "NGN")}
                  </span>
                </div>
              ))}
              <div className="pt-2 flex justify-between text-xs font-bold border-t border-slate-100 text-slate-700">
                <span>Total Deducted</span>
                <span className="text-rose-600">-{formatCurrency(totalDeductions, "NGN")}</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                No statutory deductions applied to this voucher yet.
              </p>
              <button
                type="button"
                onClick={onManageDeductions}
                className="text-xs font-bold text-[#ff6900] hover:underline mt-1.5 inline-block"
              >
                + Add WHT / Tax Deduction
              </button>
            </div>
          )}
        </div>

        {/* Evidence & Receipts */}
        {(voucher.evidence_file || (voucher.evidence_files && voucher.evidence_files.length > 0)) && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Paperclip className="h-4 w-4 text-purple-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Disbursement & Retirement Evidence
              </h4>
            </div>

            <div className="space-y-2">
              {voucher.evidence_file && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {voucher.evidence_file.file_name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        Disbursement Proof
                      </span>
                    </div>
                  </div>
                  {voucher.evidence_file.public_url && (
                    <a
                      href={voucher.evidence_file.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                      title="Download Proof"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {(voucher.evidence_files || []).map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">
                      {file.file_name}
                    </span>
                  </div>
                  {file.public_url && (
                    <a
                      href={file.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOverContent>

      <SlideOverFooter>
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onManageDeductions}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Manage Deductions
            </button>
            <Link
              to={`/finance/requests/${voucher.request_id}`}
              className="px-4 py-2 text-xs font-bold text-white bg-[#ff6900] hover:bg-[#ea580c] rounded-xl shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
            >
              Open Request <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </SlideOverFooter>
    </SlideOver>
  );
}

