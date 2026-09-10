import { useState } from "react";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { Button, useToast } from "@/shared";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";

function downloadBase64Pdf(res: { file_name: string; content_base64: string }) {
  const bytes = Uint8Array.from(atob(res.content_base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = res.file_name;
  a.click();
  URL.revokeObjectURL(url);
}

type DeductionLine = {
  deduction_type_id: string;
  rate: number;
  gross_amount: number;
  deduction_amount: number;
};

type Props = {
  pv: Record<string, any>;
  onClose: () => void;
  onSaved: () => void;
};

export default function PVDeductionsPanel({ pv, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);

  const handleDownloadWhtCert = async (pvDeductionId: string) => {
    setDownloadingCert(pvDeductionId);
    try {
      const res = await financeApi.downloadWhtCertificate(pvDeductionId);
      downloadBase64Pdf(res as any);
    } catch {
      showToast({ tone: "danger", title: "Download failed", message: "Could not generate WHT certificate." });
    } finally {
      setDownloadingCert(null);
    }
  };
  const [lines, setLines] = useState<DeductionLine[]>([]);
  const [grossAmount, setGrossAmount] = useState<string>(String(pv.gross_amount ?? pv.amount ?? ""));

  const { data: deductionTypes } = useCachedQuery(
    "finance:deduction-types:active",
    () => financeApi.listDeductionTypes({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );

  const { data: existing, refetch: refetchExisting } = useCachedQuery(
    `finance:pv-deductions:${pv.id}`,
    () => financeApi.listPVDeductions(pv.id),
    { ttlMs: 0, storage: "memory" },
  );

  const types = Array.isArray(deductionTypes) ? deductionTypes : [];
  const existingLines = Array.isArray(existing) ? existing : [];

  function addLine() {
    setLines((prev) => [
      ...prev,
      { deduction_type_id: "", rate: 0, gross_amount: Number(grossAmount) || 0, deduction_amount: 0 },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof DeductionLine, value: string | number) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === "deduction_type_id") {
          const type = types.find((t: any) => t.id === value);
          if (type) {
            updated.rate = Number(type.rate);
            updated.deduction_amount = Math.round(Number(grossAmount || pv.amount) * Number(type.rate) * 100) / 100;
          }
        }
        if (field === "rate") {
          updated.deduction_amount = Math.round(Number(grossAmount || pv.amount) * Number(value) * 100) / 100;
        }
        if (field === "gross_amount") {
          updated.deduction_amount = Math.round(Number(value) * updated.rate * 100) / 100;
        }
        return updated;
      }),
    );
  }

  function updateGross(value: string) {
    setGrossAmount(value);
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        gross_amount: Number(value) || 0,
        deduction_amount: Math.round((Number(value) || 0) * line.rate * 100) / 100,
      })),
    );
  }

  async function handleSave() {
    if (lines.length === 0) {
      showToast({ tone: "warning", title: "No lines", message: "Add at least one deduction line." });
      return;
    }
    if (lines.some((l) => !l.deduction_type_id || l.rate <= 0)) {
      showToast({ tone: "warning", title: "Incomplete line", message: "All lines need a deduction type and valid rate." });
      return;
    }
    setSaving(true);
    try {
      await financeApi.applyPVDeductions(pv.id, { deductions: lines });
      showToast({ tone: "success", title: "Saved", message: "Deductions applied to voucher." });
      refetchExisting();
      onSaved();
    } catch {
      showToast({ tone: "danger", title: "Save failed", message: "Unable to save deductions." });
    } finally {
      setSaving(false);
    }
  }

  const totalDeducted = lines.reduce((s, l) => s + l.deduction_amount, 0);
  const netAfterDeductions = (Number(grossAmount) || Number(pv.amount) || 0) - totalDeducted;

  return (
    <SlideOver open={true} onClose={onClose} size="lg">
      <SlideOverHeader title={`Deductions — ${pv.voucher_number}`} onClose={onClose} />
      <SlideOverContent>
        <div className="space-y-6">

          {existingLines.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Applied Deductions</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                {existingLines.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {d.deductionType?.name ?? d.deduction_type?.name ?? "—"}
                      <span className="ml-2 text-xs text-slate-400">({(Number(d.rate) * 100).toFixed(1)}%)</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-danger">{formatCurrency(d.deduction_amount, "NGN")}</span>
                      <button
                        type="button"
                        disabled={downloadingCert === d.id}
                        onClick={() => void handleDownloadWhtCert(d.id)}
                        className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50 whitespace-nowrap"
                      >
                        {downloadingCert === d.id ? "Generating…" : "WHT Certificate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Gross Amount</p>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
              value={grossAmount}
              onChange={(e) => updateGross(e.target.value)}
              placeholder="Gross invoice amount"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">New Deduction Lines</p>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-brand-900 hover:underline"
              >
                + Add line
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                No deduction lines. Click "Add line" to begin.
              </p>
            ) : (
              <div className="space-y-3">
                {lines.map((line, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Line {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Deduction Type</label>
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                          value={line.deduction_type_id}
                          onChange={(e) => updateLine(i, "deduction_type_id", e.target.value)}
                        >
                          <option value="">Select type</option>
                          {types.map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({(Number(t.rate) * 100).toFixed(1)}%)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Rate (decimal)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="1"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                          value={line.rate}
                          onChange={(e) => updateLine(i, "rate", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-500">Deduction Amount</span>
                      <span className="font-semibold text-danger">{formatCurrency(line.deduction_amount, "NGN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="rounded-xl bg-slate-100 px-4 py-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Gross</span>
                <span>{formatCurrency(Number(grossAmount) || 0, "NGN")}</span>
              </div>
              <div className="flex justify-between text-danger font-medium">
                <span>Total Deductions</span>
                <span>- {formatCurrency(totalDeducted, "NGN")}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Net Payable</span>
                <span>{formatCurrency(netAfterDeductions, "NGN")}</span>
              </div>
            </div>
          )}
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={() => void handleSave()} disabled={saving || lines.length === 0}>
          Save Deductions
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
