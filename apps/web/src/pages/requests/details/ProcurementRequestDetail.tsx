import { useRequestDetails } from "./context";
import { SummarySection, type SummaryCard } from "./shared/SummarySection";
import { SectionCard } from "@/shared";

export function ProcurementRequestDetail() {
  const { request, requestData } = useRequestDetails();

  if (!request) return null;

  const data = requestData as Record<string, unknown>;

  const cards: SummaryCard[] = [
    { label: "Category", value: String(data.category || "-"), tone: "neutral" },
    { label: "Item / Service", value: String(data.title || "-"), tone: "neutral" },
  ];

  return (
    <>
      <SummarySection cards={cards} />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Procurement Summary">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Category</span>
              <p className="mt-0.5 font-semibold text-slate-900 capitalize">
                {String(data.category || "-")}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Needed By</span>
              <p className="mt-0.5 font-semibold text-slate-900">
                {String(data.needed_by || "-")}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Budget</span>
              <p className="mt-0.5 font-semibold text-slate-900">
                {String(data.budget_id || "-")}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Budget Line</span>
              <p className="mt-0.5 font-semibold text-slate-900">
                {String(data.budget_line_id || "-")}
              </p>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Justification & Spec">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Justification</span>
              <p className="mt-0.5 text-slate-600 whitespace-pre-wrap">
                {String(data.justification || "No justification provided.")}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Specification</span>
              <p className="mt-0.5 text-slate-600 whitespace-pre-wrap">
                {String(data.specification || "No specification provided.")}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export default ProcurementRequestDetail;
