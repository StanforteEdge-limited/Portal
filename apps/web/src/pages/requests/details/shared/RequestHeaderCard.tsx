import { formatCurrency } from "@stanforte/shared";
import { useRequestDetails } from "../context";

export function RequestHeaderCard() {
  const { request, workflowType, finance, requestTotal } = useRequestDetails();
  if (!request) return null;

  if (workflowType === "leave") {
    return (
      <section className="section-card bg-brand-900 p-5 text-white">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
          Request Type
        </p>
        <h3 className="mt-3 text-[1.65rem] font-semibold tracking-tight">
          {request.request_type?.name || "Leave"}
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/85">
          This request follows the leave workflow and approval sequence.
        </p>
      </section>
    );
  }

  return (
    <section className="section-card bg-brand-900 p-5 text-white">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
        {workflowType === "loan" ? "Loan Amount" : "Current Total"}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-[1.65rem] font-semibold tracking-tight">
          {formatCurrency(request.total_amount, request.currency)}
        </h3>
        {workflowType === "payment" && finance.disbursedTotal > 0 ? (
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">
            / {formatCurrency(finance.disbursedTotal, request.currency)} disbursed
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-white/85">
        {workflowType === "loan"
          ? "This is the principal amount requested for this loan."
          : "This total is calculated from the submitted request items and their supporting attachments."}
      </p>
    </section>
  );
}
