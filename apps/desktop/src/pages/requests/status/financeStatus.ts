/** @deprecated Import from ./paymentStatus instead */
import { buildPaymentViewerStatus, buildPaymentProgress } from "./paymentStatus";
import type { StatusTone, ViewerStatus } from "./types";

type BuildFinanceViewerStatusInput = {
  approvalActionsVisible: boolean;
  ownerActionsVisible: boolean;
  financeActionsVisible: boolean;
  requestStatus: string;
  workflowStatus: string;
  availableActions: string[];
  pendingStep?: string | null;
  roles: string[];
  permissions: string[];
  statusTone: StatusTone;
  category?: string;
};

/** @deprecated Use buildPaymentViewerStatus from ./paymentStatus */
export function buildFinanceViewerStatus(
  input: BuildFinanceViewerStatusInput,
): ViewerStatus {
  return buildPaymentViewerStatus({
    ...input,
    handlerActionsVisible: input.financeActionsVisible,
  });
}

/** @deprecated Use buildPaymentProgress from ./paymentStatus */
export { buildPaymentProgress as buildFinanceProgress };
