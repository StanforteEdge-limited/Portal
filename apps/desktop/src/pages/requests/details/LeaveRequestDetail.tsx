import { useRequestDetails } from "./context";
import { LeaveRequestBody } from "../bodies/LeaveRequestBody";
import { SummarySection, type SummaryCard } from "./shared/SummarySection";
import { formatDisplayDate } from "@stanforte/shared";

export function LeaveRequestDetail() {
  const { request, requestData, handoverColleagueName, organizationName } = useRequestDetails();

  if (!request) return null;

  const cards: SummaryCard[] = [
    {
      label: "Leave Dates",
      value: `${formatDisplayDate(String(requestData.start_date || ""))} – ${formatDisplayDate(String(requestData.end_date || ""))}`,
      tone: "neutral",
    },
    { label: "Days Requested", value: String(requestData.days_requested || "-"), tone: "warning" },
    { label: "Organization", value: organizationName, tone: "neutral" },
  ];

  return (
    <>
      <SummarySection cards={cards} />
      <LeaveRequestBody
        requestData={requestData}
        handoverColleagueName={handoverColleagueName}
      />
    </>
  );
}
