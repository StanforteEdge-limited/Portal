import { DetailField } from "./DetailField";

function humanize(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function EmployeeOverviewTab({ employee }: { employee: import("@stanforte/shared").EmployeeDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Personal Details</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailField label="First Name" value={employee.first_name || "-"} />
          <DetailField label="Last Name" value={employee.last_name || "-"} />
          <DetailField label="Email" value={employee.email || "-"} />
          <DetailField label="Phone" value={employee.phone || "-"} />
          <DetailField label="Username" value={employee.username || "-"} />
          <DetailField label="Employee Code" value={employee.employee_code || "-"} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Current Assignment</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Job Title" value={employee.job_title || "-"} />
          <DetailField label="Primary Organization" value={employee.primary_organization?.name || "-"} />
          <DetailField label="Primary Team" value={employee.primary_team?.name || "-"} />
          <DetailField label="Status" value={humanize(employee.employment_status || "draft")} />
          <DetailField label="Employment Type" value={humanize(employee.employment_type || "-")} />
          <DetailField label="Work Mode" value={humanize(employee.work_mode || "-")} />
        </div>
      </div>
    </div>
  );
}