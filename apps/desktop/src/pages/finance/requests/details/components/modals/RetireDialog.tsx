import {
  Button,
  Icon,
  MediaPickerModal,
  SelectField,
  TextAreaField,
  TextField,
  useToast,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { formatPersonName } from "@/pages/requests/request-helpers";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";
import { formatCertificateCurrency, buildCertificateOfHonorPdf } from "../../utils/certificate-pdf";
import { updateWorkspaceProfile } from "@/shared/api/workspace-api";
import { useRequestDetails } from "../../context";
import { useAuth } from "@/shared/context/AuthProvider";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap";
import { useState } from "react";

export function RetireDialog() {
  const trapRef = useFocusTrap(true, () => setShowRetireDialog(false));
  const {
    request,
    id,
    requestData,
    retireForm,
    setRetireForm,
    paymentVouchers,
    retireableVoucher,
    retirementShortfall,
    showRetirementMediaPicker,
    setShowRetirementMediaPicker,
    showCertificateHonorForm,
    setShowCertificateHonorForm,
    retirementCertificateForm,
    setRetirementCertificateForm,
    defaultCertificateReason,
    actionBusy,
    setActionBusy,
    setShowRetireDialog,
    handleWorkflowAction,
    currentUserId,
  } = useRequestDetails();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showSignaturePicker, setShowSignaturePicker] = useState(false);
  // Track signature file ID for the current session (may differ from profile until saved)
  const [sessionSignatureFileId, setSessionSignatureFileId] = useState<string | null>(null);
  // The active signature file ID: use session override first, otherwise from user profile
  const signatureFileId: string | undefined =
    sessionSignatureFileId ?? (user as any)?.signature_file_id ?? undefined;
  const signatureUrl: string | null =
    (sessionSignatureFileId ? null : (user as any)?.signature_url) ?? null;

  return (
    <>
      <div ref={trapRef} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
        <button
          type="button"
          aria-label="Close retirement dialog"
          className="absolute inset-0"
          onClick={() => setShowRetireDialog(false)}
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
                  Attach receipts and confirm how the disbursed amount was used.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRetireDialog(false)}
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
                  Disbursed{" "}
                  {formatCurrency(
                    retireableVoucher.amount,
                    request?.currency,
                  )}{" "}
                  • Remaining{" "}
                  {formatCurrency(
                    retireableVoucher.voucher_balance,
                    request?.currency,
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <SelectField
              label="Payment Voucher"
              value={retireForm.voucher_id}
              onChange={(event) => {
                const next = (paymentVouchers ?? []).find(
                  (voucher) => voucher.id === event.target.value,
                );
                setRetireForm((current) => ({
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
              {(paymentVouchers ?? []).map((voucher) => (
                <option key={voucher.id} value={voucher.id}>
                  {voucher.voucher_number} (
                  {formatCurrency(voucher.voucher_balance, request?.currency)}{" "}
                  remaining)
                </option>
              ))}
            </SelectField>

            <TextField
              label="Retirement Amount"
              type="number"
              min="0"
              value={retireForm.retired_amount}
              onChange={(event) =>
                setRetireForm((current) => ({
                  ...current,
                  retired_amount: event.target.value,
                }))
              }
              placeholder={
                retireableVoucher
                  ? String(
                      retireableVoucher.voucher_balance ||
                        retireableVoucher.amount ||
                        "",
                    )
                  : ""
              }
            />

            {retirementShortfall > 0 ? (
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Refund Required:{" "}
                  {formatCurrency(retirementShortfall, request?.currency)}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  You retired less than disbursed. Provide refund details below
                  or upload refund evidence in Retirement Files.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Refund Amount"
                    type="number"
                    min="0"
                    value={retireForm.refund_amount}
                    onChange={(event) =>
                      setRetireForm((current) => ({
                        ...current,
                        refund_amount: event.target.value,
                      }))
                    }
                    placeholder={String(retirementShortfall)}
                  />
                  <SelectField
                    label="Refund Method"
                    value={retireForm.refund_method}
                    onChange={(event) =>
                      setRetireForm((current) => ({
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
                    value={retireForm.refund_reference}
                    onChange={(event) =>
                      setRetireForm((current) => ({
                        ...current,
                        refund_reference: event.target.value,
                      }))
                    }
                    placeholder="Txn ref / teller / receipt no"
                  />
                  <TextField
                    label="Refund Date"
                    type="date"
                    value={retireForm.refund_date}
                    onChange={(event) =>
                      setRetireForm((current) => ({
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
              value={retireForm.notes}
              onChange={(event) => {
                const nextNotes = event.target.value;
                setRetireForm((current) => ({
                  ...current,
                  notes: nextNotes,
                }));
                setRetirementCertificateForm((current) => {
                  const currentReason = current.reason.trim();
                  const shouldMirrorNotes =
                    !currentReason ||
                    currentReason === defaultCertificateReason;
                  return shouldMirrorNotes
                    ? {
                        ...current,
                        reason: nextNotes.trim() || defaultCertificateReason,
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
                  onClick={() => setShowRetirementMediaPicker(true)}
                >
                  {retireForm.retirement_file_ids.length
                    ? "Manage Retirement Files"
                    : "Pick Retirement Files"}
                </Button>
              </div>
              {retireForm.retirement_file_ids.length ? (
                <div className="mt-3 text-xs text-slate-500">
                  {retireForm.retirement_file_ids.length} file(s) selected
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
                      Use this when receipts are unavailable. Add it only if the
                      retirement needs a declaration or explanation.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setShowCertificateHonorForm((current) => !current)
                    }
                  >
                    {showCertificateHonorForm
                      ? "Hide Certificate"
                      : "Add Certificate"}
                  </Button>
                </div>
                {showCertificateHonorForm ? (
                  <div className="mt-4 grid gap-4">
                    <TextAreaField
                      label="Certificate declaration"
                      helpText="This statement will be printed into the generated certificate."
                      value={retirementCertificateForm.declaration}
                      onChange={(event) =>
                        setRetirementCertificateForm((current) => ({
                          ...current,
                          declaration: event.target.value,
                        }))
                      }
                      rows={4}
                    />
                    <TextAreaField
                      label="Why receipts are unavailable"
                      helpText="Explain the cash-advance, discount, missing receipt, or other reason for honoring the retirement without full receipt support."
                      value={retirementCertificateForm.reason}
                      onChange={(event) =>
                        setRetirementCertificateForm((current) => ({
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
                          {retireForm.retirement_file_ids.length
                            ? "Attached to retirement"
                            : "Not yet attached"}
                        </div>
                      </div>
                    </div>
                    {/* Signature upload */}
                    <div className="rounded-[18px] border border-brand-200 bg-white px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Your Signature
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {signatureUrl
                              ? "Signature saved to your profile."
                              : "No signature on file. Upload one to embed it in the certificate."}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowSignaturePicker(true)}
                        >
                          {signatureUrl ? "Change" : "Upload Signature"}
                        </Button>
                      </div>
                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt="Your signature"
                          className="mt-3 h-10 object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (!retireForm.voucher_id) {
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
                              setActionBusy("certificate_honor");
                              const selectedVoucher =
                                (paymentVouchers ?? []).find(
                                  (voucher) =>
                                    voucher.id === retireForm.voucher_id,
                                ) || retireableVoucher;
                              if (!selectedVoucher) {
                                throw new Error(
                                  "Select a payment voucher first.",
                                );
                              }
                              const file = await buildCertificateOfHonorPdf({
                                requestId: id || "",
                                requestLabel:
                                  request?.request_number ||
                                  `Request ${id}`,
                                voucherNumber: selectedVoucher.voucher_number,
                                staffName: formatPersonName(user),
                                amountLabel: formatCertificateCurrency(
                                  Number(
                                    retireForm.retired_amount ||
                                      selectedVoucher.voucher_balance ||
                                      selectedVoucher.amount ||
                                      0,
                                  ),
                                  request?.currency,
                                ),
                                declaration:
                                  retirementCertificateForm.declaration.trim(),
                                reason:
                                  retirementCertificateForm.reason.trim() ||
                                  retireForm.notes.trim() ||
                                  defaultCertificateReason,
                                issuedAt: new Date()
                                  .toISOString()
                                  .slice(0, 10),
                                signatureFileId,
                              });
                              const uploaded = await uploadFileAsset(file, {
                                organization_id:
                                  String(requestData.organization_id || "") ||
                                  undefined,
                                metadata: {
                                  source: "request_retirement_certificate",
                                  request_id: id,
                                  voucher_id: selectedVoucher.id,
                                },
                              });
                              setRetireForm((current) => ({
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
                              setActionBusy("");
                            }
                          })();
                        }}
                        disabled={
                          actionBusy !== "" || !retireForm.voucher_id
                        }
                      >
                        {actionBusy === "certificate_honor"
                          ? "Generating..."
                          : "Generate & Attach Certificate"}
                      </Button>
                    </div>
                    <p className="text-xs leading-5 text-brand-900/75">
                      The generated certificate will be downloadable with the
                      request and can still sit alongside any scanned signed copy
                      you upload manually.
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
                onClick={() => setShowRetireDialog(false)}
                disabled={actionBusy !== ""}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleWorkflowAction("retire")}
                disabled={actionBusy !== "" || !retireForm.voucher_id}
              >
                {actionBusy === "retire"
                  ? "Submitting..."
                  : "Submit Retirement"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <MediaPickerModal
        open={showRetirementMediaPicker}
        onClose={() => setShowRetirementMediaPicker(false)}
        title="Select Retirement Files"
        multiple
        selectedIds={retireForm.retirement_file_ids}
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
              metadata: { source: "request_retirement", request_id: id },
            });
            uploadedCount += 1;
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            setRetireForm((current) => ({
              ...current,
              retirement_file_ids: Array.from(
                new Set([...current.retirement_file_ids, uploaded.id]),
              ),
            }));
          }
        }}
        onSelect={(files) => {
          setRetireForm((current) => ({
            ...current,
            retirement_file_ids: files.map((file) => file.id),
          }));
        }}
      />

      {/* Signature upload picker */}
      <MediaPickerModal
        open={showSignaturePicker}
        onClose={() => setShowSignaturePicker(false)}
        title="Upload Your Signature"
        multiple={false}
        selectedIds={signatureFileId ? [signatureFileId] : []}
        loadFiles={async (search) =>
          listFileAssets({
            include_usage: false,
            per_page: 100,
            search,
            uploaded_by: currentUserId,
          })
        }
        uploadFiles={async (files) => {
          const file = Array.from(files)[0];
          if (!file) return;
          const uploaded = await uploadFileAsset(file, {
            organization_id:
              String(requestData.organization_id || "") || undefined,
            metadata: { source: "profile_signature" },
          });
          setSessionSignatureFileId(uploaded.id);
          // Persist to user profile silently
          try {
            await updateWorkspaceProfile({ signature_file_id: uploaded.id });
          } catch {
            // non-blocking — signature is still usable for the current session
          }
          setShowSignaturePicker(false);
        }}
        onSelect={(files) => {
          const file = files[0];
          if (!file) return;
          setSessionSignatureFileId(file.id);
          // Persist to user profile silently
          updateWorkspaceProfile({ signature_file_id: file.id }).catch(() => {});
          setShowSignaturePicker(false);
        }}
      />
    </>
  );
}
