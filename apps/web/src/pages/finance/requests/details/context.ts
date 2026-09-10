import { createContext, useContext } from "react";
import type { FinancePaymentVoucherRecord } from "@/shared";
import type { WorkflowStep, ActivityItem } from "@/shared";

type RequestDetailsView = "mine" | "approvals" | "finance";
type StatusTone = "neutral" | "success" | "warning" | "pending" | "danger";

export type DeductionLine = {
  deduction_type_id: string;
  rate: number;
  gross_amount: number;
  deduction_amount: number;
};

export type DisburseForm = {
  amount: string;
  method: string;
  transaction_ref: string;
  paid_from_account_id: string;
  note: string;
  disbursed_at: string;
  contact_id: string;
};

export type RetireForm = {
  voucher_id: string;
  retired_amount: string;
  notes: string;
  retirement_file_ids: string[];
  refund_amount: string;
  refund_method: string;
  refund_reference: string;
  refund_date: string;
};

export type RequestDetailsContextValue = {
  id: string;
  detailView: RequestDetailsView;
  request: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchRequestActions: () => Promise<void>;
  refetchPaymentVouchers: () => Promise<void>;
  requestData: Record<string, any>;
  workflowType: string;
  statusTone: StatusTone;
  categoryName: string;
  requestTags: Array<{ id: string; label: string }>;
  projectName: string;
  teamName: string;
  organizationName: string;
  lineItems: Array<any>;
  documents: Array<any>;
  requestTotal: number;
  disbursedTotal: number;
  totalDeductions: number;
  retiredTotal: number;
  remainingDisbursement: number;
  defaultFinanceAccountId: string;
  financeAccounts: Array<any>;
  paymentVouchers: Array<FinancePaymentVoucherRecord> | null;
  pendingApprovals: Array<any>;
  completedApprovals: Array<any>;
  workflowStatus: string;
  workflow: WorkflowStep[];
  parentPath: string;
  parentLabel: string;
  detailActiveLabel: string;
  canSubmit: boolean;
  canEditDraft: boolean;
  roles: string[];
  permissions: string[];
  availableActions: string[];
  requestStatus: string;
  approvalActionsVisible: boolean;
  financeActionsVisible: boolean;
  ownerActionsVisible: boolean;
  viewerStatus: { label: string; hint: string; tone: StatusTone };
  financeProgress: { label: string; hint: string };
  disbursementButtonLabel: string;
  canShowNudge: boolean;
  nudgeHeadline: string;
  nudgeMessage: string;
  summaryCards: Array<{ label: string; value: string; tone: StatusTone }>;
  activityItems: ActivityItem[];
  retireableVoucher: FinancePaymentVoucherRecord | null;
  selectedRetirementVoucher: FinancePaymentVoucherRecord | null;
  retirementShortfall: number;
  actionBusy: string;
  setActionBusy: React.Dispatch<React.SetStateAction<string>>;
  actionComment: string;
  setActionComment: (value: string) => void;
  showDisburseDialog: boolean;
  showRetireDialog: boolean;
  showVoucherPreviewDialog: boolean;
  previewVoucher: FinancePaymentVoucherRecord | null;
  disburseMode: "create" | "edit";
  editingVoucherId: string;
  disburseForm: DisburseForm;
  setDisburseForm: React.Dispatch<React.SetStateAction<DisburseForm>>;
  disburseFiles: Array<{ id: string; file_name: string }>;
  setDisburseFiles: React.Dispatch<
    React.SetStateAction<Array<{ id: string; file_name: string }>>
  >;
  disburseDeductions: DeductionLine[];
  setDisburseDeductions: React.Dispatch<React.SetStateAction<DeductionLine[]>>;
  showDisbursementMediaPicker: boolean;
  showRetirementMediaPicker: boolean;
  retireForm: RetireForm;
  setRetireForm: React.Dispatch<React.SetStateAction<RetireForm>>;
  showCertificateHonorForm: boolean;
  retirementCertificateForm: { declaration: string; reason: string };
  setRetirementCertificateForm: React.Dispatch<
    React.SetStateAction<{ declaration: string; reason: string }>
  >;
  defaultCertificateReason: string;
  currentUserId: string | undefined;
  setShowDisburseDialog: (value: boolean) => void;
  setShowRetireDialog: (value: boolean) => void;
  setShowVoucherPreviewDialog: (value: boolean) => void;
  setPreviewVoucher: (value: FinancePaymentVoucherRecord | null) => void;
  setShowDisbursementMediaPicker: (value: boolean) => void;
  setShowRetirementMediaPicker: (value: boolean) => void;
  setShowCertificateHonorForm: React.Dispatch<React.SetStateAction<boolean>>;
  openVoucherEditor: (voucher: FinancePaymentVoucherRecord) => void;
  canEditVoucher: (voucher: FinancePaymentVoucherRecord) => boolean;
  openVoucherPreview: (voucher: FinancePaymentVoucherRecord) => void;
  openRetireDialog: (voucher?: FinancePaymentVoucherRecord | null) => void;
  closeDisburseDialog: () => void;
  handleDownloadArtifact: (
    action: "request_pdf" | "full_document" | "pv_pdf",
    voucherId?: string,
  ) => Promise<void>;
  handleDeleteDraft: () => Promise<void>;
  handleWorkflowAction: (
    action:
      | "submit"
      | "approve"
      | "reject"
      | "return"
      | "disburse"
      | "confirm"
      | "retire"
      | "complete",
  ) => Promise<void>;
  copyNudge: () => Promise<void>;
};

export const initialDisburseForm: DisburseForm = {
  amount: "",
  method: "bank_transfer",
  transaction_ref: "",
  paid_from_account_id: "",
  note: "",
  disbursed_at: new Date().toISOString().slice(0, 10),
  contact_id: "",
};

export const initialRetireForm: RetireForm = {
  voucher_id: "",
  retired_amount: "",
  notes: "",
  retirement_file_ids: [],
  refund_amount: "",
  refund_method: "bank_transfer",
  refund_reference: "",
  refund_date: new Date().toISOString().slice(0, 10),
};

export const RequestDetailsContext =
  createContext<RequestDetailsContextValue | null>(null);

export function useRequestDetails() {
  const ctx = useContext(RequestDetailsContext);
  if (!ctx) {
    throw new Error(
      "useRequestDetails must be used within RequestDetailsContext",
    );
  }
  return ctx;
}
