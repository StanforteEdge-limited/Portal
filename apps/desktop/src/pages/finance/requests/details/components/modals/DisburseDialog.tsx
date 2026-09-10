import { useEffect, useState } from "react";
import {
  Button,
  Icon,
  MediaPickerModal,
  SelectField,
  TextAreaField,
  TextField,
} from "@/shared";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { useRequestDetails } from "../../context";
import type { DeductionLine } from "../../context";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap";

export function DisburseDialog() {
  const trapRef = useFocusTrap(true, () => closeDisburseDialog());
  const {
    request,
    requestData,
    disburseMode,
    disburseForm,
    setDisburseForm,
    disburseFiles,
    setDisburseFiles,
    disburseDeductions,
    setDisburseDeductions,
    financeAccounts,
    actionBusy,
    financeProgress,
    showDisbursementMediaPicker,
    setShowDisbursementMediaPicker,
    closeDisburseDialog,
    handleWorkflowAction,
    currentUserId,
  } = useRequestDetails();

  const [deductionsOpen, setDeductionsOpen] = useState(false);
  const [grossAmount, setGrossAmount] = useState(disburseForm.amount);
  const [grossAmountEdited, setGrossAmountEdited] = useState(false);

  const { data: contactsData } = useCachedQuery(
    "finance:contacts:vendors",
    () => financeApi.listContacts({ contact_type: "vendor", per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const vendors: any[] = Array.isArray(contactsData?.result) ? contactsData.result : [];

  const { data: deductionTypesData } = useCachedQuery(
    "finance:deduction-types:active",
    () => financeApi.listDeductionTypes({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const deductionTypes: any[] = Array.isArray(deductionTypesData)
    ? deductionTypesData
    : [];

  useEffect(() => {
    if (grossAmountEdited) return;
    syncGross(disburseForm.amount);
  }, [disburseForm.amount, grossAmountEdited]);

  function syncGross(value: string) {
    setGrossAmount(value);
    setDisburseDeductions((prev) =>
      prev.map((line) => ({
        ...line,
        gross_amount: Number(value) || 0,
        deduction_amount:
          Math.round((Number(value) || 0) * line.rate * 100) / 100,
      })),
    );
  }

  function addLine() {
    setDisburseDeductions((prev) => [
      ...prev,
      {
        deduction_type_id: "",
        rate: 0,
        gross_amount: Number(grossAmount) || 0,
        deduction_amount: 0,
      },
    ]);
  }

  function removeLine(index: number) {
    setDisburseDeductions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(
    index: number,
    field: keyof DeductionLine,
    value: string | number,
  ) {
    setDisburseDeductions((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === "deduction_type_id") {
          const type = deductionTypes.find((t: any) => t.id === value);
          if (type) {
            updated.rate = Number(type.rate);
            updated.deduction_amount =
              Math.round(
                (Number(grossAmount) || 0) * Number(type.rate) * 100,
              ) / 100;
          }
        }
        if (field === "rate") {
          updated.deduction_amount =
            Math.round((Number(grossAmount) || 0) * Number(value) * 100) / 100;
        }
        return updated;
      }),
    );
  }

  const totalDeducted = disburseDeductions.reduce(
    (s, l) => s + l.deduction_amount,
    0,
  );
  const netPayable = (Number(grossAmount) || 0) - totalDeducted;

  return (
    <>
      <div ref={trapRef} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4">
        <button
          type="button"
          aria-label="Close disbursement dialog"
          className="absolute inset-0"
          onClick={() => closeDisburseDialog()}
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
                  {disburseMode === "edit"
                    ? "Edit Payment Voucher"
                    : "Disburse Request"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {disburseMode === "edit"
                    ? "Update the existing payment voucher without creating a new disbursement."
                    : "Capture the disbursement record, finance account, transaction reference, and supporting evidence."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeDisburseDialog()}
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
                label="Amount (Net Paid)"
                type="number"
                min="0"
                value={disburseForm.amount}
                onChange={(event) =>
                  setDisburseForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder={String(request?.total_amount ?? "")}
                helpText="Enter the cash actually paid out. If tax is withheld, add the gross amount under Statutory Deductions."
              />
              <SelectField
                label="Method"
                value={disburseForm.method}
                onChange={(event) =>
                  setDisburseForm((current) => ({
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
                value={disburseForm.transaction_ref}
                onChange={(event) =>
                  setDisburseForm((current) => ({
                    ...current,
                    transaction_ref: event.target.value,
                  }))
                }
                placeholder="Bank reference / voucher ref"
              />
              <TextField
                label="Disbursement Date"
                type="date"
                value={disburseForm.disbursed_at}
                onChange={(event) =>
                  setDisburseForm((current) => ({
                    ...current,
                    disbursed_at: event.target.value,
                  }))
                }
              />
              <SelectField
                label="Paid From Account"
                value={disburseForm.paid_from_account_id}
                onChange={(event) =>
                  setDisburseForm((current) => ({
                    ...current,
                    paid_from_account_id: event.target.value,
                  }))
                }
              >
                <option value="">Select finance account</option>
                {(financeAccounts ?? []).map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.code ? ` (${account.code})` : ""}
                  </option>
                ))}
              </SelectField>
              {!financeAccounts?.length ? (
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
                value={disburseForm.note}
                onChange={(event) =>
                  setDisburseForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            {/* Payee / Vendor */}
            <div className="mt-4">
              <SelectField
                label="Payee / Vendor"
                value={disburseForm.contact_id}
                onChange={(e) =>
                  setDisburseForm((f) => ({
                    ...f,
                    contact_id: e.target.value,
                  }))
                }
              >
                <option value="">— None (not a vendor payment) —</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.company_name ? ` — ${v.company_name}` : ""}
                  </option>
                ))}
              </SelectField>
            </div>

            {/* Statutory Deductions */}
            <div className="mt-4 rounded-[22px] border border-slate-200">
              <button
                type="button"
                onClick={() => setDeductionsOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-[22px] transition"
              >
                <span className="flex items-center gap-2">
                  Statutory Deductions
                  {disburseDeductions.length > 0 && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-900">
                      {disburseDeductions.length}
                    </span>
                  )}
                </span>
                <Icon
                  name={deductionsOpen ? "expand_less" : "expand_more"}
                  className="text-slate-400"
                />
              </button>

              {deductionsOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                  {/* Gross Amount */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Gross Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                      value={grossAmount}
                      onChange={(e) => {
                        setGrossAmountEdited(true);
                        syncGross(e.target.value);
                      }}
                      placeholder={disburseForm.amount || "Enter gross amount"}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Gross amount before WHT/VAT/other statutory deductions.
                    </p>
                  </div>

                  {/* Deduction lines */}
                  <div className="space-y-3">
                    {disburseDeductions.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-white p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">
                            Line {i + 1}
                          </span>
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
                            <label className="mb-1 block text-xs text-slate-500">
                              Deduction Type
                            </label>
                            <select
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                              value={line.deduction_type_id}
                              onChange={(e) =>
                                updateLine(
                                  i,
                                  "deduction_type_id",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select type</option>
                              {deductionTypes.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({(Number(t.rate) * 100).toFixed(1)}
                                  %)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Rate (decimal)
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max="1"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                              value={line.rate}
                              onChange={(e) =>
                                updateLine(i, "rate", Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="text-slate-500">
                            Deduction Amount
                          </span>
                          <span className="font-semibold text-danger">
                            {formatCurrency(line.deduction_amount, "NGN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addLine}
                    className="text-sm font-semibold text-brand-900 hover:underline"
                  >
                    + Add deduction
                  </button>

                  {disburseDeductions.length > 0 && (
                    <div className="rounded-xl bg-slate-100 px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Gross</span>
                        <span>
                          {formatCurrency(Number(grossAmount) || 0, "NGN")}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium text-danger">
                        <span>Total Deductions</span>
                        <span>− {formatCurrency(totalDeducted, "NGN")}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                        <span>Net Payable</span>
                        <span>{formatCurrency(netPayable, "NGN")}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Net payable should match the Amount (Net Paid) field above.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Evidence Upload
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Attach transfer proof, voucher support, or any disbursement
                    evidence.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowDisbursementMediaPicker(true)}
                >
                  {disburseFiles.length
                    ? "Change Evidence Files"
                    : "Pick Evidence Files"}
                </Button>
              </div>
              {disburseFiles.length ? (
                <div className="mt-3 space-y-2">
                  {disburseFiles.map((file) => (
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
                onClick={() => closeDisburseDialog()}
                disabled={actionBusy !== ""}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleWorkflowAction("disburse")}
                disabled={
                  actionBusy !== "" ||
                  (!financeAccounts?.length
                    ? true
                    : !disburseForm.paid_from_account_id)
                }
              >
                {actionBusy === "disburse"
                  ? disburseMode === "edit"
                    ? "Saving..."
                    : "Disbursing..."
                  : disburseMode === "edit"
                    ? "Save Changes"
                    : "Confirm Disbursement"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <MediaPickerModal
        open={showDisbursementMediaPicker}
        onClose={() => setShowDisbursementMediaPicker(false)}
        title="Select Disbursement Evidence"
        multiple
        selectedIds={disburseFiles.map((file) => file.id)}
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
              organization_id:
                String(requestData.organization_id || "") || undefined,
              metadata: { source: "request_disbursement", request_id: request?.id },
            });
            uploadedCount += 1;
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            setDisburseFiles((current) => {
              if (current.some((row) => row.id === uploaded.id)) return current;
              return [
                ...current,
                { id: uploaded.id, file_name: uploaded.file_name },
              ];
            });
          }
        }}
        onSelect={(files) => {
          setDisburseFiles(
            files.map((file) => ({ id: file.id, file_name: file.file_name })),
          );
        }}
      />
    </>
  );
}
