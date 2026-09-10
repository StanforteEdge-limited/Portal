import {
  Button,
  Chip,
  EmptyState,
  Icon,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { formatDisplayDate } from "@stanforte/shared";
import { formatRequestStatus } from "@/pages/requests/request-helpers";
import { useRequestDetails } from "../../context";

export function PaymentVouchersTable() {
  const {
    request,
    paymentVouchers,
    remainingDisbursement,
    financeActionsVisible,
    ownerActionsVisible,
    availableActions,
    actionBusy,
    canEditVoucher,
    openVoucherEditor,
    openVoucherPreview,
    openRetireDialog,
  } = useRequestDetails();

  return (
    <SectionCard
      title="Disbursements (Payment Vouchers)"
      description="Track what finance has paid, what remains, and what still needs confirmation or retirement."
      action={
        <Chip variant="neutral">
          {formatCurrency(remainingDisbursement, request?.currency)}
        </Chip>
      }
    >
      {(paymentVouchers ?? []).length ? (
        <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
          <Table caption="Payment vouchers">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>PV</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Retirement</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {(paymentVouchers ?? []).map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>
                    <button
                       type="button"
                       className="text-left text-sm font-semibold text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                       onClick={() =>
                         canEditVoucher(voucher)
                           ? openVoucherEditor(voucher)
                           : openVoucherPreview(voucher)
                       }
                     >
                       <span className="inline-flex items-center gap-2">
                         {voucher.evidence_files?.length ? (
                           <Icon
                             name="attach_file"
                             className="text-[15px] text-brand-900"
                           />
                         ) : null}
                         <span>{voucher.voucher_number}</span>
                       </span>
                     </button>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDisplayDate(voucher.disbursed_at)}
                    </div>
                    {voucher.deductions && voucher.deductions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {voucher.deductions.map((d) => {
                          const isRemitted = d.remittance_status === "remitted";
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                const url = d.request_deduction_id
                                  ? `/finance/statutory-deductions?deduction_id=${d.request_deduction_id}`
                                  : "/finance/statutory-deductions";
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900/20 ${
                                isRemitted ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                              }`}
                              title={isRemitted ? "Remitted — open in Statutory Deductions" : "Pending remittance — open in Statutory Deductions"}
                            >
                              <Icon
                                name={isRemitted ? "check_circle" : "schedule"}
                                className="text-[12px]"
                              />
                              {d.deduction_type_code || d.deduction_type_name}: {formatCurrency(d.deduction_amount, request?.currency)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-700">
                    {voucher.gross_amount && voucher.gross_amount !== voucher.amount ? (
                      <div>
                        <div className="text-slate-700">{formatCurrency(voucher.gross_amount, request?.currency)} <span className="text-[10px] text-slate-400 font-normal">(Gross)</span></div>
                        <div className="text-xs text-slate-500 font-normal">Net paid: {formatCurrency(voucher.amount, request?.currency)}</div>
                      </div>
                    ) : (
                      formatCurrency(voucher.amount, request?.currency)
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-700">
                    {Number(voucher.retired_amount || 0) > 0 ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                        onClick={() => openVoucherPreview(voucher)}
                      >
                        <Icon
                          name={
                            voucher.retirement_status === "verified"
                              ? "verified"
                              : "receipt_long"
                          }
                          className="text-[18px] text-brand-900"
                        />
                        <span>
                          {formatCurrency(
                            voucher.retired_amount,
                            request?.currency,
                          )}
                          <span className="ml-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {formatRequestStatus(voucher.retirement_status)}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          canEditVoucher(voucher)
                            ? openVoucherEditor(voucher)
                            : openVoucherPreview(voucher)
                        }
                      >
                        {canEditVoucher(voucher) ? "View / Edit" : "View"}
                      </Button>
                      {ownerActionsVisible &&
                      availableActions.includes("retire") &&
                      Number(voucher.voucher_balance || 0) > 0 &&
                      Number(voucher.retired_amount || 0) <= 0 ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openRetireDialog(voucher)}
                          disabled={actionBusy !== ""}
                        >
                          Retire
                        </Button>
                      ) : null}
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
          description="Once finance disburses, payment vouchers will appear here."
        />
      )}
    </SectionCard>
  );
}
