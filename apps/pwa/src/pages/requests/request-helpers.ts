import { formatCurrency } from "@stanforte/shared";
import type { RequestGroupOption, RequestRecord, RequestTypeOption } from "@/pages/requests/requests-api";
import type { WorkflowStep, WorkflowStepStatus } from "@/shared";

export type WorkflowType = "payment" | "leave" | "loan" | "procurement" | "other";

/** @deprecated Use WorkflowType */
export type RequestCategory = WorkflowType;
/** @deprecated Use RequestCategory */
export type RequestFamily = RequestCategory;

export type RequestGroupMap = Record<string, { name: string; code: string }>;

export type RequestModule = {
  id: string;
  name: string;
  code: string;
};

export const REQUEST_MODULES: RequestModule[] = [
  { id: "module-hr", name: "Human Resources", code: "HR" },
  { id: "module-financial", name: "Financial", code: "FIN" },
];

const MODULE_BY_CODE: Record<string, RequestModule> = {
  HR: REQUEST_MODULES[0],
  FIN: REQUEST_MODULES[1],
};

export function buildGroupMap(groups: RequestGroupOption[]): RequestGroupMap {
  const map: RequestGroupMap = {};
  for (const g of groups) {
    map[g.id] = { name: g.name, code: g.code };
  }
  return map;
}

export function moduleFromCategory(category: WorkflowType): RequestModule | undefined {
  if (category === "leave" || category === "loan") return REQUEST_MODULES[0];
  if (category === "payment") return REQUEST_MODULES[1];
  return undefined;
}
/** @deprecated Use moduleFromCategory */
export const moduleFromFamily = moduleFromCategory;

export function classifyRequestCategory(
  categoryKey?: string | null,
  requestTypeName?: string | null,
  groupName?: string | null,
): WorkflowType {
  if (groupName) {
    const g = groupName.toLowerCase();
    if (g.includes("leave") || g === "personnel") return "leave";
    if (g.includes("loan") || g.includes("salary") || g.includes("advance")) return "loan";
    if (g.includes("procurement")) return "procurement";
    if (
      g.includes("finance") ||
      g.includes("payment") ||
      g.includes("expense") ||
      g.includes("reimbursement")
    ) {
      return "payment";
    }
  }

  const category = String(categoryKey || "").toLowerCase();
  const name = String(requestTypeName || "").toLowerCase();

  if (category) {
    if (category.includes("leave")) return "leave";
    if (category.includes("loan") || category.includes("salary") || category.includes("advance")) return "loan";
    if (category.includes("procurement")) return "procurement";
    if (
      category.includes("finance") ||
      category.includes("payment") ||
      category.includes("expense") ||
      category.includes("reimbursement")
    ) {
      return "payment";
    }
  }

  if (name.includes("leave")) return "leave";
  if (name.includes("loan") || name.includes("salary advance") || name.includes("advance")) return "loan";
  if (name.includes("procurement")) return "procurement";
  if (
    name.includes("cash") ||
    name.includes("expense") ||
    name.includes("financial") ||
    name.includes("payment") ||
    name.includes("reimbursement")
  ) {
    return "payment";
  }

  return "other";
}
export function workflowTypeLabel(type: WorkflowType) {
  if (type === "leave") return "Leave";
  if (type === "payment") return "Payment";
  if (type === "loan") return "Loan";
  if (type === "procurement") return "Procurement";
  return "Other";
}

/** @deprecated Use workflowTypeLabel */
export function requestCategoryLabel(category: WorkflowType) {
  return workflowTypeLabel(category);
}
/** @deprecated Use requestCategoryLabel */
export const requestFamilyLabel = requestCategoryLabel;

export function workflowTypeFromType(
  type?: RequestTypeOption | null,
  groups?: RequestGroupMap,
): WorkflowType {
  if (type?.workflow_type) return type.workflow_type as WorkflowType;
  const groupName = type?.groupId && groups?.[type.groupId]
    ? groups[type.groupId].name
    : null;
  return classifyRequestCategory(
    type?.taxonomyKeys?.[0] ?? type?.taxonomy_keys?.[0] ?? type?.categoryKey ?? type?.category_key ?? type?.category_code,
    type?.name,
    groupName,
  );
}

export function requestCategoryFromTypeSimple(type?: RequestTypeOption | null): RequestCategory {
  return classifyRequestCategory(
    type?.taxonomyKeys?.[0] ?? type?.taxonomy_keys?.[0] ?? type?.categoryKey ?? type?.category_key ?? type?.category_code,
    type?.name,
    null,
  );
}

