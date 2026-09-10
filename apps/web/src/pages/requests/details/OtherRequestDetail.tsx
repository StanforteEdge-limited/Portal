import { useRequestDetails } from "./context";
import { SummarySection, type SummaryCard } from "./shared/SummarySection";
import { formatViewerRequestStatus } from "@/pages/requests/request-helpers";
import { formatCurrency } from "@stanforte/shared";
import { EmptyState, SectionCard } from "@/shared";

export function OtherRequestDetail() {
  const { request, availableActions, lineItems, pendingApprovals } = useRequestDetails();

  if (!request) return null;

  const cards: SummaryCard[] = [
    { label: "Total Amount", value: formatCurrency(request.total_amount, request.currency), tone: "neutral" },
    {
      label: "Current Step",
      value: pendingApprovals[0]?.step || formatViewerRequestStatus(request.status, availableActions),
      tone: "neutral",
    },
  ];

  return (
    <>
      <SummarySection cards={cards} />
      <SectionCard title="Request Items" description="Items submitted with this request.">
        {lineItems.length ? (
          <ul className="space-y-2">
            {lineItems.map((item) => (
              <li key={item.id} className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">
                  {item.description || "Untitled item"}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No items" description="This request does not include any items." />
        )}
      </SectionCard>
    </>
  );
}

export default OtherRequestDetail;
