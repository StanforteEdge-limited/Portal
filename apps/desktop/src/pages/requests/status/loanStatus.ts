import { formatCurrency } from "@stanforte/shared";
import { formatViewerRequestStatus } from "@/pages/requests/request-helpers";
import type { LoanProgress, StatusTone, ViewerStatus } from "./types";

type BuildLoanViewerStatusInput = {
  approvalActionsVisible: boolean;
  ownerActionsVisible: boolean;
  handlerActionsVisible: boolean;
  requestStatus: string;
  workflowStatus: string;
  availableActions: string[];
  pendingStep?: string | null;
  roles: string[];
  permissions: string[];
  statusTone: StatusTone;
  handlerRoleLabel?: string | null;
};

type BuildLoanProgressInput = {
  requestStatus: string;
  requestTotal: number;
  disbursedTotal: number;
  repaidTotal: number;
  currency?: string | null;
};

export function buildLoanViewerStatus(
  input: BuildLoanViewerStatusInput,
): ViewerStatus {
  const {
    approvalActionsVisible,
    ownerActionsVisible,
    handlerActionsVisible,
    requestStatus,
    workflowStatus,
    availableActions,
    pendingStep,
    statusTone,
    handlerRoleLabel,
  } = input;

  const handlerLabel = handlerRoleLabel ?? "HR";

  if (approvalActionsVisible) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
        "loan",
      ),
      hint: handlerActionsVisible
        ? `${handlerLabel} is the current approver for this request.`
        : "You are the current approver for this step.",
      tone: "warning",
    };
  }

  if (ownerActionsVisible && availableActions.includes("submit")) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
        "loan",
      ),
      hint: "You can still revise this before submission.",
      tone: "neutral",
    };
  }

  if (handlerActionsVisible && availableActions.includes("disburse")) {
    return {
      label: "Ready for Disbursement",
      hint: `${handlerLabel} can now disburse the loan to the requester.`,
      tone: "success",
    };
  }

  if (handlerActionsVisible && availableActions.includes("complete")) {
    return {
      label: "Ready to Complete",
      hint: `${handlerLabel} can verify full repayment and close this loan.`,
      tone: "success",
    };
  }

  if (requestStatus === "disbursed") {
    return {
      label: "Loan Disbursed",
      hint: "Repayment schedule is now active.",
      tone: "warning",
    };
  }

  if (requestStatus === "active") {
    return {
      label: "Repayment Active",
      hint: "Repayment is in progress and tracked automatically.",
      tone: "pending",
    };
  }

  return {
    label: formatViewerRequestStatus(
      workflowStatus,
      availableActions,
      pendingStep,
      "loan",
    ),
    hint: "This reflects the current workflow state for your view.",
    tone: statusTone,
  };
}

export function buildLoanProgress(
  input: BuildLoanProgressInput,
): LoanProgress {
  const { requestStatus, requestTotal, disbursedTotal, repaidTotal, currency } =
    input;

  if (requestStatus === "disbursed") {
    return {
      label: "Loan Disbursed",
      hint: `${formatCurrency(disbursedTotal, currency)} disbursed. Repayment schedule is now active.`,
    };
  }

  if (requestStatus === "active") {
    const remaining = Math.max(requestTotal - repaidTotal, 0);
    return {
      label: "Repayment Active",
      hint:
        remaining > 0
          ? `${formatCurrency(repaidTotal, currency)} repaid. ${formatCurrency(remaining, currency)} remaining.`
          : "Full amount repaid — awaiting final close.",
    };
  }

  if (requestStatus === "completed") {
    return {
      label: "Completed",
      hint: "The loan has been fully repaid and closed.",
    };
  }

  return { label: "", hint: "" };
}
