import {
  Chip,
  Icon,
  SectionCard,
  StatCard,
} from "@/shared";
import { useRequestDetails } from "../../context";

export function RequestSummarySection() {
  const {
    viewerStatus,
    requestData,
    workflowType,
    requestTags,
    summaryCards,
  } = useRequestDetails();

  return (
    <SectionCard
      title="Request Summary"
      action={
        <span
          className={[
            "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium  ",
            viewerStatus.tone === "success"
              ? "bg-success/10 text-success"
              : viewerStatus.tone === "danger"
                ? "bg-danger/10 text-danger"
                : viewerStatus.tone === "warning"
                  ? "bg-amber-500/10 text-amber-700"
                  : viewerStatus.tone === "pending"
                    ? "bg-blue-500/10 text-neutral-700"
                    : "bg-neutral-100 text-neutral-700",
          ].join(" ")}
        >
          {viewerStatus.label}
        </span>
      }
    >
      <p className="max-w-3xl text-sm leading-7 text-neutral-600">
        {String(
          requestData.purpose ||
            requestData.leave_reason ||
            "No summary provided.",
        )}
      </p>
      {workflowType !== "hr" && requestTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {requestTags.map((tag) => (
            <Chip key={tag.id} variant="pending">
              #{tag.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
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
