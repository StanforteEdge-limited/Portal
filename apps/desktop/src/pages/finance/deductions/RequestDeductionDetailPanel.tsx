import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter, Button, Chip, useToast } from "@/shared";
import { financeApi } from "@/shared/lib/core";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import type { FinanceRequestDeductionRecord } from "@/shared";

function downloadBase64Pdf(res: { file_name: string; content_base64: string }) {
  const bytes = Uint8Array.from(atob(res.content_base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = res.file_name;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  deduction: FinanceRequestDeductionRecord;
  onClose: () => void;
  onRemit?: () => void;
  onEdit?: (d: FinanceRequestDeductionRecord) => void;
  onEditRemit?: (d: FinanceRequestDeductionRecord) => void;
};

export function RequestDeductionDetailPanel({ deduction: d, onClose, onRemit, onEdit, onEditRemit }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [batchSiblings, setBatchSiblings] = useState<FinanceRequestDeductionRecord[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const isRemitted = d.status === "remitted";

  useEffect(() => {
    if (!isRemitted || !d.remittance_id) {
      setBatchSiblings(null);
      return;
    }
    setBatchLoading(true);
    financeApi
      .listRequestDeductions({ remittance_number: d.remittance_number ?? undefined, per_page: 100 })
      .then((res) => setBatchSiblings(res.items.filter((item) => item.id !== d.id && item.remittance_id === d.remittance_id)))
      .catch(() => setBatchSiblings([]))
      .finally(() => setBatchLoading(false));
  }, [d.id, d.remittance_id, d.remittance_number, isRemitted]);

  async function handleDownloadTrm() {
    setDownloading(true);
    try {
      const res = await financeApi.downloadTrmSlip(String(d.remittance_id ?? d.id));
      downloadBase64Pdf(res as any);
    } catch {
      showToast({ tone: "danger", title: "Download failed", message: "Could not generate TRM slip." });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="md">
      <SlideOverHeader title={`${d.deduction_type_name} — ${d.request_number}`} onClose={onClose} />
      <SlideOverContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-600">Remittance status</span>
            <Chip variant={isRemitted ? "success" : "warning"}>
              {isRemitted ? "Remitted" : "Pending"}
            </Chip>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Request</dt>
              <dd>
                <button
                  type="button"
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => navigate(`/requests/${d.request_id}`)}
                >
                  {d.request_number}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Deduction Type</dt>
              <dd className="font-semibold text-slate-800">
                {d.deduction_type_name} ({d.deduction_type_code})
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Rate</dt>
              <dd className="font-semibold text-slate-800">{(d.rate * 100).toFixed(1)}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Gross Amount</dt>
              <dd className="font-semibold text-slate-800">{formatCurrency(d.gross_amount, "NGN")}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Amount Withheld</dt>
              <dd className="font-semibold text-danger">{formatCurrency(d.amount, "NGN")}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Created By</dt>
              <dd className="text-slate-700">{d.created_by_name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-700">{formatDisplayDate(d.created_at)}</dd>
            </div>
          </dl>

          {isRemitted && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Remittance Details
              </p>
              <dl className="space-y-3 text-sm rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">TRM Reference</dt>
                  <dd className="font-semibold text-slate-800">{d.remittance_number ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Payment Reference</dt>
                  <dd className="font-semibold text-slate-800">{d.remittance_ref ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Remitted On</dt>
                  <dd className="font-semibold text-slate-800">{formatDisplayDate(d.remitted_at)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Paid From</dt>
                  <dd className="font-semibold text-slate-800">{d.paid_from_account?.name ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Remitted By</dt>
                  <dd className="font-semibold text-slate-800">{(d as any).remitted_by?.name ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Payment Voucher</dt>
                  <dd className="font-semibold text-slate-800">{(d as any).payment_voucher?.voucher_number ?? "—"}</dd>
                </div>
                {d.evidence_file && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Evidence</dt>
                    <dd>
                      <a
                        href={d.evidence_file.public_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {d.evidence_file.file_name}
                      </a>
                    </dd>
                  </div>
                )}
                {Array.isArray((d as any).evidence_files) && (d as any).evidence_files.length > 0 ? (
                  <div>
                    <dt className="text-slate-500 mb-1">Evidence Files</dt>
                    <dd className="space-y-1">
                      {(d as any).evidence_files.map((file: any) => (
                        <div key={file.id}>
                          <a href={file.public_url ?? "#"} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
                            {file.file_name}
                          </a>
                        </div>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {d.notes && (
                  <div>
                    <dt className="text-slate-500 mb-1">Notes</dt>
                    <dd className="text-slate-700">{d.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {isRemitted && d.remittance_id && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Other taxes in this payment
              </p>
              {batchLoading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : batchSiblings && batchSiblings.length > 0 ? (
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {batchSiblings.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/requests/${s.request_id}`)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-medium text-slate-700">{s.deduction_type_name}</span>
                        <span className="ml-2 text-xs text-slate-400">{s.request_number}</span>
                      </span>
                      <span className="font-semibold text-danger">{formatCurrency(s.amount, "NGN")}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
                  This payment reference covers only this one tax.
                </p>
              )}
            </div>
          )}

          {!isRemitted && (
            <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              This deduction has not been remitted yet. Click "Remit" below to record payment.
            </p>
          )}
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {!isRemitted && onEdit && (
          <Button variant="secondary" onClick={() => onEdit(d)}>Edit</Button>
        )}
        {!isRemitted && onRemit && (
          <Button onClick={onRemit}>Remit</Button>
        )}
        {isRemitted && onEditRemit && (
          <Button variant="secondary" onClick={() => onEditRemit(d)}>Edit Remittance</Button>
        )}
        {isRemitted && d.remittance_number && (
          <Button onClick={() => void handleDownloadTrm()} disabled={downloading}>
            {downloading ? "Generating…" : "TRM Slip"}
          </Button>
        )}
      </SlideOverFooter>
    </SlideOver>
  );
}
