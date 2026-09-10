import {
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  usePermission,
} from "@/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { hrApi, attendanceApi, useCachedQuery } from "@/shared/lib/core";
import { type HrSummary } from "@stanforte/shared";
import { type AttendanceTodayStats } from "@stanforte/shared/src/api/attendance-api";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { listHrLeaveApprovals, listHrLeaveRequests, type RequestRecord } from "../leave/hr-leave-api";

function isCurrentlyOnLeave(record: RequestRecord): boolean {
  const d = record.data ?? {};
  const start = String(d.start_date ?? "");
  const end = String(d.end_date ?? "");
  if (!start || !end) return false;
  const now = new Date();
  return record.status === "approved" && now >= new Date(start) && now <= new Date(end);
}

type AttentionItem = {
  count: number;
  label: string;
  path: string;
  icon: string;
  tone: "warning" | "pending";
};

export default function HrDashboardPage() {
  const { user } = useAuth();

  const canViewEmployees = usePermission(["hr.manage", "hr.employees"]);
  const canViewAttendance = usePermission(["attendance.view", "attendance.manage", "attendance.approve"]);
  const canViewLeave = usePermission(["leave.view", "leave.manage", "leave.approve"]);
  const canApproveLeave = usePermission(["leave.approve"]);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: summaryData } = useCachedQuery(
    "hr:summary",
    () => hrApi.getSummary(),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const today = new Date().toISOString().slice(0, 10);
  const { data: attendanceStats } = useCachedQuery(
    `hr:attendance:stats:${today}`,
    () => attendanceApi.getStats(today),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: leaveApprovalsData } = useCachedQuery(
    "hr:leave:approvals",
    () => listHrLeaveApprovals(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: approvedLeaveData } = useCachedQuery(
    "hr:leave:approved",
    () => listHrLeaveRequests({ status: "approved" }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const summary = summaryData as HrSummary | undefined;
  const stats = attendanceStats as AttendanceTodayStats | undefined;
  const pendingApprovals: RequestRecord[] = Array.isArray(leaveApprovalsData) ? leaveApprovalsData : [];
  const approvedLeave: RequestRecord[] = Array.isArray(approvedLeaveData) ? approvedLeaveData : [];

  const pendingLeaveCount = pendingApprovals.length;
  const onLeaveTodayCount = approvedLeave.filter(isCurrentlyOnLeave).length;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  const attentionItems: AttentionItem[] = [
    canApproveLeave && pendingLeaveCount > 0
      ? { count: pendingLeaveCount, label: "leave requests pending approval", path: "/hr/leave", icon: "event_available", tone: "warning" }
      : null,
    canViewEmployees && (summary?.draft ?? 0) > 0
      ? { count: summary!.draft, label: "employees in draft status", path: "/hr/employees", icon: "person_add", tone: "pending" }
      : null,
  ].filter((x): x is AttentionItem => x !== null);

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-dashboard"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "HR" }]}
        title="HR Overview"
        description="Monitor headcount, attendance, and leave across the organisation."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employees — first */}
        {canViewEmployees && (
          <SectionCard
            title="Employees"
            description="Headcount and workforce status."
            action={
              <Link to="/hr/employees" className="text-sm font-semibold text-brand-900 transition hover:underline">
                Manage →
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total Employees" value={String(summary?.total ?? 0)} tone="neutral" icon="group" />
              <StatCard label="Active" value={String(summary?.active ?? 0)} tone="success" icon="check_circle" />
              <StatCard label="Suspended / Exited" value={String((summary?.suspended ?? 0) + (summary?.exited ?? 0))} tone="danger" icon="block" />
            </div>
          </SectionCard>
        )}

        {/* Needs Attention */}
        {attentionItems.length > 0 && (
          <SectionCard title="Needs Attention">
            <div className="flex flex-col gap-3">
              {attentionItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone === "warning" ? "bg-warning/10 text-warning" : "bg-brand-900/10 text-brand-900"}`}>
                    <Icon name={item.icon} className="text-[18px]" />
                  </span>
                  <span className="text-sm text-slate-700">
                    <span className="font-bold">{item.count}</span> {item.label}
                  </span>
                  <Icon name="chevron_right" className="ml-auto text-[18px] text-slate-400" />
                </Link>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Attendance */}
        {canViewAttendance && (
          <SectionCard
            title="Attendance Today"
            description="Clock-in activity across all staff for today."
            action={
              <Link to="/hr/attendance" className="text-sm font-semibold text-brand-900 transition hover:underline">
                View →
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Clocked In" value={String(stats?.clocked_in ?? 0)} tone="success" icon="login" />
              <StatCard label="Late" value={String(stats?.late ?? 0)} tone="warning" icon="schedule" />
              <StatCard label="Absent" value={String(stats?.absent ?? 0)} tone="danger" icon="person_off" />
            </div>
          </SectionCard>
        )}

        {/* Leave */}
        {canViewLeave && (
          <SectionCard
            title="Leave"
            description="Pending approvals and staff currently on leave."
            action={
              <Link to="/hr/leave" className="text-sm font-semibold text-brand-900 transition hover:underline">
                Review →
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard label="Pending Approvals" value={String(pendingLeaveCount)} tone="warning" icon="pending_actions" />
              <StatCard label="On Leave Today" value={String(onLeaveTodayCount)} tone="neutral" icon="beach_access" />
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
