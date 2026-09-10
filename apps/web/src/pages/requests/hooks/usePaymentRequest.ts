import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCachedQuery, financeApi } from "@/shared/lib/core";
import type { FinancePaymentVoucherRecord } from "@/shared";
import { DEFAULT_CERTIFICATE_REASON } from "@/pages/requests/request-helpers";

type DisburseForm = {
  amount: string;
  method: string;
  transaction_ref: string;
  paid_from_account_id: string;
  note: string;
  disbursed_at: string;
};

type RetireForm = {
  voucher_id: string;
  retired_amount: string;
  notes: string;
  retirement_file_ids: string[];
  refund_amount: string;
  refund_method: string;
  refund_reference: string;
  refund_date: string;
};

type CertificateForm = {
  declaration: string;
  reason: string;
};

type VoucherFilePreview = {
  name: string;
  url: string;
  mime_type: string | null;
};

export type UsePaymentRequestResult = {
  financeAccounts: any[] | null;
  paymentVouchers: FinancePaymentVoucherRecord[] | null;
  refetchPaymentVouchers: () => void;
  disbursedTotal: number;
  retiredTotal: number;
  remainingDisbursement: number;
  defaultFinanceAccountId: string;
  showDisburseDialog: boolean;
  disburseMode: "create" | "edit";
  editingVoucherId: string;
  disburseForm: DisburseForm;
  setDisburseForm: Dispatch<SetStateAction<DisburseForm>>;
  disburseFiles: Array<{ id: string; file_name: string }>;
  setDisburseFiles: Dispatch<
    SetStateAction<Array<{ id: string; file_name: string }>>
  >;
  showDisbursementMediaPicker: boolean;
  setShowDisbursementMediaPicker: Dispatch<SetStateAction<boolean>>;
  openDisburseDialog: () => void;
  openVoucherEditor: (voucher: FinancePaymentVoucherRecord) => void;
  closeDisburseDialog: () => void;
  canEditVoucher: (voucher: FinancePaymentVoucherRecord) => boolean;
  showVoucherPreviewDialog: boolean;
  previewVoucher: FinancePaymentVoucherRecord | null;
  voucherFilePreview: VoucherFilePreview | null;
  setVoucherFilePreview: Dispatch<SetStateAction<VoucherFilePreview | null>>;
  openVoucherPreview: (voucher: FinancePaymentVoucherRecord) => void;
  openVoucherEvidence: (file: VoucherFilePreview) => void;
  closeVoucherPreview: () => void;
  showRetireDialog: boolean;
  retireForm: RetireForm;
  setRetireForm: Dispatch<SetStateAction<RetireForm>>;
  showRetirementMediaPicker: boolean;
  setShowRetirementMediaPicker: Dispatch<SetStateAction<boolean>>;
  openRetireDialog: (voucher?: FinancePaymentVoucherRecord | null) => void;
  closeRetireDialog: () => void;
  showCertificateHonorForm: boolean;
  setShowCertificateHonorForm: Dispatch<SetStateAction<boolean>>;
  retirementCertificateForm: CertificateForm;
  setRetirementCertificateForm: Dispatch<SetStateAction<CertificateForm>>;
};

const DEFAULT_DISBURSE_FORM: DisburseForm = {
  amount: "",
  method: "bank_transfer",
  transaction_ref: "",
  paid_from_account_id: "",
  note: "",
  disbursed_at: new Date().toISOString().slice(0, 10),
};

function createDefaultRetireForm(): RetireForm {
  return {
    voucher_id: "",
    retired_amount: "",
    notes: "",
    retirement_file_ids: [],
    refund_amount: "",
    refund_method: "bank_transfer",
    refund_reference: "",
    refund_date: new Date().toISOString().slice(0, 10),
  };
}

