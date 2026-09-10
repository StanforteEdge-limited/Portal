import { Chip } from "@/shared";
import type { EmployeeDetail } from "@stanforte/shared";

function humanize(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function EmployeeOrgsOverviewTab({ employee }: { employee: EmployeeDetail }) {
  const organizations = Array.isArray(employee.organizations) ? employee.organizations : [];
  const teams = Array.isArray(employee.teams) ? employee.teams : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Organizations</h3>
        {organizations.length ? organizations.map((organization: any) => (
          <div
            key={String(organization.id || organization.organization_id || organization.name)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {organization.name || organization.organization?.name || "-"}
              </p>
              <p className="text-xs text-slate-500">
                {organization.code || organization.organization?.code || ""}
              </p>
            </div>
            {organization.is_primary ? (
              <Chip variant="success">Primary</Chip>
            ) : null}
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No organization assignments.
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Teams</h3>
        {teams.length ? teams.map((team: any) => (
          <div
            key={String(team.id || team.team_id || team.name)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {team.name || team.team?.name || "-"}
              </p>
              <p className="text-xs text-slate-500">
                {humanize(team.role || "member")}
              </p>
            </div>
            {team.group_type ? (
              <Chip variant="neutral">{humanize(String(team.group_type))}</Chip>
            ) : null}
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No team assignments.
          </div>
        )}
      </div>
    </div>
  );
}