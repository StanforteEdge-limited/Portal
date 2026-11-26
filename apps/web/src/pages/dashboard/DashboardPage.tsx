import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { SelectBox } from "@/components/ui/select";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { httpRequest, useCachedQuery } from "@/shared/lib/core";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { loadStoredTasks, TASKS_UPDATED_EVENT } from "@/pages/tasks/task-store";
import {
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
  UserCheck,
  FileText,
  Play,
  Square,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Receipt,
  Download,
  Sun,
  Leaf,
  Coffee,
  Zap,
  Home,
  Users,
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  PieChart,
  GripVertical,
  Search,
  Filter,
} from "lucide-react";
import { getMyAttendance, clockIn, clockOut, type MyAttendanceResponse } from "@/pages/hr/attendance/attendance-api";
import { listRequests, getMyLeaveBalance, type RequestRecord, type LeaveBalanceSummary } from "@/pages/requests/requests-api";
import { listMyPayslips } from "@/shared/api/payroll-api";
import { type TaskItem } from "@/pages/tasks/types";

type AttendancePeriod = "this_week" | "last_week" | "this_month" | "last_30_days";

function getDateRangeForPeriod(period: AttendancePeriod): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const fromDate = new Date(now);

  if (period === "this_week") {
    // Start of current week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    fromDate.setDate(diff);
  } else if (period === "last_week") {
    const day = now.getDay();
    const diff = now.getDate() - day - 6 + (day === 0 ? -6 : 1);
    fromDate.setDate(diff);
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 6);
    return {
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
    };
  } else if (period === "this_month") {
    fromDate.setDate(1);
  } else if (period === "last_30_days") {
    fromDate.setDate(now.getDate() - 30);
  }

  return {
    from: fromDate.toISOString().split("T")[0],
    to,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const { colleagues } = useColleagues();

  // -------------------------------------------------------------
  // Live Clock (Africa/Lagos)
  // -------------------------------------------------------------
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // -------------------------------------------------------------
  // Admin Live Metrics & Filters
  // -------------------------------------------------------------
  const { data: adminEmployeesRes, loading: loadingAdminEmployees } = useCachedQuery(
    isAdminView ? "admin-dash:employees:live" : "admin-dash:employees:idle",
    () => (isAdminView ? httpRequest<any>("/employees?per_page=50").catch(() => null) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );
  const { data: adminRequestsRes, loading: loadingAdminRequests } = useCachedQuery(
    isAdminView ? "admin-dash:requests:live" : "admin-dash:requests:idle",
    () => (isAdminView ? httpRequest<any>("/requests?per_page=50").catch(() => null) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );
  const { data: adminApprovalsRes, loading: loadingAdminApprovals } = useCachedQuery(
    isAdminView ? "admin-dash:approvals:live" : "admin-dash:approvals:idle",
    () => (isAdminView ? httpRequest<any>("/requests/approvals?per_page=50").catch(() => null) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );

  const adminEmployees = useMemo<any[]>(() => {
    const raw = adminEmployeesRes?.data?.items ?? adminEmployeesRes?.items ?? adminEmployeesRes?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [adminEmployeesRes]);

  const adminApprovals = useMemo<any[]>(() => {
    const raw = adminApprovalsRes?.data?.items ?? adminApprovalsRes?.items ?? adminApprovalsRes?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [adminApprovalsRes]);

  const adminTotalEmployees =
    adminEmployeesRes?.data?.meta?.total ?? adminEmployeesRes?.meta?.total ?? adminEmployees.length;
  const adminTotalRequests =
    adminRequestsRes?.data?.meta?.total ?? adminRequestsRes?.meta?.total ?? (Array.isArray(adminRequestsRes?.data?.items) ? adminRequestsRes.data.items.length : 0);
  const adminPendingApprovalsCount =
    adminApprovalsRes?.data?.meta?.total ?? adminApprovalsRes?.meta?.total ?? adminApprovals.length;
  const adminLoading = loadingAdminEmployees || loadingAdminRequests || loadingAdminApprovals;

  // Admin filter states
  const [adminApprovalWorkflowType, setAdminApprovalWorkflowType] = useState<string>("all");
  const [adminApprovalSearch, setAdminApprovalSearch] = useState<string>("");
  const [adminTaskFilter, setAdminTaskFilter] = useState<string>("all");
  const [adminStaffSearch, setAdminStaffSearch] = useState<string>("");

  const filteredAdminApprovals = useMemo(() => {
    return adminApprovals.filter((item: any) => {
      const title = String(item.title || item.request_type?.name || "").toLowerCase();
      const ref = String(item.reference_number || "").toLowerCase();
      const requester = String(item.requester_name || item.requester?.email || "").toLowerCase();
      const s = adminApprovalSearch.toLowerCase().trim();

      const matchesSearch = !s || title.includes(s) || ref.includes(s) || requester.includes(s);
      if (!matchesSearch) return false;

      if (adminApprovalWorkflowType === "all") return true;
      const wfType = String(item.request_type?.workflow_type || item.workflow_type || "").toLowerCase();
      return wfType.includes(adminApprovalWorkflowType.toLowerCase());
    });
  }, [adminApprovals, adminApprovalSearch, adminApprovalWorkflowType]);

  const filteredAdminEmployees = useMemo(() => {
    if (!adminStaffSearch.trim()) return adminEmployees.slice(0, 5);
    const q = adminStaffSearch.toLowerCase();
    return adminEmployees.filter((emp: any) => {
      const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
      const email = String(emp.email || "").toLowerCase();
      const title = String(emp.job_title || "").toLowerCase();
      return name.includes(q) || email.includes(q) || title.includes(q);
    }).slice(0, 5);
  }, [adminEmployees, adminStaffSearch]);

  // Organization tasks (live sync with task-store)
  const [orgTasks, setOrgTasks] = useState<TaskItem[]>(() => loadStoredTasks());
  useEffect(() => {
    const sync = () => setOrgTasks(loadStoredTasks());
    window.addEventListener(TASKS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const [draggedDashboardTaskId, setDraggedDashboardTaskId] = useState<string | null>(null);
  const [dragOverDashboardTaskId, setDragOverDashboardTaskId] = useState<string | null>(null);

  const handleReorderDashboardTask = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    setOrgTasks((prev) => {
      const sourceIndex = prev.findIndex((t) => t.id === sourceId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      try {
        localStorage.setItem("portal_tasks_data", JSON.stringify(next));
        window.dispatchEvent(new Event(TASKS_UPDATED_EVENT));
      } catch {}
      return next;
    });
  };

  const filteredOrgTasks = useMemo(() => {
    if (adminTaskFilter === "all") return orgTasks;
    return orgTasks.filter((t) => t.status === adminTaskFilter);
  }, [orgTasks, adminTaskFilter]);

  const orgTasksInProgress = orgTasks.filter((t) => t.status === "in_progress").length;
  const orgTasksBlocked = orgTasks.filter((t) => t.status === "blocked").length;

  // -------------------------------------------------------------
  // Employee View: Live Attendance, Requests, Leave & Payslips
  // -------------------------------------------------------------
  const [attendancePeriod, setAttendancePeriod] = useState<AttendancePeriod>("this_week");
  const [attendanceData, setAttendanceData] = useState<MyAttendanceResponse | null>(null);
  const [clocking, setClocking] = useState(false);

  const loadAttendance = async (period: AttendancePeriod) => {
    try {
      const range = getDateRangeForPeriod(period);
      const res = await getMyAttendance(range);
      setAttendanceData(res);
    } catch {
      // Keep existing data on error
    }
  };

  useEffect(() => {
    void loadAttendance(attendancePeriod);
  }, [attendancePeriod]);

  const isClockedIn = Boolean(attendanceData?.current_state?.is_clocked_in);

  const handleToggleClock = async () => {
    setClocking(true);
    try {
      if (isClockedIn) {
        await clockOut({ source: "web", attendance_mode: "onsite" });
        showToast("Successfully clocked out for today", "success");
      } else {
        await clockIn({ source: "web", attendance_mode: "onsite" });
        showToast("Successfully clocked in for today", "success");
      }
      await loadAttendance(attendancePeriod);
    } catch (err: any) {
      showToast(err?.message || "Failed to update clock status", "error");
    } finally {
      setClocking(false);
    }
  };

  // Dynamic Shift Timing & Worked duration
  const shiftStartTime = attendanceData?.policy?.start_time || "09:00";
  const shiftEndTime = attendanceData?.policy?.end_time || "17:00";
  const workedMinutesToday = useMemo(() => {
    let total = attendanceData?.today?.worked_minutes || 0;
    if (isClockedIn && attendanceData?.current_state?.last_clock_in_at) {
      const clockInTime = new Date(attendanceData.current_state.last_clock_in_at).getTime();
      const now = currentTime.getTime();
      const elapsedMinutes = Math.max(0, Math.floor((now - clockInTime) / 60000));
      total = Math.max(total, elapsedMinutes);
    }
    return total;
  }, [attendanceData, isClockedIn, currentTime]);

  const workedHoursStr = `${Math.floor(workedMinutesToday / 60)}h ${String(workedMinutesToday % 60).padStart(2, "0")}m`;
  const workedPercent = Math.min(100, Math.round((workedMinutesToday / 480) * 100));

  // Dynamic Weekly Rhythm bars from live attendance daily records
  const dynamicRhythm = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyRecords = attendanceData?.daily || [];
    const todayDayIndex = (currentTime.getDay() + 6) % 7; // Mon=0..Sun=6

    let totalWorked = 0;
    let totalScheduled = 0;

    const result = days.map((dayName, idx) => {
      const isToday = idx === todayDayIndex;
      const isWeekend = idx >= 5;

      // Find matching daily entry by work_date
      const entry = dailyRecords.find((d) => {
        const dDate = new Date(d.work_date);
        const dDayIdx = (dDate.getDay() + 6) % 7;
        return dDayIdx === idx;
      });

      const schedMin = entry?.scheduled_minutes || 480;
      const workedMin = isToday ? workedMinutesToday : (entry?.worked_minutes || 0);

      if (!isWeekend) {
        totalWorked += workedMin;
        totalScheduled += schedMin;
      }

      const rate = schedMin > 0 ? Math.min(100, Math.round((workedMin / schedMin) * 100)) : 0;
      const height = rate > 0 ? `${rate}%` : isToday && isClockedIn ? "15%" : "8%";

      return {
        day: dayName,
        rate,
        height,
        isToday,
        isWeekend,
      };
    });

    const averageRate = totalScheduled > 0 ? Math.min(100, Math.round((totalWorked / totalScheduled) * 100)) : (isClockedIn ? 96 : 0);

    return { bars: result, averageRate };
  }, [attendanceData, workedMinutesToday, currentTime, isClockedIn]);

  // Live Leave Balance API
  const { data: leaveBalanceRes } = useCachedQuery(
    "dash:leave:balance",
    () => getMyLeaveBalance().catch(() => null),
    { ttlMs: 60_000, storage: "memory" }
  );

  const leaveRemainingDays = useMemo(() => {
    const summaries: LeaveBalanceSummary[] = leaveBalanceRes?.summary ?? [];
    if (summaries.length === 0) return 20;
    return summaries.reduce((acc, item) => acc + (item.available_days ?? item.entitled_days ?? 0), 0);
  }, [leaveBalanceRes]);

  // Live Requests API & Filter
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const { data: userRequestsRes, loading: userRequestsLoading } = useCachedQuery(
    "dash:user:requests",
    () => listRequests({ per_page: 30 }).catch(() => []),
    { ttlMs: 30_000, storage: "memory" }
  );

  const userRequests: RequestRecord[] = Array.isArray(userRequestsRes)
    ? userRequestsRes
    : (userRequestsRes as any)?.data?.items ?? (userRequestsRes as any)?.items ?? [];

  const pendingUserRequestsCount = useMemo(() => {
    return userRequests.filter((r) => ["submitted", "in_review", "pending", "pending_review"].includes(String(r.status).toLowerCase())).length;
  }, [userRequests]);

  const filteredUserRequests = useMemo(() => {
    if (requestFilter === "all") return userRequests;
    if (requestFilter === "pending") {
      return userRequests.filter((r) => ["submitted", "in_review", "pending", "pending_review"].includes(String(r.status).toLowerCase()));
    }
    if (requestFilter === "approved") {
      return userRequests.filter((r) => ["approved", "completed", "disbursed", "closed"].includes(String(r.status).toLowerCase()));
    }
    if (requestFilter === "rejected") {
      return userRequests.filter((r) => ["rejected", "declined", "returned"].includes(String(r.status).toLowerCase()));
    }
    return userRequests;
  }, [userRequests, requestFilter]);

  // Live Payslips API
  const { data: payslipsRes } = useCachedQuery(
    "dash:user:payslips",
    () => listMyPayslips({ page: 1, per_page: 5 }).catch(() => null),
    { ttlMs: 60_000, storage: "memory" }
  );

  const latestPayslip = useMemo(() => {
    const items = Array.isArray(payslipsRes?.data) ? payslipsRes.data : [];
    return items[0] || null;
  }, [payslipsRes]);

  const formatCurrency = (amount?: number) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
  };

  const firstName = user?.first_name || user?.username || "Colleague";

  // -------------------------------------------------------------
  // RENDER: ADMIN CONSOLE VIEW
  // -------------------------------------------------------------
  if (isAdminView) {
    return (
      <PortalLayout activeNav="Admin Console">
        <div className="space-y-6 max-w-[1440px] mx-auto pb-12 font-sans">
          {/* Page Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-neutral-900/[0.08]">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-[28px] leading-tight font-medium text-neutral-900 tracking-tight font-headline">
                Admin console
              </h1>
              <p className="text-sm text-neutral-500 max-w-2xl">
                Organization directory, pending approval queues, and staff deliverables.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to="/requests/approvals"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-900/[0.10] text-sm font-medium transition-colors duration-150"
              >
                <FileCheck className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                <span>Approval queue</span>
                {adminPendingApprovalsCount > 0 ? (
                  <span className="font-mono text-xs text-[#c2410c] tabular-nums font-semibold">
                    {adminPendingApprovalsCount}
                  </span>
                ) : null}
              </Link>

              <Link
                to="/tasks?new=1"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Assign task</span>
              </Link>
            </div>
          </header>

          {/* Row 1: 4 Compact Numbers-Only KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Link
              to="/admin/users"
              className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex flex-col justify-between gap-1 sm:space-y-2"
            >
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Active staff</p>
              <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {adminLoading ? "—" : adminTotalEmployees.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Registered directory members</p>
            </Link>

            <Link
              to="/requests/approvals"
              className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex flex-col justify-between gap-1 sm:space-y-2"
            >
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Pending approvals</p>
              <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-[#c2410c] font-headline tabular-nums">
                {adminLoading ? "—" : adminPendingApprovalsCount.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Awaiting review action</p>
            </Link>

            <Link
              to="/requests"
              className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex flex-col justify-between gap-1 sm:space-y-2"
            >
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Total requests</p>
              <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {adminLoading ? "—" : adminTotalRequests.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Tracked across all workflows</p>
            </Link>

            <Link
              to="/tasks"
              className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex flex-col justify-between gap-1 sm:space-y-2"
            >
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Staff tasks</p>
              <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {orgTasks.length}
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 tabular-nums truncate hidden sm:block">
                {orgTasksInProgress} in progress · {orgTasksBlocked} in review
              </p>
            </Link>
          </section>

          {/* Row 2: Operational Queues & Task Board with Integrated Filters */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* Pending Approval Queue (Live API + Filtering) */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-900/[0.08]">
                  <div>
                    <h2 className="text-base font-medium text-neutral-900 font-headline">
                      Approval queue
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Leave applications, payment vouchers, and requisitions awaiting sign-off
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-36 sm:w-44">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={adminApprovalSearch}
                        onChange={(e) => setAdminApprovalSearch(e.target.value)}
                        placeholder="Search queue..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#ff6900]"
                      />
                    </div>
                    <SelectBox
                      value={adminApprovalWorkflowType}
                      onChange={(e) => setAdminApprovalWorkflowType(e.target.value)}
                      className="h-8 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-lg px-2 text-neutral-700"
                    >
                      <option value="all">All Types</option>
                      <option value="leave">Leave</option>
                      <option value="voucher">Vouchers</option>
                      <option value="procurement">Procurement</option>
                    </SelectBox>
                  </div>
                </div>

                {filteredAdminApprovals.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <p className="text-sm font-medium text-neutral-900">No approvals match criteria</p>
                    <p className="text-xs text-neutral-500">
                      {adminApprovals.length === 0
                        ? "New leave requests, requisitions, and vouchers will appear here."
                        : "Try selecting another workflow type or clearing your search filter."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900/[0.06] mt-1">
                    {filteredAdminApprovals.slice(0, 5).map((item: any) => (
                      <Link
                        key={item.id}
                        to={`/requests/approvals/${item.id}`}
                        className="py-3.5 flex items-center justify-between gap-4 hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {item.reference_number ? (
                              <span className="font-mono text-xs text-neutral-500 tabular-nums shrink-0">
                                {item.reference_number}
                              </span>
                            ) : null}
                            <span className="text-sm font-medium text-neutral-900 truncate">
                              {item.title || item.request_type?.name || "Workflow request"}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 truncate">
                            {item.requester_name || item.requester?.email || "Staff submission"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-600/15">
                            Pending
                          </span>
                          <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700" strokeWidth={1.5} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff Tasks (Live Store + Status Filtering + Drag Reorder) */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-900/[0.08]">
                  <div>
                    <h2 className="text-base font-medium text-neutral-900 font-headline">
                      Staff tasks
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Active deliverables and items in review across teams
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SelectBox
                      value={adminTaskFilter}
                      onChange={(e) => setAdminTaskFilter(e.target.value)}
                      className="h-8 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-lg px-2 text-neutral-700"
                    >
                      <option value="all">All Statuses ({orgTasks.length})</option>
                      <option value="in_progress">In Progress ({orgTasksInProgress})</option>
                      <option value="blocked">In Review ({orgTasksBlocked})</option>
                      <option value="completed">Completed</option>
                    </SelectBox>
                    <Link
                      to="/tasks"
                      className="text-xs font-medium text-[#ff6900] hover:underline inline-flex items-center gap-0.5 shrink-0"
                    >
                      <span>Board</span>
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>

                {filteredOrgTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No tasks match the selected status filter.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900/[0.06] mt-1">
                    {filteredOrgTasks.slice(0, 5).map((task) => {
                      const statusLabel =
                        task.status === "in_progress"
                          ? "In progress"
                          : task.status === "blocked"
                          ? "In review"
                          : task.status === "completed"
                          ? "Completed"
                          : "Planned";
                      const statusBadge =
                        task.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                          : task.status === "blocked"
                          ? "bg-amber-50 text-amber-800 border-amber-600/15"
                          : "bg-neutral-100 text-neutral-700 border-neutral-900/[0.08]";

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedDashboardTaskId(task.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedDashboardTaskId(null);
                            setDragOverDashboardTaskId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverDashboardTaskId !== task.id) {
                              setDragOverDashboardTaskId(task.id);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const sourceId = e.dataTransfer.getData("text/plain") || draggedDashboardTaskId;
                            if (sourceId) handleReorderDashboardTask(sourceId, task.id);
                            setDraggedDashboardTaskId(null);
                            setDragOverDashboardTaskId(null);
                          }}
                          className={`py-3.5 -mx-2 px-2 hover:bg-neutral-50 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 group cursor-grab active:cursor-grabbing ${
                            draggedDashboardTaskId === task.id ? "opacity-45" : ""
                          } ${
                            dragOverDashboardTaskId === task.id && draggedDashboardTaskId !== task.id
                              ? "border-t-2 border-t-[#ff6900]"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <GripVertical
                              className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 shrink-0"
                              strokeWidth={1.5}
                            />
                            <Link to="/tasks" className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-neutral-900 truncate">
                                {task.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                                <span className="truncate">
                                  {task.assignees?.length
                                    ? task.assignees.map((a) => a.name).join(", ")
                                    : "Unassigned"}
                                </span>
                                {task.project_name ? (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{task.project_name}</span>
                                  </>
                                ) : null}
                              </div>
                            </Link>
                          </div>

                          <Link to="/tasks" className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-mono text-neutral-500 capitalize">
                              {task.priority}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700" strokeWidth={1.5} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 cols: Management Shortcuts + Filtered Directory */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <h2 className="text-base font-medium text-neutral-900 font-headline pb-3 border-b border-neutral-900/[0.08]">
                  Management shortcuts
                </h2>

                <nav className="divide-y divide-neutral-900/[0.06] mt-1">
                  {[
                    { to: "/admin/users", icon: UserCheck, label: "Staff directory", sub: "Accounts, onboarding, and access" },
                    { to: "/hr/attendance", icon: Clock, label: "Workforce attendance", sub: "Check-ins, shifts, and logs" },
                    { to: "/hr/leave", icon: Calendar, label: "Leave management", sub: "Approve time off and absences" },
                    { to: "/admin/payroll/authorization", icon: CreditCard, label: "Payroll authorization", sub: "Review and sign off monthly runs" },
                    { to: "/finance/payment-vouchers", icon: Receipt, label: "Payment vouchers", sub: "Disbursements and retirements" },
                    { to: "/analytics", icon: PieChart, label: "Organization analytics", sub: "Request pipeline and unit breakdown" },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="py-3 -mx-2 px-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemIcon className="h-4 w-4 text-neutral-500 group-hover:text-neutral-900 shrink-0" strokeWidth={1.5} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-900 truncate">{item.label}</div>
                            <div className="text-xs text-neutral-500 truncate">{item.sub}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" strokeWidth={1.5} />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Live Directory Snapshot with Search */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-900/[0.08]">
                  <h2 className="text-base font-medium text-neutral-900 font-headline">
                    Directory snapshot
                  </h2>
                  <div className="relative w-full sm:w-36">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" />
                    <input
                      type="text"
                      value={adminStaffSearch}
                      onChange={(e) => setAdminStaffSearch(e.target.value)}
                      placeholder="Filter staff..."
                      className="w-full pl-7 pr-2 py-0.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#ff6900]"
                    />
                  </div>
                </div>

                {filteredAdminEmployees.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6 text-center">
                    {adminEmployees.length === 0 ? "No employee records loaded yet." : "No staff match your search."}
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-900/[0.06] mt-1">
                    {filteredAdminEmployees.map((emp: any) => {
                      const fullName =
                        [emp.first_name, emp.last_name].filter(Boolean).join(" ") ||
                        emp.full_name ||
                        emp.email ||
                        "Staff member";
                      const initialsText = fullName
                        .split(" ")
                        .map((part: string) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <Link
                          key={emp.id}
                          to={`/hr/employees/${emp.id}`}
                          className="py-3 -mx-2 px-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-neutral-100 text-neutral-700 font-medium text-xs flex items-center justify-center shrink-0">
                              {initialsText}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-neutral-900 truncate">
                                {fullName}
                              </div>
                              <div className="text-xs text-neutral-500 truncate">
                                {emp.job_title || emp.email || "Active member"}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-neutral-500 capitalize shrink-0">
                            {emp.employment_status || emp.status || "active"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </PortalLayout>
    );
  }

  // -------------------------------------------------------------
  // RENDER: EMPLOYEE WORKSPACE VIEW
  // -------------------------------------------------------------
  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-neutral-900/[0.08]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] leading-tight font-medium text-neutral-900 tracking-tight font-headline">
              Workspace overview
            </h1>
            <p className="text-sm text-neutral-500">
              Attendance, active requests, and team updates for {firstName}.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-sm font-medium text-neutral-900 tabular-nums">{formattedDate}</div>
            <div className="text-xs text-neutral-500">Active shift cycle</div>
          </div>
        </header>

        {/* Row 1: Compact Quick-Link Metric Cards (Live Data) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Leave Balance */}
          <Link
            to="/leave"
            className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-0.5 sm:space-y-1.5 min-w-0">
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">Leave balance</div>
              <div className="text-lg sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums truncate">
                {leaveRemainingDays} days
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150 shrink-0" strokeWidth={1.5} />
          </Link>

          {/* Card 2: Attendance Status */}
          <Link
            to="/attendance"
            className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-0.5 sm:space-y-1.5 min-w-0">
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">Attendance log</div>
              <div className="text-lg sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums truncate">
                {isClockedIn ? "Clocked In" : "Not In"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150 shrink-0" strokeWidth={1.5} />
          </Link>

          {/* Card 3: Active Requests */}
          <Link
            to="/requests"
            className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-0.5 sm:space-y-1.5 min-w-0">
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">Requests queue</div>
              <div className="text-lg sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums truncate">
                {pendingUserRequestsCount > 0 ? `${pendingUserRequestsCount} Pending` : `${userRequests.length} Total`}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150 shrink-0" strokeWidth={1.5} />
          </Link>

          {/* Card 4: Payslips */}
          <Link
            to="/account/payslips"
            className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-0.5 sm:space-y-1.5 min-w-0">
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">Latest payslip</div>
              <div className="text-base sm:text-2xl leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums truncate">
                {latestPayslip ? formatCurrency(latestPayslip.net_pay) : "Verified"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150 shrink-0" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Row 2: Shift Status & Attendance Rhythm (with live period filter) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Today's Shift Card */}
          <div className="lg:col-span-8 space-y-5 flex flex-col justify-between">
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900">Today&apos;s Shift</h2>
                {isClockedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Shift Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    <span>Not Clocked In</span>
                  </span>
                )}
              </div>

              {/* Time & Hours */}
              <div className="flex items-center gap-3.5 pt-1">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isClockedIn ? "bg-orange-50 text-[#ff6900]" : "bg-neutral-100 text-neutral-500"
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900 font-headline">
                    {shiftStartTime} – {shiftEndTime}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">
                    {isClockedIn
                      ? `${workedHoursStr} worked today • Shift active`
                      : "0h 00m worked today • You have not clocked in yet"}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isClockedIn ? "bg-[#C2410C]" : "bg-neutral-300"
                    }`}
                    style={{ width: `${workedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-neutral-500 shrink-0 tabular-nums">
                  {workedHoursStr} / 8h
                </span>
              </div>

              {/* Sub-Metrics Row */}
              <div className="mt-6 pt-5 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <Coffee className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-neutral-500">Break Allocation: </span>
                    <span className="font-medium text-neutral-800">60 mins</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-neutral-500">Grace Period: </span>
                    <span className="font-medium text-neutral-800">
                      {attendanceData?.policy?.grace_minutes ?? 15} mins
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="text-xs">
                    <span className="text-neutral-500">Overtime Policy: </span>
                    <span className="font-medium text-neutral-800">1.5x hourly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Rhythm with Live Filter */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">Attendance Rhythm</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Your daily check-ins and performance history</p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-xs font-medium text-neutral-400">Attendance Rate</div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-lg font-semibold text-neutral-900 tabular-nums">
                        {dynamicRhythm.averageRate}%
                      </span>
                      {dynamicRhythm.averageRate >= 90 ? (
                        <span className="text-xs font-medium text-emerald-600 flex items-center">
                          ↑ Good
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-36">
                    <SelectBox
                      value={attendancePeriod}
                      onChange={(e) => setAttendancePeriod(e.target.value as AttendancePeriod)}
                      className="h-8 px-3 py-1 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 shadow-2xs"
                    >
                      <option value="this_week">This Week</option>
                      <option value="last_week">Last Week</option>
                      <option value="this_month">This Month</option>
                      <option value="last_30_days">Last 30 Days</option>
                    </SelectBox>
                  </div>
                </div>
              </div>

              {/* 7 Daily Rhythm Bar Columns */}
              <div className="relative pt-2">
                <div className="grid grid-cols-7 gap-3 items-end">
                  {dynamicRhythm.bars.map((item) => (
                    <div key={item.day} className="flex flex-col items-center gap-2">
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          item.isToday ? "text-[#c2410c] font-medium" : "text-neutral-500"
                        }`}
                      >
                        {item.rate}%
                      </span>
                      <div className="w-full max-w-[40px] bg-neutral-100 rounded-md h-28 flex flex-col justify-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            item.isToday
                              ? "bg-[#C2410C]"
                              : item.isWeekend
                              ? "bg-neutral-200"
                              : "bg-neutral-400"
                          }`}
                          style={{ height: item.height }}
                        />
                      </div>
                      <span
                        className={`text-xs ${
                          item.isToday ? "text-neutral-900 font-medium" : "text-neutral-500"
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900 font-headline">Quick actions</h2>
                <Link
                  to="/requests"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </div>

              <button
                type="button"
                onClick={handleToggleClock}
                disabled={clocking}
                className={`w-full h-10 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.98] cursor-pointer ${
                  isClockedIn
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "bg-[#C2410C] hover:bg-[#9A3412] text-white"
                }`}
              >
                {clocking ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : isClockedIn ? (
                  <>
                    <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Clock out</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Clock in</span>
                  </>
                )}
              </button>

              <div className="mt-5 divide-y divide-neutral-900/[0.06] border-t border-neutral-900/[0.06]">
                <Link
                  to="/requests/new"
                  className="py-3 px-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Plus className="h-4 w-4 text-neutral-500 group-hover:text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">New request</div>
                      <div className="text-xs text-neutral-500 truncate">Leave, claim, or requisition</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" strokeWidth={1.5} />
                </Link>

                <Link
                  to="/leave"
                  className="py-3 px-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="h-4 w-4 text-neutral-500 group-hover:text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">Apply for leave</div>
                      <div className="text-xs text-neutral-500 truncate">Check balance and request time off</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" strokeWidth={1.5} />
                </Link>

                <Link
                  to="/attendance"
                  className="py-3 px-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-4 w-4 text-neutral-500 group-hover:text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">Attendance log</div>
                      <div className="text-xs text-neutral-500 truncate">Daily, weekly, and monthly records</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" strokeWidth={1.5} />
                </Link>

                <Link
                  to="/account/payslips"
                  className="py-3 px-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Download className="h-4 w-4 text-neutral-500 group-hover:text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">Payslips</div>
                      <div className="text-xs text-neutral-500 truncate">Download monthly salary statements</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: My Recent Requests (Live API + Filtering) + Team Activity + Who's Out */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: My Recent Requests with Status Filter */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">My Recent Requests</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Tracking workflow submissions</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <SelectBox
                    value={requestFilter}
                    onChange={(e) => setRequestFilter(e.target.value)}
                    className="h-8 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-lg px-2 text-neutral-700"
                  >
                    <option value="all">All ({userRequests.length})</option>
                    <option value="pending">Pending ({pendingUserRequestsCount})</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </SelectBox>
                </div>
              </div>

              <div className="space-y-3 pt-3">
                {filteredUserRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
                    <p>No requests found for this filter.</p>
                    <Link
                      to="/requests/new"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff6900] hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Create new request</span>
                    </Link>
                  </div>
                ) : (
                  filteredUserRequests.slice(0, 4).map((req) => {
                    const statusStr = String(req.status || "submitted").toLowerCase();
                    const isApproved = ["approved", "completed", "disbursed", "closed"].includes(statusStr);
                    const isPending = ["submitted", "in_review", "pending", "pending_review"].includes(statusStr);
                    const badgeClass = isApproved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : isPending
                      ? "bg-amber-50 text-amber-700 border-amber-200/60"
                      : "bg-neutral-100 text-neutral-700 border-neutral-200";

                    return (
                      <Link
                        key={req.id}
                        to={`/requests`}
                        className="p-3 rounded-xl hover:bg-neutral-50 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-[#ff6900]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-neutral-900 group-hover:text-[#ff6900] transition truncate">
                              {req.request_type?.name || (req.data as any)?.title || (req.data as any)?.reason || "Request"}
                            </div>
                            <div className="text-xs text-neutral-400 truncate">
                              {req.request_number || req.voucher_number || (req.created_at ? new Date(req.created_at).toLocaleDateString() : "Recent")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${badgeClass}`}>
                            {req.status?.replace("_", " ") || "Submitted"}
                          </span>
                          <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 mt-4 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Total submitted: {userRequests.length}</span>
              <Link to="/requests" className="text-xs font-semibold text-[#ff6900] hover:underline flex items-center gap-0.5">
                <span>View All Requests</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Team Activity (Live Colleagues API) */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">Team Activity</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Active colleagues in directory</p>
                </div>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-3">
                {colleagues.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-6 text-center">No team members active.</p>
                ) : (
                  colleagues.slice(0, 4).map((colleague) => (
                    <div
                      key={colleague.id}
                      className="p-3 rounded-xl hover:bg-neutral-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full font-medium text-xs flex items-center justify-center shrink-0 bg-orange-100 text-[#ff6900]">
                          {colleague.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-neutral-900 truncate">{colleague.name}</div>
                          <div className="text-xs text-neutral-500 truncate">{colleague.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-xs text-neutral-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 mt-4 flex items-center justify-between">
              <span className="text-xs text-neutral-400">{colleagues.length} team members</span>
              <Link to="/chat" className="text-xs font-semibold text-[#ff6900] hover:underline flex items-center gap-0.5">
                <span>Open Chat</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Who's Out Today / Leave Directory */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">Who&apos;s Out Today</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Approved staff absences & leaves</p>
                </div>
                <Link
                  to="/leave"
                  className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5"
                >
                  <span>Leave Roster</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-3">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 text-center space-y-1.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-medium text-neutral-900">All Core Team Members Present</p>
                  <p className="text-[11px] text-neutral-400">
                    No approved overlapping absences recorded for today&apos;s shift.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-medium text-neutral-500 mb-2">Team on Duty:</div>
                  <div className="flex flex-wrap gap-2">
                    {colleagues.slice(0, 5).map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{c.name.split(" ")[0]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 mt-4 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Coverage: 100%</span>
              <Link to="/leave" className="text-xs font-semibold text-[#ff6900] hover:underline flex items-center gap-0.5">
                <span>Request Leave</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
