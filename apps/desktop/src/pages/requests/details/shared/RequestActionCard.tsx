import { Link } from "react-router-dom";
import { Button, TextAreaField } from "@/shared";
import { useRequestDetails } from "../context";

export function RequestActionCard() {
  const {
    request,
    workflowType,
    viewerStatus,
    approvalActionsVisible,
    availableActions,
    actionBusy,
    actionComment,
    setActionComment,
    handleWorkflowAction,
    ownerActionsVisible,
    canSubmit,
    workflowStatus,
    handlerActionsVisible,
    isFinancePendingStep,
    loanProgress,
    financeProgress,
    finance,
    disbursementButtonLabel,
    requestTotal,
  } = useRequestDetails();

  if (!request) return null;

  const isPayment = workflowType === "payment";
  const isLoan = workflowType === "loan";

  return (
    <section className="section-card bg-brand-900 p-5 text-white">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
        Status For You
      </p>
      <h3 className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/70">
        {viewerStatus.label}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/85">
        {viewerStatus.hint}
      </p>

      {/* Progress blocks */}
      {handlerActionsVisible && isLoan && loanProgress?.label ? (
        <div className="mt-4 rounded-[18px] bg-white/10 px-4 py-3">
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/60">
            Loan Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{loanProgress.label}</div>
          <div className="mt-1 text-sm leading-6 text-white/75">{loanProgress.hint}</div>
        </div>
      ) : null}

      {handlerActionsVisible && isPayment && financeProgress?.label ? (
        <div className="mt-4 rounded-[18px] bg-white/10 px-4 py-3">
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/60">
            Finance Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{financeProgress.label}</div>
          <div className="mt-1 text-sm leading-6 text-white/75">{financeProgress.hint}</div>
        </div>
      ) : null}

      {/* Finance pending clearance */}
      {isFinancePendingStep && approvalActionsVisible ? (
        <p className="mt-4 text-sm text-white/75">
          This step requires Finance clearance.{" "}
          <Link to={`/finance/requests/${request.id}`} className="font-medium text-white underline">
            Open in Finance
          </Link>
        </p>
      ) : null}

      {/* Approval actions */}
      {!isFinancePendingStep && approvalActionsVisible && availableActions.some(a => ["approve", "reject", "return"].includes(a)) ? (
        <div className="mt-4 space-y-3">
          <TextAreaField
            label="Decision note"
            helpText="Required — your comment is added to the approval thread."
            value={actionComment}
            onChange={(event) => setActionComment(event.target.value)}
            rows={3}
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
          />
          <div className="flex flex-wrap gap-2">
            {availableActions.includes("approve") && (
              <button
                type="button"
                onClick={() => setActionComment(handlerActionsVisible && isPayment ? "Cleared." : "Approved.")}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20 transition-colors"
              >
                Use: &ldquo;{handlerActionsVisible && isPayment ? "Cleared." : "Approved."}&rdquo;
              </button>
            )}
            {availableActions.includes("reject") && (
              <button
                type="button"
                onClick={() => setActionComment("This request has been rejected.")}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20 transition-colors"
              >
                Use: &ldquo;This request has been rejected.&rdquo;
              </button>
            )}
            {availableActions.includes("return") && (
              <button
                type="button"
                onClick={() => setActionComment("Please review and correct the details before resubmitting.")}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20 transition-colors"
              >
                Use: &ldquo;Please review and correct...&rdquo;
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => void handleWorkflowAction("approve")}
              disabled={actionBusy !== ""}
            >
              {actionBusy === "approve"
                ? (handlerActionsVisible && isPayment ? "Clearing..." : "Approving...")
                : (handlerActionsVisible && isPayment ? "Clear" : "Approve")}
            </Button>
            <Button
              variant="danger"
              className="w-full justify-center"
              onClick={() => void handleWorkflowAction("reject")}
              disabled={actionBusy !== ""}
            >
              {actionBusy === "reject" ? "Rejecting..." : "Reject"}
            </Button>
            {availableActions.includes("return") ? (
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => void handleWorkflowAction("return")}
                disabled={actionBusy !== ""}
              >
                {actionBusy === "return" ? "Returning..." : "Return"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Staff: Submit / Resubmit */}
      {ownerActionsVisible && canSubmit ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => void handleWorkflowAction("submit")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "submit"
            ? "Submitting..."
            : workflowStatus === "returned"
              ? "Resubmit Request"
              : "Submit Request"}
        </Button>
      ) : null}

      {/* Handler: Disburse — payment */}
      {isPayment && handlerActionsVisible &&
        (request.status === "cleared" || (request.status === "disbursed" && requestTotal > finance.disbursedTotal)) ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => finance.openDisburseDialog()}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "disburse" ? "Disbursing..." : disbursementButtonLabel}
        </Button>
      ) : null}

      {/* Handler: Disburse — loan */}
      {isLoan && handlerActionsVisible && availableActions.includes("disburse") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => void handleWorkflowAction("disburse")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "disburse" ? "Disbursing..." : "Disburse Loan"}
        </Button>
      ) : null}

      {/* Staff: Confirm Receipt */}
      {ownerActionsVisible && availableActions.includes("confirm") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => void handleWorkflowAction("confirm")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "confirm" ? "Confirming..." : "Confirm Receipt"}
        </Button>
      ) : null}

      {/* Staff: Retire — payment only */}
      {isPayment && ownerActionsVisible && availableActions.includes("retire") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => finance.openRetireDialog()}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "retire" ? "Preparing..." : "Retire"}
        </Button>
      ) : null}

      {/* Handler: Complete */}
      {handlerActionsVisible && availableActions.includes("complete") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => void handleWorkflowAction("complete")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "complete" ? "Completing..." : "Complete Request"}
        </Button>
      ) : null}
    </section>
  );
}
