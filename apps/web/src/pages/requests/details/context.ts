import { createContext, useContext } from "react";
import type { WorkflowType } from "@/pages/requests/request-helpers";
import type { WorkflowStep } from "@/shared";
import type { ActivityItem } from "@/shared";
import type { ViewerStatus } from "@/pages/requests/status/types";
import type { UsePaymentRequestResult } from "@/pages/requests/hooks/usePaymentRequest";
import type { RequestRecord } from "@/pages/requests/requests-api";

export type RequestDetailsView = "mine" | "approvals" | "finance" | "hr";

export type WorkflowAction =
  | "submit"
  | "approve"
  | "reject"
  | "return"
  | "disburse"
  | "confirm"
  | "retire"
  | "complete";

export type DownloadArtifactAction = "request_pdf" | "pv_pdf" | "full_document";

export type RequestDetailsContextValue = {
  // Core request
  request: RequestRecord | null;
  requestData: Record<string, unknown>;
  requestTotal: number;
  workflowType: WorkflowType;
  workflowStatus: string;
  requestStatus: string;
  handlerRoleLabel: string | null;

  // View context
  detailView: RequestDetailsView;
  parentPath: string;
  parentLabel: string;
  currentUserId?: string;

  // Action visibility
  availableActions: string[];
  approvalActionsVisible: boolean;
  ownerActionsVisible: boolean;
  handlerActionsVisible: boolean;
  isFinancePendingStep: boolean;
  canSubmit: boolean;
  canEditRequest: boolean;

  // Computed status
  viewerStatus: ViewerStatus;
  financeProgress: { label: string; hint: string };
  loanProgress: { label: string; hint: string };

  // Workflow stepper
  workflow: WorkflowStep[];

  // Approval state
  pendingApprovals: any[];
  completedApprovals: any[];

  // Finance hook state (used by payment + admin views)
  finance: UsePaymentRequestResult;
  disbursementButtonLabel: string;

  // Derived display values
  categoryName: string;
  projectName: string;
  teamName: string;
  organizationName: string;
  handoverColleagueName: string;
  lineItems: any[];
  documents: any[];
  requestTags: Array<{ id: string; label: string }>;

  // Nudge state
  canShowNudge: boolean;
  nudgeHeadline: string;
  nudgeMessage: string;

  // Activity feed
  activityItems: ActivityItem[];

  // UI state
  actionBusy: string;
  actionComment: string;
  setActionComment: (value: string) => void;

  // Actions
  handleWorkflowAction: (action: WorkflowAction) => Promise<void>;
  handleDownloadArtifact: (action: DownloadArtifactAction, voucherId?: string) => Promise<void>;
  handleDeleteDraft: () => Promise<void>;
  copyNudge: () => Promise<void>;
};

export const RequestDetailsContext =
  createContext<RequestDetailsContextValue | null>(null);

export function useRequestDetails(): RequestDetailsContextValue {
  const ctx = useContext(RequestDetailsContext);
  if (!ctx) {
    throw new Error(
      "useRequestDetails must be used inside a RequestDetailsContext.Provider",
    );
  }
  return ctx;
}