export function usePaymentRequest(
  requestId: string,
  requestTotal: number,
  availableActions: string[],
  options?: { skip?: boolean },
): UsePaymentRequestResult {
  const skip = options?.skip ?? false;

  const [showDisburseDialog, setShowDisburseDialog] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [showVoucherPreviewDialog, setShowVoucherPreviewDialog] =
    useState(false);
  const [previewVoucher, setPreviewVoucher] =
    useState<FinancePaymentVoucherRecord | null>(null);
  const [voucherFilePreview, setVoucherFilePreview] =
    useState<VoucherFilePreview | null>(null);
  const [disburseMode, setDisburseMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingVoucherId, setEditingVoucherId] = useState("");
  const [disburseForm, setDisburseForm] = useState<DisburseForm>({
    ...DEFAULT_DISBURSE_FORM,
  });
  const [disburseFiles, setDisburseFiles] = useState<
    Array<{ id: string; file_name: string }>
  >([]);
  const [showDisbursementMediaPicker, setShowDisbursementMediaPicker] =
    useState(false);
  const [showRetirementMediaPicker, setShowRetirementMediaPicker] =
    useState(false);
  const [retireForm, setRetireForm] = useState<RetireForm>(
    createDefaultRetireForm(),
  );
  const [showCertificateHonorForm, setShowCertificateHonorForm] =
    useState(false);
  const [retirementCertificateForm, setRetirementCertificateForm] =
    useState<CertificateForm>({
      declaration:
        "I hereby certify that the disbursed funds referenced above were used for official purposes in line with the approved request.",
      reason: DEFAULT_CERTIFICATE_REASON,
    });

  const { data: financeAccounts } = useCachedQuery(
    skip ? "skip:accounts" : "finance:accounts:options",
    skip ? () => Promise.resolve([]) : () => financeApi.listAccounts({ is_active: true }),
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );

  const { data: paymentVouchers, refetch: refetchPaymentVouchers } =
    useCachedQuery(
      skip ? "skip:vouchers" : `requests:detail:payment-vouchers:${requestId || "none"}`,
      skip
        ? () => Promise.resolve([])
        : () =>
            requestId
              ? financeApi.listRequestPaymentVouchers(requestId)
              : Promise.resolve([]),
      { ttlMs: 1000 * 60, storage: "memory" },
    );

  const defaultFinanceAccountId = financeAccounts?.[0]?.id ?? "";

  useEffect(() => {
    if (!showDisburseDialog) return;
    if (disburseMode !== "create") return;
    if (disburseForm.paid_from_account_id || !defaultFinanceAccountId) return;

    setDisburseForm((current) => ({
      ...current,
      paid_from_account_id: defaultFinanceAccountId,
    }));
  }, [
    defaultFinanceAccountId,
    disburseForm.paid_from_account_id,
    disburseMode,
    showDisburseDialog,
  ]);

  const disbursedTotal = useMemo(
    () =>
      (paymentVouchers ?? []).reduce(
        (sum, voucher) => sum + Number(voucher.amount || 0),
        0,
      ),
    [paymentVouchers],
  );

  const retiredTotal = useMemo(
    () =>
      (paymentVouchers ?? []).reduce(
        (sum, voucher) => sum + Number(voucher.retired_amount || 0),
        0,
      ),
    [paymentVouchers],
  );

  const remainingDisbursement = Math.max(0, requestTotal - disbursedTotal);

  const retireableVoucher = useMemo(
    () =>
      (paymentVouchers ?? []).find(
        (voucher) => Number(voucher.voucher_balance || 0) > 0,
      ) ||
      (paymentVouchers ?? [])[0] ||
      null,
    [paymentVouchers],
  );

  const handlerActionsVisible =
    availableActions.includes("disburse") ||
    availableActions.includes("complete") ||
    availableActions.includes("approve");

  function openVoucherEditor(voucher: FinancePaymentVoucherRecord) {
    setDisburseMode("edit");
    setEditingVoucherId(voucher.id);
    setDisburseFiles(
      voucher.evidence_files?.map((file) => ({
        id: file.id,
        file_name: file.file_name,
      })) ?? [],
    );
    setDisburseForm((current) => ({
      ...current,
      amount: String(voucher.amount ?? ""),
      method: voucher.method || current.method,
      transaction_ref: voucher.transaction_ref || current.transaction_ref,
      paid_from_account_id:
        voucher.paid_from_account?.id || current.paid_from_account_id,
      note: voucher.note || current.note,
      disbursed_at: voucher.disbursed_at
        ? String(voucher.disbursed_at).slice(0, 10)
        : current.disbursed_at,
    }));
    setShowDisbursementMediaPicker(false);
    setShowDisburseDialog(true);
  }

  function canEditVoucher(voucher: FinancePaymentVoucherRecord): boolean {
    const hasRetirement =
      Number(voucher.retired_amount || 0) > 0 || Boolean(voucher.retired_at);
    return handlerActionsVisible && !hasRetirement;
  }

  function openVoucherPreview(voucher: FinancePaymentVoucherRecord) {
    setPreviewVoucher(voucher);
    setShowVoucherPreviewDialog(true);
  }

  function openVoucherEvidence(file: VoucherFilePreview) {
    if (!file.url) return;
    setVoucherFilePreview(file);
  }

  function openRetireDialog(voucher?: FinancePaymentVoucherRecord | null) {
    setRetireForm((current) => ({
      ...current,
      voucher_id: voucher?.id || retireableVoucher?.id || current.voucher_id,
      retired_amount:
        voucher || retireableVoucher
          ? String(
              voucher?.voucher_balance ||
                voucher?.amount ||
                retireableVoucher?.voucher_balance ||
                retireableVoucher?.amount ||
                "",
            )
          : current.retired_amount,
      refund_amount: "",
      refund_method: "bank_transfer",
      refund_reference: "",
      refund_date: new Date().toISOString().slice(0, 10),
    }));
    setShowCertificateHonorForm(false);
    setShowRetireDialog(true);
  }

  function closeDisburseDialog() {
    setShowDisburseDialog(false);
    setDisburseMode("create");
    setEditingVoucherId("");
  }

  function openDisburseDialog() {
    setDisburseMode("create");
    setEditingVoucherId("");
    setShowDisburseDialog(true);
  }

  function closeRetireDialog() {
    setShowRetireDialog(false);
  }

  function closeVoucherPreview() {
    setShowVoucherPreviewDialog(false);
    setPreviewVoucher(null);
    setVoucherFilePreview(null);
  }

  return {
    financeAccounts: financeAccounts ?? null,
    paymentVouchers: paymentVouchers ?? null,
    refetchPaymentVouchers: () => {
      void refetchPaymentVouchers();
    },
    disbursedTotal,
    retiredTotal,
    remainingDisbursement,
    defaultFinanceAccountId,
    showDisburseDialog,
    disburseMode,
    editingVoucherId,
    disburseForm,
    setDisburseForm,
    disburseFiles,
    setDisburseFiles,
    showDisbursementMediaPicker,
    setShowDisbursementMediaPicker,
    openDisburseDialog,
    openVoucherEditor,
    closeDisburseDialog,
    canEditVoucher,
    showVoucherPreviewDialog,
    previewVoucher,
    voucherFilePreview,
    setVoucherFilePreview,
    openVoucherPreview,
    openVoucherEvidence,
    closeVoucherPreview,
    showRetireDialog,
    retireForm,
    setRetireForm,
    showRetirementMediaPicker,
    setShowRetirementMediaPicker,
    openRetireDialog,
    closeRetireDialog,
    showCertificateHonorForm,
    setShowCertificateHonorForm,
    retirementCertificateForm,
    setRetirementCertificateForm,
  };
}
