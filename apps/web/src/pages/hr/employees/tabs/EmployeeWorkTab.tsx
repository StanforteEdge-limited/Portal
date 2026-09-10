import { formatDate } from "@stanforte/shared";
import { DetailField } from "./DetailField";

function humanize(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function employeeManagerName(employee: import("@stanforte/shared").EmployeeDetail) {
  if (!employee.manager) return "-";
  const name = `${employee.manager.first_name || ""} ${employee.manager.last_name || ""}`.trim();
  return name || employee.manager.email || "-";
}

export default function EmployeeWorkTab({ employee }: { employee: import("@stanforte/shared").EmployeeDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Job Title" value={employee.job_title || "-"} />
        <DetailField label="Employment Type" value={humanize(employee.employment_type || "-")} />
        <DetailField label="Work Mode" value={humanize(employee.work_mode || "-")} />
        <DetailField label="Hire Date" value={formatDate(employee.hire_date)} />
        <DetailField label="Confirmation Date" value={formatDate(employee.confirmation_date)} />
        <DetailField label="Exit Date" value={formatDate(employee.exit_date)} />
        <DetailField label="Manager" value={employeeManagerName(employee)} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
          Job Description
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {employee.job_description || "-"}
        </p>
      </div>
    </div>
  );
}