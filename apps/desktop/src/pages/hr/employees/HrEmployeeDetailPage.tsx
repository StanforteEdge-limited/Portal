import { Button, Chip, EmptyState, Icon, PageHeader, SectionCard, usePermission } from "@/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { hrApi, useCachedQuery } from "@/shared/lib/core";
import { type EmployeeDetail } from "@stanforte/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import EmployeeActionsTab from "@/pages/hr/employees/tabs/EmployeeActionsTab";
import EmployeeAttendanceTab from "@/pages/hr/employees/tabs/EmployeeAttendanceTab";
import EmployeeOrgsTeamsTab from "@/pages/hr/employees/tabs/EmployeeOrgsTeamsTab";
import EmployeeOverviewTab from "@/pages/hr/employees/tabs/EmployeeOverviewTab";
import EmployeeWorkTab from "@/pages/hr/employees/tabs/EmployeeWorkTab";
import EmployeeOrgsOverviewTab from "@/pages/hr/employees/tabs/EmployeeOrgsOverviewTab";

import EmployeeLeaveTab from "@/pages/hr/employees/tabs/EmployeeLeaveTab";
import { DetailField } from "@/pages/hr/employees/tabs/DetailField";
import { formatDate } from "@stanforte/shared";


function humanize(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const allTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'work', label: 'Work & Employment' },
  { key: 'orgs', label: 'Organizations & Teams' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave & Absence' },
  { key: 'actions', label: 'Actions' },
] as const;

function employeeFullName(employee: EmployeeDetail) {
  return `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.username || "Unknown Employee";
}

function employeeInitials(employee: EmployeeDetail) {
  const fullName = employeeFullName(employee);
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function employeeManagerName(employee: EmployeeDetail) {
  if (!employee.manager) return "-";
  const name = `${employee.manager.first_name || ""} ${employee.manager.last_name || ""}`.trim();
  return name || employee.manager.email || "-";
}

export default function HrEmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage = usePermission(["hr.manage"]);
  const tabs = canManage ? allTabs : allTabs.filter((t) => t.key !== "actions");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: profile } = useCachedQuery(
    "hr:profile:detail",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const activeTab = (searchParams.get("tab") as any) || "overview";

  const { data, loading, error, refetch } = useCachedQuery(
    `hr:employee:${id}:${refreshKey}`,
    () => hrApi.getEmployee(id!),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const employee = data as EmployeeDetail | undefined;

  useEffect(() => {
    if (error && !loading) {
      const statusText = String(error || "").toLowerCase();
      if (statusText.includes("404") || statusText.includes("not found")) {
        navigate("/hr/employees", { replace: true });
      }
    }
  }, [error, loading, navigate]);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  if (loading) {
    return (
      <AppShell
        navigation={buildAppNavigation()}
        activeLabel="hr-employees"
        user={{ name: userName, role: profile?.employee_profile?.job_title || "HR Staff" }}
        mobileNav={buildAppMobileNav("Employees")}
      >
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading employee...</div>
      </AppShell>
    );
  }

  if (error || !employee) {
    return (
      <AppShell
        navigation={buildAppNavigation()}
        activeLabel="hr-employees"
        user={{ name: userName, role: profile?.employee_profile?.job_title || "HR Staff" }}
        mobileNav={buildAppMobileNav("Employees")}
      >
        <EmptyState
          title="Employee not found"
          description="The employee you're looking for doesn't exist or has been removed."
        />
      </AppShell>
    );
  }

  function handleTabChange(tab: string) {
    setSearchParams({ tab });
  }

  function handleSaved() {
    void refetch();
    setRefreshKey(k => k + 1);
  }

  const statusTone =
    employee.employment_status === 'active' ? 'success' :
        employee.employment_status === 'draft' ? 'pending' :
            employee.employment_status === 'suspended' ? 'danger' :
                'neutral';

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-employees"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("Employees")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Employees", path: "/hr/employees" },
          { label: `${employee.first_name} ${employee.last_name}` },
        ]}
        title={`${employee.first_name} ${employee.last_name}`}
        description={employee.email}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/hr/employees/${id}/edit`)}
              className="gap-2"
            >
              <Icon name="edit" className="text-[18px]" />
              Edit Profile
            </Button>
            <Chip variant={statusTone}>
              {humanize(employee.employment_status || "draft")}
            </Chip>
          </div>
        }
      />

      <section className="mb-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-900 text-2xl font-semibold text-white">
              {employeeInitials(employee)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-950">
                {employeeFullName(employee)}
              </h1>
              <p className="text-sm text-slate-500">{employee.email || "-"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <p><span className="font-semibold text-slate-900">Code:</span> {employee.employee_code || "-"}</p>
                <p><span className="font-semibold text-slate-900">Phone:</span> {employee.phone || "-"}</p>
                <p><span className="font-semibold text-slate-900">Manager:</span> {employeeManagerName(employee)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab navigation */}
      <nav className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-500">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={[
              "rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
              activeTab === tab.key
                ? "bg-brand-900 text-white"
                : "bg-slate-100 text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <SectionCard
        title={tabs.find((t) => t.key === activeTab)?.label || "Profile"}
        description={
          activeTab === 'overview' ? "Read-only employee profile and assignment snapshot." :
            activeTab === 'work' ? "Employment records, dates, manager, and job details." :
            activeTab === 'attendance' ? "Individual attendance performance and history" :
              activeTab === 'orgs' ? "Organization and team memberships for this employee." :
                  "Status actions: activate, suspend, or exit"
        }
      >
        {activeTab === 'overview' && <EmployeeOverviewTab employee={employee} />}
        {activeTab === 'work' && <EmployeeWorkTab employee={employee} />}
        {activeTab === 'attendance' && <EmployeeAttendanceTab employeeId={employee.id} />}
        {activeTab === 'leave' && <EmployeeLeaveTab employeeId={employee.id} />}
        {activeTab === 'orgs' && (
          canManage
            ? <EmployeeOrgsTeamsTab employee={employee} onSaved={handleSaved} />
            : <EmployeeOrgsOverviewTab employee={employee} />
        )}
        {canManage && activeTab === 'actions' && <EmployeeActionsTab employee={employee} onSaved={handleSaved} />}
      </SectionCard>
    </AppShell>
  );
}