export function workflowTypeFromRecord(request?: RequestRecord | null): WorkflowType {
  if (request?.request_type?.workflow_type) {
    return request.request_type.workflow_type as WorkflowType;
  }
  const groupName = request?.group?.name ?? null;
  const taxonomyKey = request?.request_type?.taxonomy_keys?.[0];
  const categoryKey = taxonomyKey ?? request?.request_type?.category_key ?? request?.request_type?.category_code ?? null;
  return classifyRequestCategory(categoryKey, request?.request_type?.name, groupName);
}

/** @deprecated Use workflowTypeFromType */
export const requestCategoryFromType = workflowTypeFromType;
/** @deprecated Use requestCategoryFromType */
export const requestFamilyFromType = requestCategoryFromType;

/** @deprecated Use workflowTypeFromRecord */
export const requestCategoryFromRecord = workflowTypeFromRecord;
/** @deprecated Use requestCategoryFromRecord */
export const requestFamilyFromRecord = requestCategoryFromRecord;

export function formatRequestStatus(status?: string | null) {
  return String(status || "draft").replaceAll("_", " ");
}

export function formatViewerRequestStatus(
  status?: string | null,
  actions: string[] = [],
  pendingStep?: string | null,
  workflowType?: string | null,
) {
  const normalizedActions = actions.map((entry) => entry.toLowerCase());
  if (normalizedActions.includes("approve") || normalizedActions.includes("reject")) {
    return "Awaiting Your Approval";
  }
  if (normalizedActions.includes("submit")) {
    return "Draft";
  }
  if (normalizedActions.includes("confirm")) {
    return "Awaiting Your Confirmation";
  }
  if (normalizedActions.includes("retire")) {
    return workflowType === "loan" ? "Loan Disbursed" : "Retirement Required";
  }
  if (normalizedActions.includes("complete")) {
    return "Ready to Close";
  }
  if (pendingStep && ["approval", "submitted", "sent", "under_review", "review"].includes(String(status || "").toLowerCase())) {
    return `Awaiting ${pendingStep}`;
  }
  return formatRequestStatus(status);
}

