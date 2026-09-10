import { Button, TextAreaField } from "@/shared";
import { useRequestDetails } from "../../context";

export function StatusForYouCard() {
  const {
    viewerStatus,
    financeProgress,
    financeActionsVisible,
    approvalActionsVisible,
    ownerActionsVisible,
    availableActions,
    actionBusy,
    actionComment,
    setActionComment,
    requestStatus,
    requestTotal,
    disbursedTotal,
    disbursementButtonLabel,
    setShowDisburseDialog,
    handleWorkflowAction,
    openRetireDialog,
  } = useRequestDetails();

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
      {financeActionsVisible && financeProgress.label ? (
        <div className="mt-4 rounded-[18px] bg-white/10 px-4 py-3">
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/60">
            Finance Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {financeProgress.label}
          </div>
          <div className="mt-1 text-sm leading-6 text-white/75">
            {financeProgress.hint}
          </div>
        </div>
      ) : null}
      {approvalActionsVisible &&
      availableActions.some((action) =>
        ["approve", "reject", "return"].includes(action),
      ) ? (
        <div className="mt-4 space-y-3">
          <TextAreaField
            label="Decision note"
            helpText={
              availableActions.includes("return")
                ? "Required for Return. Optional for Approve/Reject."
                : "Optional context for the requester and audit trail."
            }
            value={actionComment}
            onChange={(event) => setActionComment(event.target.value)}
            rows={3}
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
          />
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => void handleWorkflowAction("approve")}
              disabled={actionBusy !== ""}
            >
              {actionBusy === "approve"
                ? financeActionsVisible
                  ? "Clearing..."
                  : "Approving..."
                : financeActionsVisible
                  ? "Clear Request"
                  : "Approve "}
            </Button>
            <Button
              variant="danger"
              className="w-full justify-center"
              onClick={() => void handleWorkflowAction("reject")}
              disabled={actionBusy !== ""}
            >
              {actionBusy === "reject" ? "Rejecting..." : "Reject "}
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
      {ownerActionsVisible && availableActions.includes("submit") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => void handleWorkflowAction("submit")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "submit" ? "Submitting..." : "Submit Request"}
        </Button>
      ) : null}
      {financeActionsVisible &&
      (requestStatus === "cleared" ||
        (requestStatus === "disbursed" &&
          requestTotal > disbursedTotal)) ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          requiredPermissions={["finance.manage"]}
          onClick={() => setShowDisburseDialog(true)}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "disburse"
            ? "Disbursing..."
            : disbursementButtonLabel}
        </Button>
      ) : null}
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
      {ownerActionsVisible && availableActions.includes("retire") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => openRetireDialog()}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "retire" ? "Preparing..." : "Retire"}
        </Button>
      ) : null}
      {financeActionsVisible && availableActions.includes("complete") ? (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          requiredPermissions={["finance.manage"]}
          onClick={() => void handleWorkflowAction("complete")}
          disabled={actionBusy !== ""}
        >
          {actionBusy === "complete" ? "Completing..." : "Complete Request"}
        </Button>
      ) : null}
    </section>
  );
}
