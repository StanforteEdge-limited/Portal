import { Chip, SectionCard, StatCard } from "@/shared";
import { useRequestDetails } from "../context";

export type SummaryCard = {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "success" | "pending" | "danger";
};

export function SummarySection({ cards }: { cards: SummaryCard[] }) {
  const {
    request,
    requestData,
    workflowType,
    viewerStatus,
    categoryName,
    requestTags,
  } = useRequestDetails();

  if (!request) return null;

  return (
    <SectionCard
      title="Request Summary"
      action={<Chip variant={viewerStatus.tone}>{viewerStatus.label}</Chip>}
    >
      <p className="max-w-3xl text-sm leading-7 text-slate-600">
        {String(
          requestData.purpose ||
            requestData.leave_reason ||
            "No summary provided.",
        )}
      </p>
      {workflowType !== "leave" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {categoryName && categoryName !== "-" ? (
            <Chip variant="neutral">Category: {categoryName}</Chip>
          ) : null}
          {requestTags.map((tag) => (
            <Chip key={tag.id} variant="pending">
              #{tag.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </div>
    </SectionCard>
  );
}
