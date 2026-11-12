import {
  Chip,
  EmptyState,
  Icon,
  PaginationControls,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  usePermission,
  DataTable,
  ColumnDef,
} from "@/shared";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { ChevronRight, Plus, Users, UserCheck, Briefcase, GraduationCap } from "lucide-react";
import { useAuth } from "@/shared/context/AuthProvider";
import { hrApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { type EmployeeSummary, type HrSummary } from "@stanforte/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import type { OrganizationItem, TeamOption } from "@/shared";


function humanize(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

import { formatDate } from "@stanforte/shared";

export default function HrEmployeesPage() {
  const { user } = useAuth();
  const canManage = usePermission(["hr.manage"]);
  const { data: profile } = useCachedQuery(
    "hr:profile:directory",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: orgsData } = useCachedQuery(
    "hr:organizations",
    () => resourceApi.listOrganizations(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const organizations: OrganizationItem[] = Array.isArray(orgsData) ? orgsData : [];
  const orgMap = new Map(organizations.map(o => [o.id, o]));

  const { data: groupsData } = useCachedQuery(
    "hr:groups",
    () => resourceApi.listGroups({ active_only: true }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const groups: TeamOption[] = Array.isArray(groupsData) ? groupsData : [];

  const { data: summaryData } = useCachedQuery(
    "hr:summary",
    () => hrApi.getSummary(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );
  const summary = summaryData as HrSummary | undefined;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page: currentPage, per_page: perPage };
    if (search.trim()) p.search = search.trim();
    if (status) p.employment_status = status;
    if (employmentType) p.employment_type = employmentType;
    if (orgFilter) p.organization_id = orgFilter;
    if (groupFilter) p.group_id = groupFilter;
    return p;
  }, [search, status, employmentType, orgFilter, groupFilter, currentPage, perPage, refreshKey]);

  const { data, loading, error, refetch } = useCachedQuery(
    `hr:employees:${JSON.stringify(params)}:${refreshKey}`,
    () => hrApi.listEmployees(params),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const employees = Array.isArray(data?.result) ? data.result : [];
  const totalEmployees = Number(data?.total ?? 0);
  const totalPages = Number(data?.pages ?? 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, employmentType, orgFilter, groupFilter]);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  const safePage = Math.min(currentPage, totalPages);
  const pageStart = totalEmployees === 0 ? 0 : (safePage - 1) * perPage + 1;
  const pageEnd = totalEmployees === 0 ? 0 : Math.min(totalEmployees, safePage * perPage);

  const columns: ColumnDef<EmployeeSummary>[] = useMemo(() => [
    {
      header: "Name",
      cell: (employee) => (
        <div>
          <Link
            to={`/hr/employees/${employee.id}`}
            className="text-sm font-semibold text-brand-900 transition hover:underline"
          >
            {employee.first_name} {employee.last_name}
          </Link>
          <div className="mt-1 text-xs text-slate-500">
            {employee.email}
          </div>
        </div>
      )
    },
    {
      header: "Employee Code",
      cell: (employee) => employee.employee_code || "-",
      className: "text-sm text-slate-700"
    },
    {
      header: "Job Title",
      cell: (employee) => employee.job_title || "-",
      className: "text-sm text-slate-700"
    },
    {
      header: "Organization",
      cell: (employee) => {
        const org = employee.primary_organization ? orgMap.get(employee.primary_organization.id) : null;
        return org ? org.name : (employee.primary_organization?.name || "-");
      },
      className: "text-sm text-slate-700"
    },
    {
      header: "Type",
      cell: (employee) => <Chip variant="neutral">{humanize(employee.employment_type || "draft")}</Chip>
    },
    {
      header: "Status",
      cell: (employee) => (
        <Chip variant={
          employee.employment_status === 'active' ? 'success' :
              employee.employment_status === 'draft' ? 'pending' :
                  employee.employment_status === 'suspended' ? 'danger' :
                      employee.employment_status === 'exited' ? 'neutral' :
                          'neutral'
        }>
          {humanize(employee.employment_status || "draft")}
        </Chip>
      )
    },
    {
      header: "Hire Date",
      cell: (employee) => formatDate(employee.hire_date ?? undefined),
      className: "text-sm text-slate-700"
    },
    {
      header: "Actions",
      cell: (employee) => (
        <Link to={`/hr/employees/${employee.id}`} onClick={(e) => e.stopPropagation()}>
          <Icon name="open_in_new" className="text-[18px] text-brand-900" />
        </Link>
      )
    }
  ], [orgMap]);

  return (
    <PortalLayout activeNav="Employees">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Workforce Directory"
          description="Browse staff profiles, departmental assignments, employment contracts, and contact directories."
          icon={Users}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            canManage ? (
              <Link
                to="/hr/employees/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Employee</span>
              </Link>
            ) : undefined
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Headcount</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{summary?.total ?? totalEmployees}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Enrolled
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Full-Time Personnel</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {summary?.by_employment_type?.full_time ?? 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Contract Staff</div>
              <div className="text-xl font-black text-purple-700 mt-0.5">
                {summary?.by_employment_type?.contract ?? 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Interns & Trainees</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {(summary?.by_employment_type?.intern ?? 0) + (summary?.by_employment_type?.consultant ?? 0)}
              </div>
            </div>
          </div>
        </div>

      {/* Filter bar */}
      <section className="section-card p-4 sm:p-5 mb-6" aria-label="Employee filters">
        <div className="flex flex-wrap items-start gap-3">
          <label className="grid gap-1.5 text-sm flex-1 min-w-[200px]">
            <span className="font-semibold text-slate-700">Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
            />
          </label>

          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-w-[130px] flex-1 lg:flex-none"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
            <option value="exited">Exited</option>
          </SelectField>

          <SelectField
            label="Employment Type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="min-w-[140px] flex-1 lg:flex-none"
          >
            <option value="">All types</option>
            <option value="full_time">Full-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
            <option value="consultant">Consultant</option>
          </SelectField>

          <SelectField
            label="Organization"
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="min-w-[160px] flex-1 lg:flex-none"
          >
            <option value="">All organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Group"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="min-w-[160px] flex-1 lg:flex-none"
          >
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      {/* Table */}
      <SectionCard
        title="Employees"
        description="Manage staff and employee records."
        action={
          totalEmployees > 0 ? (
            <Chip variant="neutral">
              Showing {pageStart}-{pageEnd} of {totalEmployees}
            </Chip>
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          error={error}
          caption="Employees"
          emptyTitle="No employees found"
          emptyDescription="Try adjusting your filters or add a new employee."
          pagination={{
            page: safePage,
            totalPages: totalPages,
            totalCount: totalEmployees,
            perPage,
            onPageChange: setCurrentPage,
            onPerPageChange: (value) => {
              setPerPage(value);
              setCurrentPage(1);
            },
          }}
        />
      </SectionCard>
      </div>
    </PortalLayout>
  );
}
