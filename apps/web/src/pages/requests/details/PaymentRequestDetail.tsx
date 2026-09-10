import { useRequestDetails } from "./context";
import { PaymentRequestBody } from "../bodies/PaymentRequestBody";
import { SummarySection, type SummaryCard } from "./shared/SummarySection";
import { formatViewerRequestStatus } from "@/pages/requests/request-helpers";
import { formatDisplayDate, formatCurrency } from "@stanforte/shared";

export function PaymentRequestDetail() {
  const { request, requestData, availableActions, pendingApprovals } = useRequestDetails();

  if (!request) return null;

  const cards: SummaryCard[] = [
    { label: "Total Amount", value: formatCurrency(request.total_amount, request.currency), tone: "neutral" },
    { label: "Due Date", value: formatDisplayDate(String(requestData.due_date || "")), tone: "neutral" },
    {
      label: "Current Step",
      value: pendingApprovals[0]?.step || formatViewerRequestStatus(request.status, availableActions),
      tone: "neutral",
    },
  ];

  return (
    <>
      <SummarySection cards={cards} />
      <PaymentRequestBody />
    </>
  );
}
