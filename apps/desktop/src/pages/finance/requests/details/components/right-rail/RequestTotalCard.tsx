import { formatCurrency } from "@stanforte/shared";
import { requestCategoryFromRecord } from "@/pages/requests/request-helpers";
import { useRequestDetails } from "../../context";

export function RequestTotalCard() {
  const { request, workflowType, disbursedTotal } = useRequestDetails();

  return (
    <section className="section-card bg-brand-900 p-5 text-white">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
        {workflowType === "hr" ? "Request Type" : "Current Total"}
      </p>
      {workflowType === "hr" ? (
        <h3 className="mt-3 text-[1.65rem] font-semibold tracking-tight">
          {request.request_type?.name ||
            requestCategoryFromRecord(request)}
        </h3>
      ) : (
        <div className="mt-3 flex items-baseline gap-2">
          <h3 className="text-[1.65rem] font-semibold tracking-tight">
            {formatCurrency(request.total_amount, request.currency)}
          </h3>
          {disbursedTotal > 0 ? (
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">
              / {formatCurrency(disbursedTotal, request.currency)} disbursed
            </span>
          ) : null}
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-white/85">
        {workflowType === "hr"
          ? "This request follows the leave workflow and approval sequence."
          : "This total is calculated from the submitted request items and their supporting attachments."}
      </p>
    </section>
  );
}
