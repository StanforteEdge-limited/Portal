import { formatCurrency } from "@stanforte/shared";
import type { WorkflowStep, WorkflowStepStatus } from "@/shared";

export function normalizeWorkflowLabel(
  step: Record<string, any>,
  index: number,
) {
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
    gross_amount?: number;
    retired_amount?: number;
    retirement_status?: string;
  }>,
  options?: { showDraftStep?: boolean },
): WorkflowStep[] {
  const rawStatus = String(request?.status || "").toLowerCase();
  const stateEvents = Array.isArray(request?.data?.state_events)
    ? request.data.state_events
    : [];
  const doneEntries = Array.isArray(request?.approvals?.done)
    ? request.approvals.done
    : [];
  const hasWorkflowHistory =
    doneEntries.length > 0 ||
    pendingSteps.length > 0 ||
    stateEvents.some((event: Record<string, unknown>) =>
      [
        "submit",
        "workflow_start",
        "workflow_auto_approved",
        "approve",
        "reject",
      ].includes(String(event.action || "").toLowerCase()),
    );
  const status =
    rawStatus === "draft" && hasWorkflowHistory ? "approval" : rawStatus;
  const requestTypeSteps = Array.isArray(
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
    (sum, voucher) => sum + Number((voucher.gross_amount ?? voucher.amount) || 0),
    0,
  );
  const retiredTotal = paymentVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.retired_amount || 0),
    0,
  );
  const requestComplete = status === "completed";
  const approvalDoneCount = Math.min(
    doneEntries.length,
    approvalLabels.length,
  );
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

export function deriveRequestWorkflowStatus(request: any) {
  const rawStatus = String(request?.status || "").toLowerCase();
  const stateEvents = Array.isArray(request?.data?.state_events)
    ? request.data.state_events
    : [];
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
