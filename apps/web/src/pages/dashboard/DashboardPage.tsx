import { useEffect, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { SelectBox } from "@/components/ui/select";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
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
} from "lucide-react";
import { getMyAttendance, clockIn, clockOut, type MyAttendanceResponse } from "@/pages/hr/attendance/attendance-api";
import { INITIAL_TASKS, type TaskItem } from "@/pages/tasks/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { mode, isAdmin, switchMode } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;

  // Load organization tasks for Admin Console view
  const [orgTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem("portal_tasks_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TASKS;
  });

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
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200/60",
      icon: Home,
      iconColor: "bg-rose-50 text-rose-600",
      link: "/requests",
    },
    {
      id: "req-3",
      title: "Medical Claim",
      period: "Oct 28, 2026",
      status: "Submitted",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200/60",
      icon: FileText,
      iconColor: "bg-purple-50 text-purple-600",
      link: "/requests",
    },
  ];

  // Team Activity
  const teamActivities = [
    {
      name: "Amina Yusuf",
      avatar: "AT",
      avatarBg: "bg-blue-100 text-blue-700",
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
      avatarBg: "bg-slate-100 text-slate-600",
      status: "Checked out • 5 hrs ago",
      dotColor: "bg-slate-400",
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
      avatarBg: "bg-purple-100 text-purple-700",
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
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200/60",
      icon: Receipt,
      iconColor: "bg-blue-50 text-blue-600",
      link: "/finance/payment-vouchers",
    },
    {
      id: "wf-4",
      title: "PR-2026-042: Office Workstation Replacements",
      requester: "Fatima Salim • People & Operations",
      meta: "₦850,000 • Procurement Requisition",
      badge: "In Review",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200/60",
      icon: FileCheck,
      iconColor: "bg-purple-50 text-purple-600",
      link: "/requests/approvals",
    },
  ];

  const workforceLiveRoster = [
    {
      name: "Amina Yusuf",
      department: "Engineering",
      avatar: "AY",
      avatarBg: "bg-blue-100 text-blue-700",
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
      avatarBg: "bg-purple-100 text-purple-700",
      time: "08:55 AM • Remote",
      status: "Remote",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200/60",
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
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
          {/* ============================================================= */}
          {/* ADMIN CONSOLE HEADER (Strictly Organization Management)       */}
          {/* ============================================================= */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-[#ff6900] text-[11px] font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Executive Admin Console • Organization Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Workforce &amp; Operations Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Assign tasks to any staff member, review leave applications, monitor workforce attendance, and approve company workflows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
              <Link
                to="/tasks?new=1"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create &amp; Assign Staff Task</span>
              </Link>

              <Link
                to="/requests/approvals"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-2xs transition"
              >
                <FileCheck className="h-4 w-4 text-[#ff6900]" />
                <span>Approval Queue (23)</span>
              </Link>

              <button
                type="button"
                onClick={() => switchMode("employee")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Switch back to your personal staff workplace"
              >
                <span>My Personal Workplace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ============================================================= */}
          {/* ROW 1: 4 ORGANIZATION MANAGEMENT KPI CARDS                    */}
          {/* ============================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Active Workforce */}
            <Link
              to="/admin/users"
              className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-tight">48</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Active Staff Directory</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  45 In Today
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* KPI 2: Staff Tasks & Deliverables */}
            <Link
              to="/tasks"
              className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-tight">{orgTasks.length}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">All Staff Tasks</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#ff6900]">
                  {orgTasksInProgress} Active
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* KPI 3: Workforce Leave Requests */}
            <Link
              to="/hr/leave"
              className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-tight">4</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Staff Leave Requests</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  3 Out Today
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* KPI 4: Pending Workflow Approvals */}
            <Link
              to="/requests/approvals"
              className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <FileCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-tight">23</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Pending Approvals</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  Action Needed
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>

          {/* ============================================================= */}
          {/* ROW 2: STAFF TASKS & WORKFLOWS (8 COLS) + ADMIN TOOLS (4 COLS) */}
          {/* ============================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* LEFT 8 COLS: Staff Tasks Overview + Pending Approvals Queue */}
            <div className="lg:col-span-8 space-y-5 flex flex-col justify-between">
              {/* 1. Organization Tasks & Staff Assignments */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Staff Tasks &amp; Deliverables Across Teams
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor everyone&apos;s assigned work items, blockers ({orgTasksBlocked}), and sprint progress.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/tasks?new=1"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff6900] text-xs font-bold transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign Task</span>
                    </Link>
                    <Link
                      to="/tasks"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                    >
                      <span>All Staff Tasks</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 mt-2">
                  {orgTasks.slice(0, 5).map((task) => {
                    const statusLabel =
                      task.status === "in_progress"
                        ? "In Progress"
                        : task.status === "blocked"
                        ? "Under Review"
                        : task.status === "completed"
                        ? "Completed"
                        : "Planned";
                    const statusBadge =
                      task.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border-blue-200/60"
                        : task.status === "blocked"
                        ? "bg-amber-50 text-amber-700 border-amber-200/60"
                        : task.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : "bg-slate-100 text-slate-700 border-slate-200/60";
                    const priorityBadge =
                      task.priority === "critical"
                        ? "bg-rose-50 text-rose-700"
                        : task.priority === "high"
                        ? "bg-orange-50 text-[#ff6900]"
                        : "bg-slate-100 text-slate-600";

                    return (
                      <Link
                        key={task.id}
                        to="/tasks"
                        className="py-3.5 px-2 hover:bg-slate-50/80 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${priorityBadge}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition truncate">
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span>
                              Assigned to:{" "}
                              <strong className="text-slate-700">
                                {task.assignees?.length
                                  ? task.assignees.map((a) => a.name).join(", ")
                                  : "Unassigned"}
                              </strong>
                            </span>
                            {task.project_name && <span>• {task.project_name}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex -space-x-1.5">
                            {(task.assignees || []).slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                title={a.name}
                                className="w-6 h-6 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                              >
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                            {statusLabel}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pending Leave & Workflow Approvals */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Pending Staff Leave &amp; Workflow Sign-Offs
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Employee leave requests, payment vouchers, and requisitions awaiting management action.
                    </p>
                  </div>
                  <Link
                    to="/requests/approvals"
                    className="text-xs font-bold text-[#ff6900] hover:underline flex items-center gap-0.5"
                  >
                    <span>Open Queue</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                  {adminPendingWorkflows.map((wf) => {
                    const Icon = wf.icon;
                    return (
                      <Link
                        key={wf.id}
                        to={wf.link}
                        className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wf.iconColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition truncate">
                              {wf.title}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                              {wf.requester}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{wf.meta}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${wf.badgeColor}`}>
                          {wf.badge}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: Management Quick Actions Card */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <h2 className="text-base font-bold text-slate-900">Management Actions</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Admin Mode
                  </span>
                </div>

                {/* Primary Admin Action: Assign Task to Any Staff */}
                <Link
                  to="/tasks?new=1"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-500/25 transition transform active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Task for Any Staff</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>

                {/* Management Links */}
                <div className="mt-5 space-y-2">
                  {/* 1. Staff Leave Management */}
                  <Link
                    to="/hr/leave"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Staff Leave &amp; Absences
                        </div>
                        <div className="text-[11px] text-slate-400">Approve staff leave &amp; view who is out</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* 2. Workforce Attendance */}
                  <Link
                    to="/hr/attendance"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Workforce Attendance
                        </div>
                        <div className="text-[11px] text-slate-400">All staff check-ins, late logs &amp; corrections</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* 3. Employee Directory */}
                  <Link
                    to="/admin/users"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Manage Employees
                        </div>
                        <div className="text-[11px] text-slate-400">Staff directory, onboarding &amp; access roles</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* 4. Payroll & Vouchers */}
                  <Link
                    to="/admin/payroll/authorization"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Payroll &amp; Disbursements
                        </div>
                        <div className="text-[11px] text-slate-400">Authorize monthly payroll runs &amp; PVs</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* 5. Workspace Analytics */}
                  <Link
                    to="/analytics"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                        <PieChart className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Organization Analytics
                        </div>
                        <div className="text-[11px] text-slate-400">Turnaround velocity &amp; department SLAs</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* ROW 3: LIVE ATTENDANCE ROSTER + STAFF ON LEAVE + TREASURY      */}
          {/* ============================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Today's Workforce Attendance Roster */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <h2 className="text-base font-bold text-slate-900">Workforce Check-In Roster</h2>
                  <Link
                    to="/hr/attendance"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                  >
                    <span>All Staff</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3 pt-1">
                  {workforceLiveRoster.map((person) => (
                    <Link
                      key={person.name}
                      to="/hr/attendance"
                      className="p-2.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${person.avatarBg}`}>
                          {person.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                            {person.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{person.time}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${person.statusColor}`}>
                        {person.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Staff Currently on Leave */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <h2 className="text-base font-bold text-slate-900">Staff Out on Leave Today</h2>
                  <Link
                    to="/hr/leave"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                  >
                    <span>Manage Leaves</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3 pt-1">
                  {colleaguesOutToday.map((person) => (
                    <Link
                      key={person.name}
                      to="/hr/leave"
                      className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${person.avatarBg}`}>
                          {person.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                            {person.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{person.type}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Treasury, Payroll & Procurement Overview */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <h2 className="text-base font-bold text-slate-900">Finance &amp; Governance Pulse</h2>
                  <Link
                    to="/finance"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                  >
                    <span>Finance Hub</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3 pt-1">
                  <Link
                    to="/admin/payroll/authorization"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Nov 2026 Payroll Run
                        </div>
                        <div className="text-[11px] text-slate-400">₦18,450,000 • 48 Active Staff</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Ready
                    </span>
                  </Link>

                  <Link
                    to="/finance/payment-vouchers"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Payment Vouchers
                        </div>
                        <div className="text-[11px] text-slate-400">3 Vouchers Awaiting Disbursement</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      ₦2.57M
                    </span>
                  </Link>

                  <Link
                    to="/procurement"
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          Procurement Requisitions
                        </div>
                        <div className="text-[11px] text-slate-400">4 Purchase Orders in Fulfillment</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
        {/* ============================================================= */}
        {/* TOP HEADER: Greeting, Date, Productivity Sun Badge            */}
        {/* ============================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Good morning, {firstName}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Here&apos;s your attendance, requests and team updates for today.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <div className="text-xs sm:text-sm font-bold text-slate-900">{formattedDate}</div>
              <div className="text-[11px] text-slate-400 font-medium">Make it a productive day!</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100/70 border border-orange-200/60 text-[#ff6900] flex items-center justify-center shrink-0 shadow-2xs">
              <Sun className="h-5 w-5 fill-orange-400/20" />
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* ROW 1: 4 KPI METRIC CARDS                                     */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Leave Days */}
          <Link
            to="/leave"
            className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">18</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Leave Days</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 2: Hours Logged */}
          <Link
            to="/attendance"
            className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">36.5</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Hours Logged</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 3: Pending Requests */}
          <Link
            to="/requests"
            className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">2</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Pending Requests</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Card 4: Latest Payslip */}
          <Link
            to="/payslips"
            className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Oct 2026</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Latest Payslip</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* ============================================================= */}
        {/* ROW 2: SHIFT & ATTENDANCE (8 COLS) + QUICK ACTIONS (4 COLS)   */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* LEFT COLUMN: 8 COLS (Today's Shift + Attendance This Week) */}
          <div className="lg:col-span-8 space-y-5 flex flex-col justify-between">
            {/* Today's Shift Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-bold text-slate-900">Today&apos;s Shift</h2>
                {isClockedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Shift Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Not Clocked In</span>
                  </span>
                )}
              </div>

              {/* Time & Hours */}
              <div className="flex items-center gap-3.5 pt-1">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isClockedIn ? "bg-orange-50 text-[#ff6900]" : "bg-slate-100 text-slate-500"
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 font-headline">09:00 – 17:00</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isClockedIn
                      ? "8h 12m worked today • Shift active"
                      : "0h 00m worked today • You have not clocked in yet"}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isClockedIn ? "bg-[#ff6900]" : "bg-slate-300"
                    }`}
                    style={{ width: isClockedIn ? "88%" : "0%" }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  {isClockedIn ? "8h 12m / 8h" : "0h 00m / 8h"}
                </span>
              </div>

              {/* 3 Sub-Metrics Row */}
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <Coffee className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-500">Break Remaining: </span>
                    <span className="font-bold text-slate-800">60 mins</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-500">Grace Period: </span>
                    <span className="font-bold text-slate-800">15 mins</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-500">Overtime Policy: </span>
                    <span className="font-bold text-slate-800">1.5x hourly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance This Week Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Attendance This Week</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Your daily check-ins and on-time performance</p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendance Rate</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900">96%</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center">
                        ↑ 2%
                      </span>
                    </div>
                  </div>

                  <div className="w-36">
                    <SelectBox
                      defaultValue="this_week"
                      className="h-8 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs"
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
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-2">
                {weeklyRhythm.map((item) => (
                  <div key={item.day} className="flex flex-col items-center gap-2">
                    {/* Vertical Bar track */}
                    <div className="w-full bg-slate-100/80 rounded-xl h-28 sm:h-32 flex flex-col justify-end p-1">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          item.isToday
                            ? "bg-[#ff6900] shadow-sm shadow-orange-500/20"
                            : item.isWeekend
                            ? "bg-slate-300/80"
                            : "bg-emerald-500"
                        }`}
                        style={{ height: item.height }}
                      />
                    </div>
                    {/* Day label */}
                    <span
                      className={`text-xs font-bold ${
                        item.isToday ? "text-[#ff6900]" : "text-slate-700"
                      }`}
                    >
                      {item.day}
                    </span>
                    {/* Percentage */}
                    <span
                      className={`text-[11px] font-semibold ${
                        item.isToday ? "text-[#ff6900]" : "text-slate-400"
                      }`}
                    >
                      {item.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 4 COLS (Quick Actions Card) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
                <Link
                  to="/requests"
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Main Clock Action Button (User explicitly clocks in / out) */}
              <button
                type="button"
                onClick={handleToggleClock}
                disabled={clocking}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition transform active:scale-98 cursor-pointer ${
                  isClockedIn
                    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                    : "bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-orange-500/25"
                }`}
              >
                {clocking ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : isClockedIn ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Clock Out</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Clock In</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>

              {/* 4 Action Rows */}
              <div className="mt-5 space-y-2">
                {/* 1. New Request */}
                <Link
                  to="/requests/new"
                  className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                        New Request
                      </div>
                      <div className="text-[11px] text-slate-400">Leave, claim or requisition</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                </Link>

                {/* 2. Apply for Leave */}
                <Link
                  to="/leave"
                  className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                        Apply for Leave
                      </div>
                      <div className="text-[11px] text-slate-400">Check balance and apply</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                </Link>

                {/* 3. View Attendance */}
                <Link
                  to="/attendance"
                  className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                        View Attendance
                      </div>
                      <div className="text-[11px] text-slate-400">See daily, weekly or monthly logs</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                </Link>

                {/* 4. Download Payslip */}
                <Link
                  to="/payslips"
                  className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                        Download Payslip
                      </div>
                      <div className="text-[11px] text-slate-400">Access your latest payslip</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
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
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-bold text-slate-900">My Recent Requests</h2>
                <Link
                  to="/requests"
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
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
                      className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${req.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                            {req.title}
                          </div>
                          <div className="text-[11px] text-slate-400">{req.period}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${req.badgeColor}`}>
                          {req.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Team Activity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-bold text-slate-900">Team Activity</h2>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {teamActivities.map((act) => (
                  <div
                    key={act.name}
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${act.avatarBg}`}>
                      {act.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{act.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
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
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-base font-bold text-slate-900">Who&apos;s Out Today</h2>
                <Link
                  to="/leave"
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
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
                    className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${person.avatarBg}`}>
                        {person.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          {person.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{person.type}</div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition" />
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
