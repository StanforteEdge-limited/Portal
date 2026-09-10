import { SectionCard } from "@/shared";

export default function ProcurementRequestBody({ request }: { request: any }) {
  const data = request?.data || {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard title="Procurement Summary">
        <p className="text-sm text-slate-600">Category: {String(data.category || '-')}</p>
        <p className="text-sm text-slate-600">Needed by: {String(data.needed_by || '-')}</p>
        <p className="text-sm text-slate-600">Budget line: {String(data.budget_line_id || '-')}</p>
      </SectionCard>
      <SectionCard title="Specification">
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{String(data.specification || '-')}</p>
      </SectionCard>
    </div>
  );
}
