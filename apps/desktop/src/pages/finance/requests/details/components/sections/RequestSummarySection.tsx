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
            "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-[0.1em]",
            viewerStatus.tone === "success"
              ? "bg-success/10 text-success"
              : viewerStatus.tone === "danger"
                ? "bg-danger/10 text-danger"
                : viewerStatus.tone === "warning"
                  ? "bg-amber-500/10 text-amber-700"
                  : viewerStatus.tone === "pending"
                    ? "bg-blue-500/10 text-blue-700"
                    : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {viewerStatus.label}
        </span>
      }
    >
      <p className="max-w-3xl text-sm leading-7 text-slate-600">
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
