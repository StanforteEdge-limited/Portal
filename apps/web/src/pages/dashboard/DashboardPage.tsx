import { useEffect, useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { SelectBox } from "@/components/ui/select";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { httpRequest, useCachedQuery } from "@/shared/lib/core";
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
} from "lucide-react";
import { getMyAttendance, clockIn, clockOut, type MyAttendanceResponse } from "@/pages/hr/attendance/attendance-api";
import { INITIAL_TASKS, type TaskItem } from "@/pages/tasks/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;

  // Live organization metrics for Admin Console view
  const { data: adminEmployeesRes, loading: loadingAdminEmployees } = useCachedQuery(
    isAdminView ? "admin-dash:employees:live" : "admin-dash:employees:idle",
    () => (isAdminView ? httpRequest<any>("/employees?per_page=10").catch(() => null) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );
  const { data: adminRequestsRes, loading: loadingAdminRequests } = useCachedQuery(
    isAdminView ? "admin-dash:requests:live" : "admin-dash:requests:idle",
    () => (isAdminView ? httpRequest<any>("/requests?per_page=10").catch(() => null) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );
  const { data: adminApprovalsRes, loading: loadingAdminApprovals } = useCachedQuery(
    isAdminView ? "admin-dash:approvals:live" : "admin-dash:approvals:idle",
    () => (isAdminView ? httpRequest<any>("/requests/approvals?per_page=10").catch(() => null) : Promise.resolve(null)),
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

  // Load organization tasks for Admin Console view (with drag-and-drop reorder persistence)
  const [orgTasks, setOrgTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem("portal_tasks_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TASKS;
  });
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
      } catch {}
      return next;
    });
  };

  // Live Digital Clock in Nigeria WAT (Africa/Lagos)
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

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<MyAttendanceResponse | null>(null);
  const [clocking, setClocking] = useState(false);

  useEffect(() => {
    getMyAttendance()
      .then((res) => setAttendanceData(res))
      .catch(() => {
        // Fallback gracefully
      });
  }, []);

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
      const refreshed = await getMyAttendance();
      setAttendanceData(refreshed);
    } catch (err: any) {
      showToast(err?.message || "Failed to update clock status", "error");
    } finally {
      setClocking(false);
    }
  };

  // Staff Requests
  const myRecentRequests = [
    {
      id: "req-1",
      title: "Annual Leave",
      period: "Nov 20 – Nov 24, 2026",
      status: "Approved",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      icon: Calendar,
      iconColor: "bg-orange-50 text-[#ff6900]",
      link: "/leave",
    },
    {
      id: "req-2",
      title: "Work From Home",
      period: "Nov 10, 2026",
      status: "In Review",
      badgeColor: "bg-neutral-100 text-neutral-700 border-neutral-200",
      icon: Home,
      iconColor: "bg-rose-50 text-rose-600",
      link: "/requests",
    },
    {
      id: "req-3",
      title: "Medical Claim",
      period: "Oct 28, 2026",
      status: "Submitted",
      badgeColor: "bg-neutral-100 text-neutral-700 border-neutral-200/60",
      icon: FileText,
      iconColor: "bg-neutral-100 text-neutral-700",
      link: "/requests",
    },
  ];

  // Team Activity
  const teamActivities = [
    {
      name: "Amina Yusuf",
      avatar: "AT",
      avatarBg: "bg-neutral-100 text-neutral-700",
      status: "Checked in • 2 mins ago",
      dotColor: "bg-emerald-500",
    },
    {
      name: "Chinedu Kalu",
      avatar: "CK",
      avatarBg: "bg-orange-100 text-[#ff6900]",
      status: "Submitted a leave request • 1 hr ago",
      dotColor: "bg-orange-500",
    },
    {
      name: "Fatima Salim",
      avatar: "FS",
      avatarBg: "bg-neutral-100 text-neutral-600",
      status: "Checked out • 5 hrs ago",
      dotColor: "bg-neutral-400",
    },
  ];

  // Colleagues Out Today
  const colleaguesOutToday = [
    {
      name: "Ibrahim Bello",
      type: "Annual Leave",
      avatar: "IB",
      avatarBg: "bg-orange-100 text-orange-700",
      link: "/leave",
    },
    {
      name: "Oluwaseun Adebayo",
      type: "Medical Leave",
      avatar: "OA",
      avatarBg: "bg-amber-100 text-amber-700",
      link: "/leave",
    },
    {
      name: "Kemi Eze",
      type: "Personal Leave",
      avatar: "KE",
      avatarBg: "bg-neutral-100 text-neutral-700",
      link: "/leave",
    },
  ];

  // Attendance Rhythm Data (Mon - Sun)
  const weeklyRhythm = [
    { day: "Mon", rate: 96, height: "96%", isToday: false },
    { day: "Tue", rate: 98, height: "98%", isToday: false },
    { day: "Wed", rate: 97, height: "97%", isToday: false },
    { day: "Thu", rate: 95, height: "95%", isToday: true },
    { day: "Fri", rate: 99, height: "99%", isToday: false },
    { day: "Sat", rate: 88, height: "45%", isToday: false, isWeekend: true },
    { day: "Sun", rate: 82, height: "35%", isToday: false, isWeekend: true },
  ];

  const firstName = user?.first_name || "Daniel";

  // Admin Console metrics & lists
  const orgTasksInProgress = orgTasks.filter((t) => t.status === "in_progress").length;
  const orgTasksBlocked = orgTasks.filter((t) => t.status === "blocked").length;

  const adminPendingWorkflows = [
    {
      id: "wf-1",
      title: "Medical Leave Application (3 Days)",
      requester: "Oluwaseun Adebayo • Engineering",
      meta: "Nov 11 – Nov 13, 2026",
      badge: "Leave Approval",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: Calendar,
      iconColor: "bg-orange-50 text-[#ff6900]",
      link: "/hr/leave",
    },
    {
      id: "wf-2",
      title: "Annual Leave Request (5 Days)",
      requester: "Chinedu Kalu • Supply Chain",
      meta: "Nov 24 – Nov 28, 2026",
      badge: "Pending HR",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      icon: Calendar,
      iconColor: "bg-emerald-50 text-emerald-600",
      link: "/hr/leave",
    },
    {
      id: "wf-3",
      title: "PV-2026-089: Core Switch Rack Upgrade",
      requester: "Amina Yusuf • IT Infrastructure",
      meta: "₦420,000 • Payment Voucher",
      badge: "Awaiting Sign-Off",
      badgeColor: "bg-neutral-100 text-neutral-700 border-neutral-200",
      icon: Receipt,
      iconColor: "bg-neutral-100 text-neutral-700",
      link: "/finance/payment-vouchers",
    },
    {
      id: "wf-4",
      title: "PR-2026-042: Office Workstation Replacements",
      requester: "Fatima Salim • People & Operations",
      meta: "₦850,000 • Procurement Requisition",
      badge: "In Review",
      badgeColor: "bg-neutral-100 text-neutral-700 border-neutral-200",
      icon: FileCheck,
      iconColor: "bg-neutral-100 text-neutral-700",
      link: "/requests/approvals",
    },
  ];

  const workforceLiveRoster = [
    {
      name: "Amina Yusuf",
      department: "Engineering",
      avatar: "AY",
      avatarBg: "bg-neutral-100 text-neutral-700",
      time: "08:42 AM • Onsite HQ",
      status: "On Time",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    },
    {
      name: "Chinedu Eze",
      department: "Platform Engineering",
      avatar: "CE",
      avatarBg: "bg-orange-100 text-[#ff6900]",
      time: "08:50 AM • Onsite HQ",
      status: "On Time",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    },
    {
      name: "Folake Adeleke",
      department: "Product Design",
      avatar: "FA",
      avatarBg: "bg-neutral-100 text-neutral-700",
      time: "08:55 AM • Remote",
      status: "Remote",
      statusColor: "bg-neutral-100 text-neutral-700 border-neutral-200",
    },
    {
      name: "Tunde Bakare",
      department: "DevOps & Security",
      avatar: "TB",
      avatarBg: "bg-amber-100 text-amber-700",
      time: "09:18 AM • Onsite HQ",
      status: "Late (18m)",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200/60",
    },
  ];

  if (isAdminView) {
    return (
      <PortalLayout activeNav="Admin Console">
        <div className="space-y-6 max-w-[1440px] mx-auto pb-12 font-sans">
          {/* Page Header — 1 primary + 1 secondary action */}
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
                  <span className="font-mono text-xs text-[#c2410c] tabular-nums">
                    {adminPendingApprovalsCount}
                  </span>
                ) : null}
              </Link>

              <Link
                to="/tasks?new=1"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Assign task</span>
              </Link>
            </div>
          </header>

          {/* Row 1: 4 Compact Numbers-Only KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/users"
              className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 space-y-2"
            >
              <p className="text-xs text-neutral-500">Active staff</p>
              <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {adminLoading ? "—" : adminTotalEmployees.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">Registered directory members</p>
            </Link>

            <Link
              to="/requests/approvals"
              className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 space-y-2"
            >
              <p className="text-xs text-neutral-500">Pending approvals</p>
              <p className="text-[28px] leading-none font-medium text-[#c2410c] font-headline tabular-nums">
                {adminLoading ? "—" : adminPendingApprovalsCount.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">Awaiting review action</p>
            </Link>

            <Link
              to="/requests"
              className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 space-y-2"
            >
              <p className="text-xs text-neutral-500">Total requests</p>
              <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {adminLoading ? "—" : adminTotalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">Tracked across all workflows</p>
            </Link>

            <Link
              to="/tasks"
              className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 space-y-2"
            >
              <p className="text-xs text-neutral-500">Staff tasks</p>
              <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                {orgTasks.length}
              </p>
              <p className="text-xs text-neutral-500 tabular-nums">
                {orgTasksInProgress} in progress · {orgTasksBlocked} in review
              </p>
            </Link>
          </section>

          {/* Row 2: Primary Operational Queues (8 cols) + Management Directory (4 cols) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* Pending Approval Queue (Live API) */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-900/[0.08]">
                  <div>
                    <h2 className="text-base font-medium text-neutral-900 font-headline">
                      Approval queue
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Leave applications, payment vouchers, and requisitions awaiting sign-off
                    </p>
                  </div>
                  <Link
                    to="/requests/approvals"
                    className="text-xs font-medium text-[#c2410c] hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Open queue</span>
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </div>

                {adminApprovals.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <p className="text-sm font-medium text-neutral-900">No pending approvals</p>
                    <p className="text-xs text-neutral-500">
                      New leave requests, requisitions, and vouchers will appear here for review.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900/[0.06] mt-1">
                    {adminApprovals.slice(0, 5).map((item: any) => (
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

              {/* Staff Tasks */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-900/[0.08]">
                  <div>
                    <h2 className="text-base font-medium text-neutral-900 font-headline">
                      Staff tasks
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Active deliverables and items in review across teams
                    </p>
                  </div>
                  <Link
                    to="/tasks"
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>All tasks</span>
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </div>

                <div className="divide-y divide-neutral-900/[0.06] mt-1">
                  {orgTasks.slice(0, 5).map((task) => {
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
              </div>
            </div>

            {/* Right 4 cols: Management Shortcuts + Finance & Governance */}
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

              {/* Live Directory Snapshot */}
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-900/[0.08]">
                  <h2 className="text-base font-medium text-neutral-900 font-headline">
                    Directory snapshot
                  </h2>
                  <Link
                    to="/admin/users"
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-0.5 transition-colors"
                  >
                    <span>All staff</span>
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </div>

                {adminEmployees.length === 0 ? (
                  <p className="text-sm text-neutral-500 py-6">
                    No employee records loaded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-900/[0.06] mt-1">
                    {adminEmployees.slice(0, 5).map((emp: any) => {
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

        {/* Row 1: Compact Quick-Link Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/leave"
            className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <div className="text-xs text-neutral-500">Leave balance</div>
              <div className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                View
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150" strokeWidth={1.5} />
          </Link>

          <Link
            to="/attendance"
            className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <div className="text-xs text-neutral-500">Attendance log</div>
              <div className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                Today
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150" strokeWidth={1.5} />
          </Link>

          <Link
            to="/requests"
            className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <div className="text-xs text-neutral-500">Requests</div>
              <div className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                Queue
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150" strokeWidth={1.5} />
          </Link>

          <Link
            to="/account/payslips"
            className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.18] shadow-xs transition-colors duration-150 flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <div className="text-xs text-neutral-500">Payslips</div>
              <div className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                Records
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors duration-150" strokeWidth={1.5} />
          </Link>
        </div>

        {/* ============================================================= */}
        {/* ROW 2: SHIFT & ATTENDANCE (8 COLS) + QUICK ACTIONS (4 COLS)   */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* LEFT COLUMN: 8 COLS (Today's Shift + Attendance This Week) */}
          <div className="lg:col-span-8 space-y-5 flex flex-col justify-between">
            {/* Today's Shift Card */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900">Today&apos;s Shift</h2>
                {isClockedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
                  <div className="text-xl font-semibold text-neutral-900 font-headline">09:00 – 17:00</div>
                  <div className="text-xs text-neutral-500 font-medium">
                    {isClockedIn
                      ? "8h 12m worked today • Shift active"
                      : "0h 00m worked today • You have not clocked in yet"}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-colors duration-500 ${
                      isClockedIn ? "bg-[#ff6900]" : "bg-neutral-300"
                    }`}
                    style={{ width: isClockedIn ? "88%" : "0%" }}
                  />
                </div>
                <span className="text-xs font-semibold text-neutral-500 shrink-0">
                  {isClockedIn ? "8h 12m / 8h" : "0h 00m / 8h"}
                </span>
              </div>

              {/* 3 Sub-Metrics Row */}
              <div className="mt-6 pt-5 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <Coffee className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-neutral-500">Break Remaining: </span>
                    <span className="font-medium text-neutral-800">60 mins</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-neutral-500">Grace Period: </span>
                    <span className="font-medium text-neutral-800">15 mins</span>
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

            {/* Attendance This Week Card */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">Attendance This Week</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Your daily check-ins and on-time performance</p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-xs font-medium text-neutral-400">Attendance Rate</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-neutral-900">96%</span>
                      <span className="text-xs font-medium text-emerald-600 flex items-center">
                        ↑ 2%
                      </span>
                    </div>
                  </div>

                  <div className="w-36">
                    <SelectBox
                      defaultValue="this_week"
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

              {/* 7 Daily Rhythm Bar Columns — Neutral ramp with #ff6900 accent on today */}
              <div className="relative pt-2">
                <div className="grid grid-cols-7 gap-3 items-end">
                  {weeklyRhythm.map((item) => (
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
                          className={`w-full rounded-t-md transition-colors duration-200 ${
                            item.isToday
                              ? "bg-[#ff6900]"
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

          {/* RIGHT COLUMN: 4 COLS (Quick Actions Card) */}
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
                    : "bg-[#ff6900] hover:bg-[#ea580c] text-white"
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

                {/* 3. View Attendance */}
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

                {/* 4. Download Payslip */}
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

        {/* ============================================================= */}
        {/* ROW 3: MY RECENT REQUESTS + TEAM ACTIVITY + WHO'S OUT TODAY   */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: My Recent Requests */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900">My Recent Requests</h2>
                <Link
                  to="/requests"
                  className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {myRecentRequests.map((req) => {
                  const Icon = req.icon;
                  return (
                    <Link
                      key={req.id}
                      to={req.link}
                      className="p-3 rounded-xl hover:bg-neutral-50 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${req.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-neutral-900 group-hover:text-[#ff6900] transition">
                            {req.title}
                          </div>
                          <div className="text-xs text-neutral-400">{req.period}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${req.badgeColor}`}>
                          {req.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Team Activity */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900">Team Activity</h2>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {teamActivities.map((act) => (
                  <div
                    key={act.name}
                    className="p-3 rounded-xl hover:bg-neutral-50 transition flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-full font-medium text-xs flex items-center justify-center shrink-0 ${act.avatarBg}`}>
                      {act.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-neutral-900">{act.name}</div>
                      <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${act.dotColor}`} />
                        <span>{act.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Who's Out Today */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-medium text-neutral-900">Who&apos;s Out Today</h2>
                <Link
                  to="/leave"
                  className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {colleaguesOutToday.map((person) => (
                  <Link
                    key={person.name}
                    to={person.link}
                    className="p-3 rounded-xl hover:bg-neutral-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full font-medium text-xs flex items-center justify-center shrink-0 ${person.avatarBg}`}>
                        {person.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-neutral-900 group-hover:text-[#ff6900] transition">
                          {person.name}
                        </div>
                        <div className="text-xs text-neutral-400">{person.type}</div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
