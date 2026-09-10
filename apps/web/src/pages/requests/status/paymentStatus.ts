import { formatCurrency } from "@stanforte/shared";
import { formatViewerRequestStatus } from "@/pages/requests/request-helpers";
import type { PaymentProgress, StatusTone, ViewerStatus } from "./types";

type BuildPaymentViewerStatusInput = {
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
  workflowType?: string | null;
  handlerRoleLabel?: string | null;
};

type BuildPaymentProgressInput = {
  requestStatus: string;
  requestTotal: number;
  disbursedTotal: number;
  remainingDisbursement: number;
  currency?: string | null;
};

export function buildPaymentViewerStatus(
  input: BuildPaymentViewerStatusInput,
): ViewerStatus {
  const {
    approvalActionsVisible,
    ownerActionsVisible,
    handlerActionsVisible,
    requestStatus,
    workflowStatus,
    availableActions,
    pendingStep,
    roles,
    permissions,
    statusTone,
    handlerRoleLabel,
  } = input;

  const handlerLabel = handlerRoleLabel ?? "Finance";

  if (approvalActionsVisible) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: handlerActionsVisible
        ? `${handlerLabel} is the current approver for this request. Clear it here for disbursement or the next step.`
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
      ),
      hint: "You can still revise this before submission.",
      tone: "neutral",
    };
  }

  if (handlerActionsVisible && availableActions.includes("disburse")) {
    return {
      label: "Ready for Disbursement",
      hint: `${handlerLabel} can now disburse the request and start voucher handling.`,
      tone: "success",
    };
  }

  if (ownerActionsVisible && availableActions.includes("confirm")) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: `${handlerLabel} has disbursed this request. Confirm receipt here once the funds or voucher reach you.`,
      tone: "warning",
    };
  }

  if (ownerActionsVisible && availableActions.includes("retire")) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: "After spending the disbursed amount, submit retirement details and receipt support here.",
      tone: "warning",
    };
  }

  if (handlerActionsVisible && availableActions.includes("complete")) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: `${handlerLabel} can verify the retirement and complete this request.`,
      tone: "warning",
    };
  }

  if (requestStatus === "approval") {
    const handlerViewer =
      roles.some((role) => role.includes("finance") || role === "accountant") ||
      permissions.some((permission) => permission === "finance.approve");
    return {
      label: handlerViewer ? "In Approval Workflow" : "In Review",
      hint: handlerViewer
        ? "This request is progressing through the approval chain."
        : "Your request is currently under review.",
      tone: "warning",
    };
  }

  if (requestStatus === "cleared") {
    return {
      label: "Ready for Disbursement",
      hint: `${handlerLabel} can now prepare disbursement and voucher handling.`,
      tone: "success",
    };
  }

  return {
    label: formatViewerRequestStatus(workflowStatus, availableActions, pendingStep),
    hint: "This reflects the current workflow state for your view.",
    tone: statusTone,
  };
}

export function buildPaymentProgress(
  input: BuildPaymentProgressInput,
): PaymentProgress {
  const {
    requestStatus,
    requestTotal,
    disbursedTotal,
    remainingDisbursement,
    currency,
  } = input;

  if (requestStatus === "cleared") {
    return {
      label: "Ready for Disbursement",
      hint: "Finance can release the first payment voucher or split the request across multiple vouchers.",
    };
  }

  if (requestStatus === "disbursed") {
    if (requestTotal > 0 && disbursedTotal < requestTotal) {
      return {
        label: "Partially Disbursed",
        hint: `${formatCurrency(remainingDisbursement, currency)} remains to be disbursed before requester confirmation.`,
      };
    }
    return {
      label: "Awaiting Confirmation",
      hint: "The disbursement is complete. The requester should confirm receipt before retirement.",
    };
  }

  if (requestStatus === "confirmed") {
    return {
      label: "Awaiting Retirement",
      hint: "The requester has confirmed receipt. Retirement support can now be submitted.",
    };
  }

  if (requestStatus === "retired") {
    return {
      label: "Awaiting Verification",
      hint: "Finance should verify the retirement records before the request can close.",
    };
  }

  if (requestStatus === "completed") {
    return {
      label: "Completed",
      hint: "The payment workflow has been fully closed.",
    };
  }

  return { label: "", hint: "" };
}
