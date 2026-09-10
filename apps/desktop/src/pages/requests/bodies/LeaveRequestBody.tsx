import { SectionCard, StatCard } from "@/shared";
import { formatDisplayDate } from "@stanforte/shared";

type Props = {
  requestData: Record<string, any>;
  handoverColleagueName: string;
};

export function LeaveRequestBody({ requestData, handoverColleagueName }: Props) {
  return (
    <>
      <SectionCard
        title="Leave Coverage"
        description="Leave-specific dates and handover details."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Start Date"
            value={formatDisplayDate(String(requestData.start_date || ""))}
            tone="neutral"
          />
          <StatCard
            label="End Date"
            value={formatDisplayDate(String(requestData.end_date || ""))}
            tone="neutral"
          />
          <StatCard
            label="Days Requested"
            value={String(requestData.days_requested || "-")}
            tone="warning"
          />
          <StatCard
            label="Handover Colleague"
            value={handoverColleagueName}
            tone="neutral"
          />
        </div>
        <div className="mt-4 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          Handover acknowledgement:{" "}
          {String(requestData.handover_ack_status || "Pending acknowledgement")}
          . Team lead/workflow approvers make the leave decision.
        </div>
        <div className="mt-4 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          {String(requestData.handover_notes || "No handover notes captured.")}
        </div>
      </SectionCard>
    </>
  );
}
