import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  StatsGrid,
  TextField,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { attendanceApi, resourceApi } from "@/shared/lib/core";
import {
  type AdminCorrectionRow,
  type StaffDailyRow,
} from "@stanforte/shared";
import AttendanceRecordSlideOver from "./AttendanceRecordSlideOver";
import CorrectionReviewSlideOver from "./CorrectionReviewSlideOver";
import { formatDate, formatTime, formatDuration, humanize } from "@stanforte/shared";
import { deriveAttendanceStatus, toneFromStatus } from "./attendance-data";
import { TimeWithNextDay } from "@/shared/components/ui/TimeWithNextDay";
import { SidebarTabs } from "@/shared";
import { PaginationControls } from "@/shared";

type ActiveTab = "attendance" | "corrections";

const corrStatusVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const tabItems = [
  { id: "attendance" as ActiveTab, label: "Staff Attendance", icon: "badge" },
  { id: "corrections" as ActiveTab, label: "Correction Requests", icon: "rate_review" },
];

export default function HrAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: organizations } = useCachedQuery(
    "hr:attendance:orgs",
    () => resourceApi.listOrganizations(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const { data: teams } = useCachedQuery(
    "hr:attendance:teams",
    () => resourceApi.listGroups({ active_only: true }),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("attendance");
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [corrStatusFilter, setCorrStatusFilter] = useState("");
  const [attPage, setAttPage] = useState(1);
  const [attPerPage, setAttPerPage] = useState(25);
  const [corrPage, setCorrPage] = useState(1);
  const [corrPerPage, setCorrPerPage] = useState(25);
  const [slideOver, setSlideOver] = useState<{
    userId: string;
    userName: string;
    workDate: string;
  } | null>(null);
  const [reviewingItem, setReviewingItem] = useState<AdminCorrectionRow | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Trend: last 30 days
  const trendFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: trendData } = useCachedQuery(
    `hr:attendance:trend:${trendFrom}:${todayStr}`,
    () => attendanceApi.getTrend(trendFrom, todayStr),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  // Compute max value for chart scaling
  const trendMax = useMemo(() => {
    const data = (trendData ?? []) as Array<{ present: number; late: number; absent: number }>;
    return Math.max(10, ...data.map(d => (d.present || 0) + (d.late || 0) + (d.absent || 0)));
  }, [trendData]);

  const { data: stats } = useCachedQuery(
    `hr:attendance:stats:${todayStr}`,
    () => attendanceApi.getStats(todayStr),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: attendanceData, loading: attLoading } = useCachedQuery(
    `hr:attendance:list:${dateFrom}:${dateTo}:${statusFilter}:${orgFilter}:${teamFilter}:${attPage}:${attPerPage}`,
    () =>
      attendanceApi.listRecords({
        from: dateFrom,
        to: dateTo,
        status: statusFilter || undefined,
        org_id: orgFilter || undefined,
        team_id: teamFilter || undefined,
        page: attPage,
        per_page: attPerPage,
      }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const { data: correctionsData, loading: corrLoading } = useCachedQuery(
    `hr:attendance:corrections:${corrStatusFilter}:${corrPage}:${corrPerPage}`,
    () => attendanceApi.listCorrections({ 
      status: corrStatusFilter || undefined,
      page: corrPage,
      per_page: corrPerPage,
    }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const pagedRows: StaffDailyRow[] = (attendanceData as any)?.items || [];
  const attTotalPages = (attendanceData as any)?.meta?.pages || 1;
  const attTotalCount = (attendanceData as any)?.meta?.total || 0;
  const attSafePage = attPage; // Use directly since server handles out-of-bounds

  const pagedCorrections: AdminCorrectionRow[] = (correctionsData as any)?.items || [];
  const corrTotalPages = (correctionsData as any)?.meta?.pages || 1;
  const corrTotalCount = (correctionsData as any)?.meta?.total || 0;
  const corrSafePage = corrPage;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const res = await attendanceApi.listRecords({
        from: dateFrom,
        to: dateTo,
        status: statusFilter || undefined,
        org_id: orgFilter || undefined,
        team_id: teamFilter || undefined,
        page: 1,
        per_page: 10000,
      });

      const records = res.items || [];
      if (records.length === 0) {
        showToast({ message: "No records to export." });
        return;
      }

      const headers = ["Staff Name", "Email", "Date", "Clock In", "Clock Out", "Worked", "Late", "Mode", "Status"];
      const rows = records.map((row: any) => [
        `"${row.user_name}"`,
        `"${row.email}"`,
        `"${formatDate(row.work_date)}"`,
        `"${formatTime(row.first_in_at)}"`,
        `"${formatTime(row.last_out_at)}"`,
      `"${formatDuration(row.worked_minutes)}"`,
      `"${row.late_minutes > 0 ? formatDuration(row.late_minutes) : "-"}"`,
      `"${row.attendance_mode ?? "-"}"`,
      `"${humanize(deriveAttendanceStatus(row))}"`,
    ].join(","));
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Records_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    } catch (err) {
      showToast({ message: "Failed to export CSV", tone: "danger" });
    } finally {
      setExportingCsv(false);
    }
  };

  const dailyColumns: ColumnDef<StaffDailyRow>[] = useMemo(() => [
    {
      header: "Staff",
      cell: (row) => (
        <div 
          className="cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (row.user_id) {
              navigate(`/hr/employees/${row.user_id}?tab=attendance`);
            }
          }}
        >
          <p className="font-semibold text-brand-700">{row.user_name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      )
    },
    {
      header: "Date",
      cell: (row) => formatDate(row.work_date)
    },
    {
      header: "Clock In",
      cell: (row) => formatTime(row.first_in_at)
    },
    {
      header: "Clock Out",
      cell: (row) => <TimeWithNextDay time={row.last_out_at} referenceDate={row.first_in_at} />
    },
    {
      header: "Worked",
      cell: (row) => formatDuration(row.worked_minutes)
    },
    {
      header: "Late",
      cell: (row) => row.late_minutes > 0 ? formatDuration(row.late_minutes) : "-"
    },
    {
      header: "Mode",
      cell: (row) => <Chip variant="neutral">{row.attendance_mode ?? "-"}</Chip>
    },
    {
      header: "Status",
      cell: (row) => (
        <Chip variant={toneFromStatus(deriveAttendanceStatus(row))}>
          {humanize(deriveAttendanceStatus(row))}
        </Chip>
      )
    },
    {
      header: "",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setSlideOver({ userId: row.user_id, userName: row.user_name, workDate: row.work_date });
          }}
        >
          Detail
        </Button>
      ),
      className: "text-right"
    }
  ], []);

  const correctionColumns: ColumnDef<AdminCorrectionRow>[] = useMemo(() => [
    {
      header: "Staff",
      cell: (c) => (
        <div 
          className="cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (c.user_id) {
              navigate(`/hr/employees/${c.user_id}?tab=attendance`);
            }
          }}
        >
          <p className="font-semibold text-brand-700">{c.user_name}</p>
          <p className="text-xs text-slate-500">{c.email}</p>
        </div>
      )
    },
    {
      header: "Date",
      cell: (c) => formatDate(c.work_date)
    },
    {
      header: "Type",
      cell: (c) => <span className="capitalize">{c.request_type.replace(/_/g, " ")}</span>
    },
    {
      header: "Reason",
      cell: (c) => c.reason,
      className: "max-w-xs truncate"
    },
    {
      header: "Status",
      cell: (c) => (
        <Chip variant={corrStatusVariant[c.status] ?? "neutral"}>
          {c.status}
        </Chip>
      )
    },
    {
      header: "",
      cell: (c) => c.status === "pending" ? (
        <Button
          size="sm"
          variant="ghost"
          requiredPermissions={["attendance.approve"]}
          onClick={(e) => {
            e.stopPropagation();
            setReviewingItem(c);
          }}
        >
          Review
        </Button>
      ) : null,
      className: "text-right"
    }
  ], []);

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-attendance"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[{ label: "HR", path: "/hr" }, { label: "Attendance" }]}
        title="Attendance"
        description="Monitor daily attendance, worked hours, and manage correction requests."
      />

      <div className="grid gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Today's Stats ({formatDate(todayStr)})
          </h3>
          <StatsGrid
            items={[
              {
                label: "Total Staff",
                value: String(stats?.total_staff ?? 0),
                tone: "neutral",
                icon: "group",
              },
              {
                label: "Clocked In",
                value: String(stats?.clocked_in ?? 0),
                tone: "success",
                icon: "login",
              },
              {
                label: "Late",
                value: String(stats?.late ?? 0),
                tone: "warning",
                icon: "schedule",
              },
              {
                label: "Absent / Not In",
                value: String(stats?.absent ?? 0),
                tone: "danger",
                icon: "person_off",
              },
            ]}
          />
        </div>

        {/* Attendance Trend: last 30 days */}
        {trendData && (trendData as any[]).length > 0 && (
          <SectionCard title="Attendance Trend (Last 30 Days)">
            <div className="flex gap-1 items-end h-40 overflow-x-auto pb-2">
              {(trendData as Array<{ date: string; present: number; late: number; absent: number }>).map((day) => {
                const total = Math.max(1, day.present + day.late + day.absent);
                const presentPct = (day.present / trendMax) * 100;
                const latePct = (day.late / trendMax) * 100;
                const absentPct = (day.absent / trendMax) * 100;
                return (
                  <div key={day.date} className="flex-1 min-w-[8px] flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col h-32 justify-end">
                      <div
                        className="w-full bg-success/80 rounded-t-sm"
                        style={{ height: `${presentPct}%` }}
                        title={`Present: ${day.present}`}
                      />
                      <div
                        className="w-full bg-warning/80"
                        style={{ height: `${latePct}%` }}
                        title={`Late: ${day.late}`}
                      />
                      <div
                        className="w-full bg-danger/80 rounded-b-sm"
                        style={{ height: `${absentPct}%` }}
                        title={`Absent: ${day.absent}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 rotate-45 origin-left">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-success/80 rounded-sm" /> Present</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-warning/80 rounded-sm" /> Late</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-danger/80 rounded-sm" /> Absent</span>
            </div>
          </SectionCard>
        )}

        <SidebarTabs items={tabItems} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as ActiveTab)}>
          {activeTab === "attendance" && (
            <SectionCard
              title="Staff Attendance"
              description="Records for the selected date range."
              action={
                <Button variant="secondary" size="sm" onClick={handleExportCsv} className="gap-2" disabled={exportingCsv}>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  {exportingCsv ? "Exporting..." : "Export CSV"}
                </Button>
              }
            >
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <TextField
                  label="From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setAttPage(1); }}
                />
                <TextField
                  label="To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setAttPage(1); }}
                />
                <SelectField
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setAttPage(1); }}
                >
                  <option value="">All statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </SelectField>
                <SelectField
                  label="Organization"
                  value={orgFilter}
                  onChange={(e) => { setOrgFilter(e.target.value); setAttPage(1); }}
                >
                  <option value="">All organizations</option>
                  {(organizations ?? []).map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </SelectField>
                <SelectField
                  label="Team"
                  value={teamFilter}
                  onChange={(e) => { setTeamFilter(e.target.value); setAttPage(1); }}
                >
                  <option value="">All teams</option>
                  {(teams ?? []).map((team: any) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </SelectField>
              </div>

              <DataTable
                columns={dailyColumns}
                data={pagedRows}
                loading={attLoading}
                error={null}
                caption="Daily Attendance"
                emptyTitle="No attendance records"
                emptyDescription="No attendance records for this period."
                onRowClick={(row) => setSlideOver({ userId: row.user_id, userName: row.user_name, workDate: row.work_date })}
                pagination={{
                  page: attSafePage,
                  totalPages: attTotalPages,
                  totalCount: attTotalCount,
                  perPage: attPerPage,
                  onPageChange: setAttPage,
                  onPerPageChange: (value) => {
                    setAttPerPage(value);
                    setAttPage(1);
                  },
                }}
              />
            </SectionCard>
          )}

          {activeTab === "corrections" && (
            <SectionCard
              title="Correction Requests"
              description="Pending and recent attendance corrections submitted by staff."
              action={
                <SelectField
                  label=""
                  value={corrStatusFilter}
                  onChange={(e) => { setCorrStatusFilter(e.target.value); setCorrPage(1); }}
                  className="w-[160px]"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </SelectField>
              }
            >
              <DataTable
                columns={correctionColumns}
                data={pagedCorrections}
                loading={corrLoading}
                error={null}
                caption="Correction Requests"
                emptyTitle="No correction requests"
                emptyDescription="Staff correction requests will appear here."
                pagination={{
                  page: corrSafePage,
                  totalPages: corrTotalPages,
                  totalCount: corrTotalCount,
                  perPage: corrPerPage,
                  onPageChange: setCorrPage,
                  onPerPageChange: (value) => {
                    setCorrPerPage(value);
                    setCorrPage(1);
                  },
                }}
              />
            </SectionCard>
          )}
        </SidebarTabs>
      </div>

      {slideOver ? (
        <AttendanceRecordSlideOver
          userId={slideOver.userId}
          workDate={slideOver.workDate}
          employeeName={slideOver.userName}
          onClose={() => setSlideOver(null)}
        />
      ) : null}

      {reviewingItem ? (
        <CorrectionReviewSlideOver
          correction={reviewingItem}
          onClose={() => setReviewingItem(null)}
          onReviewed={() => {
            setReviewingItem(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}