import { formatViewerRequestStatus } from "@/pages/requests/request-helpers";
import type { StatusTone, ViewerStatus } from "./types";

type BuildLeaveViewerStatusInput = {
  approvalActionsVisible: boolean;
  ownerActionsVisible: boolean;
  requestStatus: string;
  workflowStatus: string;
  availableActions: string[];
  pendingStep?: string | null;
  statusTone: StatusTone;
};

export function buildLeaveViewerStatus(
  input: BuildLeaveViewerStatusInput,
): ViewerStatus {
  const {
    approvalActionsVisible,
    ownerActionsVisible,
    requestStatus,
    workflowStatus,
    availableActions,
    pendingStep,
    statusTone,
  } = input;

  if (approvalActionsVisible) {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: "You are the current approver for this step.",
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

  if (requestStatus === "approval") {
    return {
      label: "In Review",
      hint: "Your request is currently under review.",
      tone: "warning",
    };
  }

  if (requestStatus === "cleared") {
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingStep,
      ),
      hint: "This leave request has completed approvals and is waiting on the next workflow update.",
      tone: "success",
    };
  }

  return {
    label: formatViewerRequestStatus(workflowStatus, availableActions, pendingStep),
    hint: "This reflects the current workflow state for your view.",
    tone: statusTone,
  };
}