export function requestStatusTone(status?: string | null): "success" | "warning" | "pending" | "danger" | "neutral" {
  const key = String(status || "").toLowerCase();
  if (["approved", "completed", "paid", "disbursed", "confirmed"].includes(key)) return "success";
  if (["rejected", "cancelled", "voided"].includes(key)) return "danger";
  if (["under_review", "review", "draft", "prepared"].includes(key)) return "warning";
  if (["pending", "sent", "approval", "submitted"].includes(key)) return "pending";
  return "neutral";
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPersonName(person?: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null) {
  const name = `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim();
  if (name) return name;
  return person?.username || person?.email || "Unknown requester";
}

function normalizeWorkflowLabel(step: Record<string, any>, index: number) {
  const role = String(
    step.role || step.approver?.value || step.approver_id || "",
  ).toLowerCase();
  const approverType = String(
    step.approver?.type || step.approver_type || "",
  ).toLowerCase();
  if (
    role.includes("team_lead_or_manager") ||
    step.approver?.value === "requester_team_lead_or_manager"
  ) {
    return index === 0 ? "Team Lead Approval" : "Manager Approval";
  }
  if (
    role.includes("team_lead") ||
    step.approver?.value === "requester_team_lead"
  ) {
    return "Team Lead Approval";
  }
  if (
    role.includes("accountant") ||
    step.approver?.value === "finance.approve" ||
    approverType === "permission"
  ) {
    return "Accountant Clears";
  }
  if (role.includes("hr")) return "HR Approval";
  if (role.includes("coo")) return "COO Approval";
  if (role.includes("ed")) return "ED Approval";
  if (role.includes("board")) return "Board Member Approval";
  return String(step.step || step.name || `Approval ${index + 1}`);
}

export function buildWorkflow(
  request: any,
  pendingSteps: Array<{ step: string }>,
  paymentVouchers: Array<{
    amount?: number;
    retired_amount?: number;
    retirement_status?: string;
  }>,
  options?: { showDraftStep?: boolean },
): WorkflowStep[] {
  const status = deriveRequestWorkflowStatus(request);
  const stateEvents = Array.isArray(request?.data?.state_events)
    ? request.data.state_events
    : [];
  const doneEntries = Array.isArray(request?.approvals?.done)
    ? request.approvals.done
    : [];
  const requestTypeSteps = Array.isArray(request?.approvals?.required_steps) && request.approvals.required_steps.length > 0
    ? request.approvals.required_steps
    : Array.isArray(
        request?.request_type?.approval_flow_json?.steps,
      )
      ? request.request_type.approval_flow_json.steps
      : [];
  const approvalStepsSource = requestTypeSteps.length
    ? requestTypeSteps
    : [{ role: "team_lead" }, { role: "accountant" }];
  const approvalLabels = approvalStepsSource.map(
    (step: Record<string, any>, index: number) =>
      normalizeWorkflowLabel(step, index),
  );
  const total = Number(request?.total_amount || 0);
  const disbursedTotal = paymentVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.amount || 0),
    0,
  );
  const retiredTotal = paymentVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.retired_amount || 0),
    0,
  );
  const requestComplete = status === "completed";
  const approvalDoneCount = Math.min(doneEntries.length, approvalLabels.length);
  const approvalCurrentIndex =
    pendingSteps.length > 0
      ? Math.min(approvalDoneCount, Math.max(0, approvalLabels.length - 1))
      : -1;
  const financeCurrent =
    status === "cleared" ||
    (status === "disbursed" && total > 0 && disbursedTotal < total);
  const confirmCurrent =
    status === "disbursed" && !(total > 0 && disbursedTotal < total);
  const retireCurrent = status === "confirmed";
  const completeCurrent = status === "retired" || requestComplete;

  const showDraftStep = options?.showDraftStep ?? true;
  const draftedStatus: WorkflowStepStatus =
    showDraftStep &&
      (status === "draft" ||
        stateEvents.some(
          (event: Record<string, unknown>) =>
            String(event.from || "").toLowerCase() === "draft",
        )) &&
      !approvalDoneCount &&
      disbursedTotal === 0 &&
      retiredTotal === 0
      ? "current"
      : "complete";
  const approvalSteps: WorkflowStep[] = approvalLabels.map(
    (label: string, index: number) => {
      const done =
        index < approvalDoneCount ||
        requestComplete ||
        status === "cleared" ||
        status === "disbursed" ||
        status === "confirmed" ||
        status === "retired";
      const isCurrent =
        approvalCurrentIndex === index &&
        ["approval", "sent", "under_review", "review"].includes(status);
      return {
        label,
        detail: isCurrent
          ? `Waiting on ${label}.`
          : done
            ? `${label} completed.`
            : `Awaiting ${label}.`,
        status:
          done && !isCurrent ? "complete" : isCurrent ? "current" : "upcoming",
      } satisfies WorkflowStep;
    },
  );

  const financeSteps: WorkflowStep[] = [
    {
      label: "Disbursement",
      detail:
        total > 0
          ? `${formatCurrency(disbursedTotal, request?.currency)} / ${formatCurrency(total, request?.currency)}`
          : "Funds/payment voucher issued by finance.",
      status: financeCurrent
        ? "current"
        : confirmCurrent || retireCurrent || completeCurrent
          ? "complete"
          : "upcoming",
    },
    {
      label: "Confirmation",
      detail: "Requester confirms receipt after disbursement.",
      status: confirmCurrent
        ? "current"
        : retireCurrent || completeCurrent
          ? "complete"
          : "upcoming",
    },
    {
      label: "Retirement",
      detail:
        total > 0
          ? `${formatCurrency(retiredTotal, request?.currency)} / ${formatCurrency(total, request?.currency)}`
          : "Retirement support submitted for verification.",
      status: retireCurrent
        ? "current"
        : completeCurrent || requestComplete || retiredTotal >= total
          ? "complete"
          : "upcoming",
    },
    {
      label: "Completed",
      detail: "Finance verifies the retirement and closes the request.",
      status: completeCurrent
        ? "current"
        : requestComplete
          ? "complete"
          : "upcoming",
    },
  ];

  const steps: WorkflowStep[] = [
    ...(showDraftStep
      ? [
        {
          label: "Drafted",
          detail: "Request initialized and saved.",
          status: draftedStatus,
        } satisfies WorkflowStep,
      ]
      : []),
    ...approvalSteps,
    ...financeSteps,
  ];

  let currentMarked = false;
  return steps.map((step) => {
    if (step.status !== "upcoming") return step;
    if (!currentMarked && !requestComplete) {
      currentMarked = true;
      return { ...step, status: "current" as const };
    }
    return step;
  });
}

export function buildLeaveWorkflow(
  request: any,
  pendingSteps: Array<{ step: string }>,
  options?: { showDraftStep?: boolean },
): WorkflowStep[] {
  const status = deriveRequestWorkflowStatus(request);
  const doneEntries = Array.isArray(request?.approvals?.done)
    ? request.approvals.done
    : [];
  const requestTypeSteps = Array.isArray(request?.approvals?.required_steps) && request.approvals.required_steps.length > 0
    ? request.approvals.required_steps
    : Array.isArray(
        request?.request_type?.approval_flow_json?.steps,
      )
      ? request.request_type.approval_flow_json.steps
      : [];
  const approvalStepsSource = requestTypeSteps.length
    ? requestTypeSteps
    : [{ role: "team_lead" }, { role: "hr" }];
  const approvalLabels = approvalStepsSource.map(
    (step: Record<string, any>, index: number) =>
      normalizeWorkflowLabel(step, index),
  );
  const approvalDoneCount = Math.min(doneEntries.length, approvalLabels.length);
  const approvalCurrentIndex =
    pendingSteps.length > 0
      ? Math.min(approvalDoneCount, Math.max(0, approvalLabels.length - 1))
      : -1;
  const requestComplete = ["approved", "completed"].includes(String(status));
  const requestRejected = String(status) === "rejected";
  const showDraftStep = options?.showDraftStep ?? true;

  const draftStep = showDraftStep
    ? [
      {
        label: "Drafted",
        detail: "Leave request initialized and saved.",
        status:
          status === "draft" && approvalDoneCount === 0
            ? ("current" as const)
            : ("complete" as const),
      } satisfies WorkflowStep,
    ]
    : [];

  const approvalSteps: WorkflowStep[] = approvalLabels.map((label: string, index: number) => {
    const done = index < approvalDoneCount || requestComplete || requestRejected;
    const isCurrent =
      approvalCurrentIndex === index &&
      ["approval", "sent", "under_review", "review"].includes(String(status));
    return {
      label,
      detail: isCurrent
        ? `Waiting on ${label}.`
        : done
          ? `${label} completed.`
          : `Awaiting ${label}.`,
      status:
        done && !isCurrent ? "complete" : isCurrent ? "current" : "upcoming",
    } satisfies WorkflowStep;
  });

  const finalStep: WorkflowStep = {
    label: requestRejected ? "Rejected" : "Approved",
    detail: requestRejected
      ? "Leave request was rejected."
      : requestComplete
        ? "Leave request approved and closed."
        : "Awaiting final decision.",
    status: requestRejected || requestComplete ? "complete" : "upcoming",
  };

  return [...draftStep, ...approvalSteps, finalStep];
}

export function buildLoanWorkflow(
  request: any,
  pendingSteps: Array<{ step: string }>,
  options?: { showDraftStep?: boolean },
): WorkflowStep[] {
  const status = deriveRequestWorkflowStatus(request);
  const doneEntries = Array.isArray(request?.approvals?.done)
    ? request.approvals.done
    : [];
  const requestTypeSteps = Array.isArray(request?.approvals?.required_steps) && request.approvals.required_steps.length > 0
    ? request.approvals.required_steps
    : Array.isArray(
        request?.request_type?.approval_flow_json?.steps,
      )
      ? request.request_type.approval_flow_json.steps
      : [];
  const approvalStepsSource = requestTypeSteps.length
    ? requestTypeSteps
    : [{ role: "team_lead" }, { role: "hr" }];
  const approvalLabels = approvalStepsSource.map(
    (step: Record<string, any>, index: number) =>
      normalizeWorkflowLabel(step, index),
  );
  const approvalDoneCount = Math.min(doneEntries.length, approvalLabels.length);
  const approvalCurrentIndex =
    pendingSteps.length > 0
      ? Math.min(approvalDoneCount, Math.max(0, approvalLabels.length - 1))
      : -1;
  const requestComplete = status === "completed";
  const disbursedOrBeyond = ["disbursed", "active", "completed"].includes(
    String(status),
  );
  const activeOrBeyond = ["active", "completed"].includes(String(status));
  const showDraftStep = options?.showDraftStep ?? true;

  const draftStep: WorkflowStep[] = showDraftStep
    ? [
        {
          label: "Drafted",
          detail: "Loan request initialized and saved.",
          status:
            status === "draft" && approvalDoneCount === 0
              ? "current"
              : "complete",
        },
      ]
    : [];

  const approvalSteps: WorkflowStep[] = approvalLabels.map(
    (label: string, index: number) => {
      const done =
        index < approvalDoneCount ||
        disbursedOrBeyond ||
        status === "cleared" ||
        requestComplete;
      const isCurrent =
        approvalCurrentIndex === index &&
        ["approval", "sent", "under_review", "review"].includes(String(status));
      return {
        label,
        detail: isCurrent
          ? `Waiting on ${label}.`
          : done
            ? `${label} completed.`
            : `Awaiting ${label}.`,
        status:
          done && !isCurrent ? "complete" : isCurrent ? "current" : "upcoming",
      } satisfies WorkflowStep;
    },
  );

  const disbursedStep: WorkflowStep = {
    label: "Disbursed",
    detail: "Loan amount disbursed to the requester.",
    status: activeOrBeyond
      ? "complete"
      : status === "disbursed" || status === "cleared"
        ? "current"
        : "upcoming",
  };

  const activeStep: WorkflowStep = {
    label: "Active",
    detail: "Repayment in progress.",
    status: requestComplete
      ? "complete"
      : status === "active"
        ? "current"
        : "upcoming",
  };

  const completedStep: WorkflowStep = {
    label: "Completed",
    detail: "Loan fully repaid and closed.",
    status: requestComplete ? "complete" : "upcoming",
  };

  const steps: WorkflowStep[] = [
    ...draftStep,
    ...approvalSteps,
    disbursedStep,
    activeStep,
    completedStep,
  ];

  let currentMarked = steps.some((s) => s.status === "current");
  return steps.map((step) => {
    if (step.status !== "upcoming") return step;
    if (!currentMarked && !requestComplete) {
      currentMarked = true;
      return { ...step, status: "current" as const };
    }
    return step;
  });
}

export function deriveRequestWorkflowStatus(request: any) {
  const rawStatus = String(request?.status || "").toLowerCase();
  const stateEvents = Array.isArray(request?.data?.state_events)
    ? request.data.state_events
    : [];
  const latestWorkflowEvent = [...stateEvents]
    .reverse()
    .find((event: Record<string, unknown>) => {
      const action = String(event.action || "").toLowerCase();
      const to = String(event.to || "").toLowerCase();
      return ["return", "reject", "approve", "submit", "resubmit"].includes(action)
        || ["returned", "returned_for_edit", "rejected", "approval", "sent"].includes(to);
    }) as Record<string, unknown> | undefined;
  const latestAction = String(latestWorkflowEvent?.action || "").toLowerCase();
  const latestTo = String(latestWorkflowEvent?.to || "").toLowerCase();

  if (rawStatus === "rejected") {
    return "rejected";
  }

  if (rawStatus === "returned" || rawStatus === "returned_for_edit") {
    return "returned";
  }

  if (
    rawStatus === "draft" &&
    (latestAction === "return" || latestTo === "returned" || latestTo === "returned_for_edit")
  ) {
    return "returned";
  }

  if (
    rawStatus === "draft" &&
    (latestAction === "reject" || latestTo === "rejected")
  ) {
    return "rejected";
  }

  const hasSubmitted =
    stateEvents.some((event: Record<string, unknown>) => {
      const action = String(event.action || "").toLowerCase();
      const to = String(event.to || "").toLowerCase();
      return (
        action === "submit" ||
        action === "workflow_start" ||
        action === "workflow_auto_approved" ||
        to === "sent" ||
        to === "approval"
      );
    }) ||
    (Array.isArray(request?.approvals?.pending) &&
      request.approvals.pending.length > 0) ||
    (Array.isArray(request?.approvals?.done) &&
      request.approvals.done.length > 0);

  if (rawStatus === "draft" && hasSubmitted) {
    return "approval";
  }

  return rawStatus;
}

export function requestHasDraftHistory(request: any) {
  const stateEvents = Array.isArray(request?.data?.state_events)
    ? request.data.state_events
    : [];
  return stateEvents.some(
    (event: Record<string, unknown>) =>
      String(event.from || "").toLowerCase() === "draft" ||
      String(event.to || "").toLowerCase() === "draft",
  );
}

export const DEFAULT_CERTIFICATE_REASON =
  "No supporting receipt is available for the full amount because the expense was settled without a formal receipt or the receipt could not be obtained in time for retirement.";
