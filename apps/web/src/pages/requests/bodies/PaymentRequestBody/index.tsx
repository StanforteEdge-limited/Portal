import {
  Button,
  Chip,
  EmptyState,
  Icon,
  MediaPickerModal,
  SectionCard,
  SelectField,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  TextAreaField,
  TextField,
  useToast,
} from "@/shared";
import type { FinancePaymentVoucherRecord } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";
import {
  formatPersonName,
  formatRequestStatus,
  DEFAULT_CERTIFICATE_REASON,
} from "@/pages/requests/request-helpers";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { useMemo, useState } from "react";
import { useRequestDetails } from "../../details/context";

function formatCertificateCurrency(amount: number, currency?: string | null) {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const prefix = currency ? String(currency).toUpperCase() : "NGN";
  return `${prefix} ${formatted}`;
}

async function buildCertificateOfHonorPdf(input: {
  requestLabel: string;
  voucherNumber: string;
  staffName: string;
  amountLabel: string;
  declaration: string;
  reason: string;
  issuedAt: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const marginX = 48;
  let y = 792;

  const write = (
    text: string,
    size = 11,
    isBold = false,
    indent = 0,
    lineGap = 18,
  ) => {
    if (y < 72) y = 792;
    page.drawText(text, {
      x: marginX + indent,
      y,
      size,
      font: isBold ? bold : regular,
    });
    y -= lineGap;
  };

  write("CERTIFICATE OF HONOR", 20, true);
  write("Cash Advance Retirement Declaration", 12, true);
  y -= 12;
  write(`Request: ${input.requestLabel}`, 11, true);
  write(`Payment Voucher: ${input.voucherNumber}`);
  write(`Staff Member: ${input.staffName}`);
  write(`Amount: ${input.amountLabel}`);
  write(`Date: ${input.issuedAt}`);
  y -= 8;
  write("Declaration", 13, true);
  [
    input.declaration ||
      "I hereby certify that the cash advance and/or disbursed funds referenced above were used for official purposes.",
    "Supporting receipts are not available for the full amount because:",
    input.reason || "No additional explanation provided.",
  ].forEach((line) => write(line, 11, false, 12, 16));
  y -= 10;
  write(
    "I accept responsibility for the accuracy of this declaration and understand it will",
    11,
    false,
    12,
    16,
  );
  write(
    "form part of the retirement record for this request.",
    11,
    false,
    12,
    16,
  );
  y -= 18;
  write("Signature: ____________________________", 11, false);
  write("Name: ________________________________", 11, false);

  const bytes = await pdf.save();
  const byteArrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new File(
    [byteArrayBuffer],
    `Certificate_of_Honor_${input.requestLabel.replace(/[\\/]+/g, "-")}.pdf`,
    {
      type: "application/pdf",
    },
  );
}


export function PaymentRequestBody() {
  const {
    request,
    requestData,
    categoryName,
    projectName,
    teamName,
    organizationName,
    requestTags,
    lineItems,
    currentUserId,
    ownerActionsVisible,
    availableActions,
    actionBusy,
    finance,
    financeProgress,
    handleWorkflowAction,
    handleDownloadArtifact,
  } = useRequestDetails();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [certificateBusy, setCertificateBusy] = useState(false);

  if (!request) return null;

  const paymentVouchers = finance.paymentVouchers ?? [];
  const requestId = String(request?.id || "");

  const retireableVoucher = useMemo(
    () =>
      paymentVouchers.find((voucher) => Number(voucher.voucher_balance || 0) > 0) ||
      paymentVouchers[0] ||
      null,
    [paymentVouchers],
  );
  const selectedRetirementVoucher = useMemo(
    () =>
      paymentVouchers.find((voucher) => voucher.id === finance.retireForm.voucher_id) ||
      null,
    [paymentVouchers, finance.retireForm.voucher_id],
  );
  const retirementAmountValue = Number(finance.retireForm.retired_amount || 0);
  const retirementShortfall = selectedRetirementVoucher
    ? Math.max(
        0,
        Number(selectedRetirementVoucher.amount || 0) - retirementAmountValue,
      )
    : 0;

  return (
    <>
      <div className="hidden space-y-6 lg:block">
        <SectionCard
          title="Work Context"
          description="The workstream and ownership context for this request."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Project" value={projectName} tone="neutral" />
            <StatCard label="Team" value={teamName} tone="neutral" />
            <StatCard label="Organization" value={organizationName} tone="neutral" />
          </div>
        </SectionCard>

        <SectionCard
          title="Request Items"
          description="Itemized request costs and supporting notes."
          action={
            <Chip variant="neutral">
              {lineItems.length} item{lineItems.length === 1 ? "" : "s"}
            </Chip>
          }
        >
          {lineItems.length ? (
            <div className="rounded-[22px] border border-slate-200 bg-white">
              <Table caption="Request items">
                <TableHead>
                  <TableHeaderRow>
                    <TableHeaderCell>Item</TableHeaderCell>
                    <TableHeaderCell>Qty</TableHeaderCell>
                    <TableHeaderCell>Unit Price</TableHeaderCell>
                    <TableHeaderCell>Total</TableHeaderCell>
                  </TableHeaderRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950">
                              {item.description || "Untitled item"}
                            </p>
                            {(item.files?.length ?? 0) > 0 ? (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-900/10 text-brand-900"
                                title={`${item.files?.length} attachment${item.files?.length === 1 ? "" : "s"}`}
                              >
                                <Icon name="attach_file" className="text-[16px]" />
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.notes || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {item.quantity ?? 1}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {formatCurrency(item.amount, request.currency)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {formatCurrency(
                          (item.amount ?? 0) * (item.quantity ?? 1),
                          request.currency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No line items"
              description="This request does not include any itemized costs."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Disbursements (Payment Vouchers)"
          description="Track what finance has paid, what remains, and what still needs confirmation or retirement."
          action={
            <Chip variant="neutral">
              {formatCurrency(finance.remainingDisbursement, request.currency)}
            </Chip>
          }
        >
          {paymentVouchers.length ? (
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
                  {paymentVouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left text-sm font-semibold text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                          onClick={() =>
                            finance.canEditVoucher(voucher)
                              ? finance.openVoucherEditor(voucher)
                              : finance.openVoucherPreview(voucher)
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
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {formatCurrency(voucher.amount, request.currency)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-700">
                        {Number(voucher.retired_amount || 0) > 0 ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                            onClick={() => finance.openVoucherPreview(voucher)}
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
                              {formatCurrency(voucher.retired_amount, request.currency)}
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
                              finance.canEditVoucher(voucher)
                                ? finance.openVoucherEditor(voucher)
                                : finance.openVoucherPreview(voucher)
                            }
                          >
                            {finance.canEditVoucher(voucher) ? "View / Edit" : "View"}
                          </Button>
                          {ownerActionsVisible &&
                          availableActions.includes("retire") &&
                          Number(voucher.voucher_balance || 0) > 0 &&
                          Number(voucher.retired_amount || 0) <= 0 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => finance.openRetireDialog(voucher)}
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
      </div>

      <div className="space-y-6 lg:hidden">
        <SectionCard title="Request Items">
        {lineItems.length ? (
          <div className="rounded-[22px] border border-slate-200 bg-white">
            <Table caption="Request items">
              <TableHead>
                <TableHeaderRow>
                  <TableHeaderCell>Item</TableHeaderCell>
                  <TableHeaderCell>Qty</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                </TableHeaderRow>
              </TableHead>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {item.description || "Untitled item"}
                          </p>
                          {(item.files?.length ?? 0) > 0 ? (
                            <Icon
                              name="attach_file"
                              className="text-[15px] text-brand-900"
                            />
                          ) : null}
                        </div>
                        {item.notes ? (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {item.quantity ?? 1}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {formatCurrency(
                        (item.amount ?? 0) * (item.quantity ?? 1),
                        request.currency,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No line items"
            description="This request does not include any itemized costs."
          />
        )}
        </SectionCard>

        {paymentVouchers.length ? (
          <SectionCard title="Payment Vouchers">
          <div className="rounded-[22px] border border-slate-200 bg-white">
            <Table caption="Payment vouchers">
              <TableHead>
                <TableHeaderRow>
                  <TableHeaderCell>PV</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Retirement</TableHeaderCell>
                </TableHeaderRow>
              </TableHead>
              <TableBody>
                {paymentVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                        onClick={() => finance.openVoucherPreview(voucher)}
                      >
                        {voucher.voucher_number}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {formatCurrency(voucher.amount, request.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {Number(voucher.retired_amount || 0) > 0 ? (
                        <button
                          type="button"
                          className="font-semibold text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                          onClick={() => finance.openVoucherPreview(voucher)}
                        >
                          {formatCurrency(voucher.retired_amount, request.currency)}
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </SectionCard>
        ) : null}
      </div>

      {finance.showDisburseDialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4">
          <button
            type="button"
            aria-label="Close disbursement dialog"
            className="absolute inset-0"
            onClick={() => finance.closeDisburseDialog()}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="disburse-request-title"
            className="relative z-[81] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-card"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Finance Action
                  </p>
                  <h2
                    id="disburse-request-title"
                    className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
                  >
                    {finance.disburseMode === "edit"
                      ? "Edit Payment Voucher"
                      : "Disburse Request"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {finance.disburseMode === "edit"
                      ? "Update the existing payment voucher without creating a new disbursement."
                      : "Capture the disbursement record, finance account, transaction reference, and supporting evidence."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => finance.closeDisburseDialog()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                >
                  <Icon name="close" />
                </button>
              </div>
              {financeProgress.label ? (
                <div className="mt-4 rounded-[18px] border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  <div className="font-semibold">{financeProgress.label}</div>
                  <div className="mt-1 text-brand-900/75">
                    {financeProgress.hint}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Amount"
                  type="number"
                  min="0"
                  value={finance.disburseForm.amount}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder={String(request?.total_amount ?? "")}
                />
                <SelectField
                  label="Method"
                  value={finance.disburseForm.method}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </SelectField>
                <TextField
                  label="Transaction Reference"
                  value={finance.disburseForm.transaction_ref}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      transaction_ref: event.target.value,
                    }))
                  }
                  placeholder="Bank reference / voucher ref"
                />
                <TextField
                  label="Disbursement Date"
                  type="date"
                  value={finance.disburseForm.disbursed_at}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      disbursed_at: event.target.value,
                    }))
                  }
                />
                <SelectField
                  label="Paid From Account"
                  value={finance.disburseForm.paid_from_account_id}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      paid_from_account_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Select finance account</option>
                  {(finance.financeAccounts ?? []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                      {account.code ? ` (${account.code})` : ""}
                    </option>
                  ))}
                </SelectField>
                {!finance.financeAccounts?.length ? (
                  <p className="mt-1 text-xs text-amber-700">
                    No active finance account is available. Disbursement cannot
                    continue until one is configured.
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <TextAreaField
                  label="Disbursement Note"
                  helpText="Optional context for the payment voucher and finance trail."
                  value={finance.disburseForm.note}
                  onChange={(event) =>
                    finance.setDisburseForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Evidence Upload
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Attach transfer proof, voucher support, or any
                      disbursement evidence.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => finance.setShowDisbursementMediaPicker(true)}
                  >
                    {finance.disburseFiles.length
                      ? "Change Evidence Files"
                      : "Pick Evidence Files"}
                  </Button>
                </div>
                {finance.disburseFiles.length ? (
                  <div className="mt-3 space-y-2">
                    {finance.disburseFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <Icon
                          name="attach_file"
                          className="text-[16px] text-brand-900"
                        />
                        <span className="flex-1 truncate">{file.file_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">
                    You can select existing uploads or add new evidence here.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => finance.closeDisburseDialog()}
                  disabled={actionBusy !== ""}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleWorkflowAction("disburse")}
                  disabled={
                    actionBusy !== "" ||
                    (!finance.financeAccounts?.length
                      ? true
                      : !finance.disburseForm.paid_from_account_id)
                  }
                >
                  {actionBusy === "disburse"
                    ? finance.disburseMode === "edit"
                      ? "Saving..."
                      : "Disbursing..."
                    : finance.disburseMode === "edit"
                      ? "Save Changes"
                      : "Confirm Disbursement"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {finance.showVoucherPreviewDialog && finance.previewVoucher ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <button
            type="button"
            aria-label="Close payment voucher preview"
            className="absolute inset-0"
            onClick={() => finance.closeVoucherPreview()}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-preview-title"
            className="relative z-[81] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-card"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Payment Voucher
                  </p>
                  <h2
                    id="voucher-preview-title"
                    className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
                  >
                    {finance.previewVoucher.voucher_number}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Read-only voucher details for the requester view.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => finance.closeVoucherPreview()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Amount
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {formatCurrency(finance.previewVoucher.amount, request?.currency)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Retirement
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {formatCurrency(
                      finance.previewVoucher.retired_amount || 0,
                      request?.currency,
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Method:</span>{" "}
                  {finance.previewVoucher.method || "-"}
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Disbursed:</span>{" "}
                  {formatDisplayDate(finance.previewVoucher.disbursed_at)}
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">
                    Retirement status:
                  </span>{" "}
                  {formatRequestStatus(finance.previewVoucher.retirement_status)}
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Note:</span>{" "}
                  {finance.previewVoucher.note || "-"}
                </div>
              </div>
              {finance.previewVoucher.evidence_files?.length ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    Evidence files
                  </div>
                  <div className="mt-3 space-y-2">
                    {finance.previewVoucher.evidence_files.map((file) => (
                      <button
                        type="button"
                        key={file.id}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                        onClick={() =>
                          finance.openVoucherEvidence({
                            name: file.file_name,
                            url: file.public_url || "",
                            mime_type: file.mime_type,
                          })
                        }
                        disabled={!file.public_url}
                      >
                        <span className="truncate">{file.file_name}</span>
                        <span className="text-xs font-semibold text-brand-900">
                          {file.public_url ? "View" : "Unavailable"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {finance.previewVoucher.retirement_files?.length ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    Retirement files
                  </div>
                  <div className="mt-3 space-y-2">
                    {finance.previewVoucher.retirement_files.map((file) => (
                      <button
                        type="button"
                        key={file.id}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                        onClick={() =>
                          finance.openVoucherEvidence({
                            name: file.file_name,
                            url: file.public_url || "",
                            mime_type: file.mime_type,
                          })
                        }
                        disabled={!file.public_url}
                      >
                        <span className="truncate">{file.file_name}</span>
                        <span className="text-xs font-semibold text-brand-900">
                          {file.public_url ? "View" : "Unavailable"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    void handleDownloadArtifact("pv_pdf", finance.previewVoucher?.id)
                  }
                  disabled={actionBusy !== ""}
                >
                  {actionBusy === `download_pv:${finance.previewVoucher.id}`
                    ? "Downloading..."
                    : "Download PV"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => finance.closeVoucherPreview()}
                >
                  Close
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {finance.voucherFilePreview ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <button
            type="button"
            aria-label="Close file preview"
            className="absolute inset-0"
            onClick={() => finance.setVoucherFilePreview(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-file-preview-title"
            className="relative z-[91] flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-card"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  File Preview
                </p>
                <h2
                  id="voucher-file-preview-title"
                  className="mt-2 truncate text-lg font-semibold text-slate-950"
                >
                  {finance.voucherFilePreview.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => finance.setVoucherFilePreview(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              {finance.voucherFilePreview.mime_type?.startsWith("image/") ? (
                <img
                  src={finance.voucherFilePreview.url}
                  alt={finance.voucherFilePreview.name}
                  className="mx-auto max-h-[70vh] rounded-2xl border border-slate-200 bg-white object-contain"
                />
              ) : (
                <iframe
                  src={finance.voucherFilePreview.url}
                  title={finance.voucherFilePreview.name}
                  className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white"
                />
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-3">
                <a
                  href={finance.voucherFilePreview.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary">Open in new tab</Button>
                </a>
                <Button
                  variant="secondary"
                  onClick={() => finance.setVoucherFilePreview(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <MediaPickerModal
        open={finance.showDisbursementMediaPicker}
        onClose={() => finance.setShowDisbursementMediaPicker(false)}
        title="Select Disbursement Evidence"
        multiple
        selectedIds={finance.disburseFiles.map((file) => file.id)}
        loadFiles={async (search) =>
          listFileAssets({
            include_usage: true,
            per_page: 200,
            search,
            uploaded_by: currentUserId,
          })
        }
        uploadFiles={async (files, onProgress) => {
          const total = files.length;
          let uploadedCount = 0;
          for (const file of Array.from(files)) {
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            const uploaded = await uploadFileAsset(file, {
              organization_id: String(requestData.organization_id || "") || undefined,
              metadata: { source: "request_disbursement", request_id: requestId },
            });
            uploadedCount += 1;
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            finance.setDisburseFiles((current) => {
              if (current.some((row) => row.id === uploaded.id)) return current;
              return [...current, { id: uploaded.id, file_name: uploaded.file_name }];
            });
          }
        }}
        onSelect={(files) => {
          finance.setDisburseFiles(
            files.map((file) => ({ id: file.id, file_name: file.file_name })),
          );
        }}
      />
      <MediaPickerModal
        open={finance.showRetirementMediaPicker}
        onClose={() => finance.setShowRetirementMediaPicker(false)}
        title="Select Retirement Files"
        multiple
        selectedIds={finance.retireForm.retirement_file_ids}
        loadFiles={async (search) =>
          listFileAssets({
            include_usage: true,
            per_page: 200,
            search,
            uploaded_by: currentUserId,
          })
        }
        uploadFiles={async (files, onProgress) => {
          const total = files.length;
          let uploadedCount = 0;
          for (const file of Array.from(files)) {
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            const uploaded = await uploadFileAsset(file, {
              organization_id: String(requestData.organization_id || "") || undefined,
              metadata: { source: "request_retirement", request_id: requestId },
            });
            uploadedCount += 1;
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            finance.setRetireForm((current) => ({
              ...current,
              retirement_file_ids: Array.from(
                new Set([...current.retirement_file_ids, uploaded.id]),
              ),
            }));
          }
        }}
        onSelect={(files) => {
          finance.setRetireForm((current) => ({
            ...current,
            retirement_file_ids: files.map((file) => file.id),
          }));
        }}
      />

      {finance.showRetireDialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <button
            type="button"
            aria-label="Close retirement dialog"
            className="absolute inset-0"
            onClick={() => finance.closeRetireDialog()}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="retire-request-title"
            className="relative z-[81] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-card"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Requester Action
                  </p>
                  <h2
                    id="retire-request-title"
                    className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
                  >
                    Submit Retirement
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Attach receipts and confirm how the disbursed amount was
                    used.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => finance.closeRetireDialog()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                >
                  <Icon name="close" />
                </button>
              </div>
              {retireableVoucher ? (
                <div className="mt-4 rounded-[18px] border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  <div className="font-semibold">
                    Voucher {retireableVoucher.voucher_number}
                  </div>
                  <div className="mt-1 text-brand-900/75">
                    Disbursed {formatCurrency(retireableVoucher.amount, request?.currency)} •
                    Remaining{" "}
                    {formatCurrency(
                      retireableVoucher.voucher_balance,
                      request?.currency,
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <SelectField
                label="Payment Voucher"
                value={finance.retireForm.voucher_id}
                onChange={(event) => {
                  const next = paymentVouchers.find(
                    (voucher) => voucher.id === event.target.value,
                  );
                  finance.setRetireForm((current) => ({
                    ...current,
                    voucher_id: event.target.value,
                    retired_amount: next
                      ? String(next.voucher_balance || next.amount || "")
                      : current.retired_amount,
                    retirement_file_ids: next
                      ? current.retirement_file_ids
                      : current.retirement_file_ids,
                  }));
                }}
              >
                <option value="">Select voucher</option>
                {paymentVouchers.map((voucher) => (
                  <option key={voucher.id} value={voucher.id}>
                    {voucher.voucher_number} (
                    {formatCurrency(voucher.voucher_balance, request?.currency)} remaining)
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Retirement Amount"
                type="number"
                min="0"
                value={finance.retireForm.retired_amount}
                onChange={(event) =>
                  finance.setRetireForm((current) => ({
                    ...current,
                    retired_amount: event.target.value,
                  }))
                }
                placeholder={
                  retireableVoucher
                    ? String(retireableVoucher.voucher_balance || retireableVoucher.amount || "")
                    : ""
                }
              />

              {retirementShortfall > 0 ? (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Refund Required: {formatCurrency(retirementShortfall, request?.currency)}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    You retired less than disbursed. Provide refund details below or upload
                    refund evidence in Retirement Files.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Refund Amount"
                      type="number"
                      min="0"
                      value={finance.retireForm.refund_amount}
                      onChange={(event) =>
                        finance.setRetireForm((current) => ({
                          ...current,
                          refund_amount: event.target.value,
                        }))
                      }
                      placeholder={String(retirementShortfall)}
                    />
                    <SelectField
                      label="Refund Method"
                      value={finance.retireForm.refund_method}
                      onChange={(event) =>
                        finance.setRetireForm((current) => ({
                          ...current,
                          refund_method: event.target.value,
                        }))
                      }
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash_deposit">Cash Deposit</option>
                      <option value="cash_handin">Cash Hand-in</option>
                    </SelectField>
                    <TextField
                      label="Refund Reference"
                      value={finance.retireForm.refund_reference}
                      onChange={(event) =>
                        finance.setRetireForm((current) => ({
                          ...current,
                          refund_reference: event.target.value,
                        }))
                      }
                      placeholder="Txn ref / teller / receipt no"
                    />
                    <TextField
                      label="Refund Date"
                      type="date"
                      value={finance.retireForm.refund_date}
                      onChange={(event) =>
                        finance.setRetireForm((current) => ({
                          ...current,
                          refund_date: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              <TextAreaField
                label="Retirement Notes"
                helpText="Add receipts context, what was spent, and any important explanation."
                value={finance.retireForm.notes}
                onChange={(event) => {
                  const nextNotes = event.target.value;
                  finance.setRetireForm((current) => ({
                    ...current,
                    notes: nextNotes,
                  }));
                  finance.setRetirementCertificateForm((current) => {
                    const currentReason = current.reason.trim();
                    const shouldMirrorNotes =
                      !currentReason || currentReason === DEFAULT_CERTIFICATE_REASON;
                    return shouldMirrorNotes
                      ? {
                          ...current,
                          reason: nextNotes.trim() || DEFAULT_CERTIFICATE_REASON,
                        }
                      : current;
                  });
                }}
                rows={4}
              />

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Retirement Files
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Attach receipts, invoices, and proof of expenditure.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => finance.setShowRetirementMediaPicker(true)}
                  >
                    {finance.retireForm.retirement_file_ids.length
                      ? "Manage Retirement Files"
                      : "Pick Retirement Files"}
                  </Button>
                </div>
                {finance.retireForm.retirement_file_ids.length ? (
                  <div className="mt-3 text-xs text-slate-500">
                    {finance.retireForm.retirement_file_ids.length} file(s) selected
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">
                    No retirement files selected yet.
                  </div>
                )}
                <div className="mt-4 rounded-[18px] border border-brand-200 bg-brand-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-950">
                        Certificate of Honor
                      </p>
                      <p className="mt-1 text-sm leading-6 text-brand-900/80">
                        Use this when receipts are unavailable. Add it only if
                        the retirement needs a declaration or explanation.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        finance.setShowCertificateHonorForm((current) => !current)
                      }
                    >
                      {finance.showCertificateHonorForm
                        ? "Hide Certificate"
                        : "Add Certificate"}
                    </Button>
                  </div>
                  {finance.showCertificateHonorForm ? (
                    <div className="mt-4 grid gap-4">
                      <TextAreaField
                        label="Certificate declaration"
                        helpText="This statement will be printed into the generated certificate."
                        value={finance.retirementCertificateForm.declaration}
                        onChange={(event) =>
                          finance.setRetirementCertificateForm((current) => ({
                            ...current,
                            declaration: event.target.value,
                          }))
                        }
                        rows={4}
                      />
                      <TextAreaField
                        label="Why receipts are unavailable"
                        helpText="Explain the cash-advance, discount, missing receipt, or other reason for honoring the retirement without full receipt support."
                        value={finance.retirementCertificateForm.reason}
                        onChange={(event) =>
                          finance.setRetirementCertificateForm((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        rows={4}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-brand-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Prepared by
                          </div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {formatPersonName(user)}
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-brand-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Certificate status
                          </div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {finance.retireForm.retirement_file_ids.length
                              ? "Attached to retirement"
                              : "Not yet attached"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (!finance.retireForm.voucher_id) {
                              showToast({
                                title: "Select a voucher first",
                                message:
                                  "Choose the payment voucher before generating the certificate.",
                                tone: "danger",
                              });
                              return;
                            }
                            void (async () => {
                              try {
                                setCertificateBusy(true);
                                const selectedVoucher =
                                  paymentVouchers.find(
                                    (voucher) =>
                                      voucher.id === finance.retireForm.voucher_id,
                                  ) || retireableVoucher;
                                if (!selectedVoucher) {
                                  throw new Error("Select a payment voucher first.");
                                }
                                const file = await buildCertificateOfHonorPdf({
                                  requestLabel:
                                    request?.request_number || `Request ${requestId}`,
                                  voucherNumber: selectedVoucher.voucher_number,
                                  staffName: formatPersonName(user),
                                  amountLabel: formatCertificateCurrency(
                                    Number(
                                      finance.retireForm.retired_amount ||
                                        selectedVoucher.voucher_balance ||
                                        selectedVoucher.amount ||
                                        0,
                                    ),
                                    request?.currency,
                                  ),
                                  declaration:
                                    finance.retirementCertificateForm.declaration.trim(),
                                  reason:
                                    finance.retirementCertificateForm.reason.trim() ||
                                    finance.retireForm.notes.trim() ||
                                    DEFAULT_CERTIFICATE_REASON,
                                  issuedAt: new Date().toISOString().slice(0, 10),
                                });
                                const uploaded = await uploadFileAsset(file, {
                                  organization_id:
                                    String(requestData.organization_id || "") ||
                                    undefined,
                                  metadata: {
                                    source: "request_retirement_certificate",
                                    request_id: requestId,
                                    voucher_id: selectedVoucher.id,
                                  },
                                });
                                finance.setRetireForm((current) => ({
                                  ...current,
                                  retirement_file_ids: Array.from(
                                    new Set([
                                      ...current.retirement_file_ids,
                                      uploaded.id,
                                    ]),
                                  ),
                                }));
                                showToast({
                                  title: "Certificate attached",
                                  message:
                                    "The Certificate of Honor has been generated and added to the retirement files.",
                                  tone: "success",
                                });
                              } catch (error) {
                                showToast({
                                  title: "Certificate generation failed",
                                  message:
                                    error instanceof Error
                                      ? error.message
                                      : "We couldn't generate the certificate right now.",
                                  tone: "danger",
                                });
                              } finally {
                                setCertificateBusy(false);
                              }
                            })();
                          }}
                          disabled={
                            actionBusy !== "" ||
                            certificateBusy ||
                            !finance.retireForm.voucher_id
                          }
                        >
                          {certificateBusy
                            ? "Generating..."
                            : "Generate & Attach Certificate"}
                        </Button>
                      </div>
                      <p className="text-xs leading-5 text-brand-900/75">
                        The generated certificate will be downloadable with the
                        request and can still sit alongside any scanned signed
                        copy you upload manually.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => finance.closeRetireDialog()}
                  disabled={actionBusy !== ""}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleWorkflowAction("retire")}
                  disabled={actionBusy !== "" || !finance.retireForm.voucher_id}
                >
                  {actionBusy === "retire" ? "Submitting..." : "Submit Retirement"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
