import { Button, Icon } from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { formatDisplayDate } from "@stanforte/shared";
import { formatRequestStatus } from "@/pages/requests/request-helpers";
import { useRequestDetails } from "../../context";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap";
import { getFileViewUrl } from "@/shared/lib/file-url";

export function VoucherPreviewDialog() {
  const trapRef = useFocusTrap(true, () => setShowVoucherPreviewDialog(false));
  const {
    request,
    previewVoucher,
    actionBusy,
    setShowVoucherPreviewDialog,
    handleDownloadArtifact,
  } = useRequestDetails();

  if (!previewVoucher) return null;

  return (
    <div ref={trapRef} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <button
        type="button"
        aria-label="Close payment voucher preview"
        className="absolute inset-0"
        onClick={() => setShowVoucherPreviewDialog(false)}
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
                {previewVoucher.voucher_number}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Read-only voucher details for the requester view.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVoucherPreviewDialog(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Amount
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {formatCurrency(previewVoucher.amount, request?.currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Retirement
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {formatCurrency(
                  previewVoucher.retired_amount || 0,
                  request?.currency,
                )}
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Method:</span>{" "}
              {previewVoucher.method || "-"}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Account:</span>{" "}
              {previewVoucher.paid_from_account?.name || "-"}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Disbursed:</span>{" "}
              {formatDisplayDate(previewVoucher.disbursed_at)}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">
                Retirement status:
              </span>{" "}
              {formatRequestStatus(previewVoucher.retirement_status)}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Note:</span>{" "}
              {previewVoucher.note || "-"}
            </div>
          </div>
          {previewVoucher.evidence_files?.length ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">
                Evidence files
              </div>
              <div className="mt-3 space-y-2">
                {previewVoucher.evidence_files.map((file: any) => {
                  const url = getFileViewUrl(file);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-2 text-sm text-slate-700"
                    >
                      <span className="truncate">{file.file_name}</span>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0">
                          <Button variant="secondary" size="sm">Open</Button>
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {previewVoucher.retirement_files?.length ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">
                Retirement files
              </div>
              <div className="mt-3 space-y-2">
                {previewVoucher.retirement_files.map((file: any) => {
                  const url = getFileViewUrl(file);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-2 text-sm text-slate-700"
                    >
                      <span className="truncate">{file.file_name}</span>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0">
                          <Button variant="secondary" size="sm">Open</Button>
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {(() => {
            const requestData =
              request?.data as Record<string, unknown> | null;
            const retirement =
              typeof requestData?.retirement === "object" && requestData.retirement
                ? (requestData.retirement as Record<string, unknown>)
                : null;
            const breakdown =
              typeof retirement?.breakdown === "object" && retirement.breakdown
                ? (retirement.breakdown as Record<string, unknown>)
                : null;
            const refund =
              typeof breakdown?.refund === "object" && breakdown.refund
                ? (breakdown.refund as Record<string, unknown>)
                : null;
            const refundAmount =
              typeof refund?.refund_amount === "number"
                ? refund.refund_amount
                : null;
            if (!refund || !refundAmount) return null;
            return (
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-900">
                  Refund
                </div>
                <div className="mt-2 space-y-1 text-sm text-amber-800">
                  <p>
                    <span className="font-medium">Amount:</span>{" "}
                    {formatCurrency(refundAmount, request?.currency)}
                  </p>
                  {refund.refund_method ? (
                    <p>
                      <span className="font-medium">Method:</span>{" "}
                      {String(refund.refund_method)}
                    </p>
                  ) : null}
                  {refund.refund_reference ? (
                    <p>
                      <span className="font-medium">Reference:</span>{" "}
                      {String(refund.refund_reference)}
                    </p>
                  ) : null}
                  {refund.refund_date ? (
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {formatDisplayDate(String(refund.refund_date))}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                void handleDownloadArtifact("pv_pdf", previewVoucher.id)
              }
              disabled={actionBusy !== ""}
            >
              {actionBusy === `download_pv:${previewVoucher.id}`
                ? "Downloading..."
                : "Download PV"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowVoucherPreviewDialog(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
