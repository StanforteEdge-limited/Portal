import { useEffect, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
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
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { getMyAttendance, clockIn, clockOut, type MyAttendanceResponse } from "@/pages/hr/attendance/attendance-api";

interface PriorityEntity {
  id: string;
  title: string;
  category: "voucher" | "approval" | "task" | "leave";
  typeLabel: string;
  owner: {
    name: string;
    avatar: string;
    avatarBg: string;
  };
  valueTag: string;
  status: "Pending CFO" | "In Review" | "Urgent" | "Approved" | "Ready";
  statusColor: string;
  date: string;
  actionText: string;
  link: string;
}

const INITIAL_PRIORITY_ENTITIES: PriorityEntity[] = [
  {
    id: "pv-089",
    title: "IT Server Rack & Core Switch Upgrade",
    category: "voucher",
    typeLabel: "Payment Voucher #PV-2026-089",
    owner: { name: "Zainab Bello", avatar: "ZB", avatarBg: "bg-blue-100 text-blue-700" },
    valueTag: "₦420,000",
    status: "Pending CFO",
    statusColor: "bg-amber-50 text-amber-700 border-amber-200/80",
    date: "Today, 09:15 AM",
    actionText: "Approve Voucher",
    link: "/finance/payment-vouchers",
  },
  {
    id: "req-042",
    title: "Annual Leave Application (5 Days)",
    category: "leave",
    typeLabel: "Absence Request #LV-2026-114",
    owner: { name: "Fatima Olarinwaju", avatar: "FO", avatarBg: "bg-orange-100 text-[#ff6900]" },
    valueTag: "Nov 20 – 24",
    status: "In Review",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200/80",
    date: "Today, 08:40 AM",
    actionText: "Approve Leave",
    link: "/leave",
  },
  {
    id: "po-038",
    title: "Generator Reserve Fuel Replenishment (12,000L)",
    category: "voucher",
    typeLabel: "Payment Voucher #PV-2026-085",
    owner: { name: "Chinedu Ibeawuchi", avatar: "CI", avatarBg: "bg-purple-100 text-purple-700" },
    valueTag: "₦680,000",
    status: "Urgent",
    statusColor: "bg-rose-50 text-rose-700 border-rose-200/80",
    date: "Yesterday, 04:30 PM",
    actionText: "Review Voucher",
    link: "/finance/payment-vouchers",
  },
  {
    id: "tsk-091",
    title: "Lagos Campus Biometric Terminal #2 Firmware Sync",
    category: "task",
    typeLabel: "Sprint Work Item #TSK-2026-091",
    owner: { name: "Amina Yusuf", avatar: "AY", avatarBg: "bg-teal-100 text-teal-700" },
    valueTag: "Due Today",
    status: "In Review",
    statusColor: "bg-slate-100 text-slate-700 border-slate-200/80",
    date: "Today, 07:50 AM",
    actionText: "Mark Done",
    link: "/tasks",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { mode } = useWorkspace();

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

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
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

  const isClockedIn = attendanceData?.current_state?.is_clocked_in ?? true;

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

  // Priority Entity Rows State (Interactive 2026 Linear View)
  const [entities, setEntities] = useState<PriorityEntity[]>(INITIAL_PRIORITY_ENTITIES);
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "vouchers" | "tasks" | "leave">("all");

  const filteredEntities = entities.filter((e) => {
    if (activeFilterTab === "vouchers") return e.category === "voucher";
    if (activeFilterTab === "tasks") return e.category === "task";
    if (activeFilterTab === "leave") return e.category === "leave";
    return true;
  });

  const handleQuickApprove = (id: string, title: string) => {
    setEntities((prev) => prev.filter((item) => item.id !== id));
    showToast(`Approved "${title}" successfully`, "success");
  };

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

  // Team Live Activity Feed
  const teamActivities = [
    {
      name: "Amina Yusuf",
      avatar: "AY",
      avatarBg: "bg-blue-100 text-blue-700",
      action: "Clocked in at Victoria Island campus",
      time: "2 mins ago",
      dotColor: "bg-emerald-500",
      tag: "Geofence 200m",
    },
    {
      name: "Chinedu Ibeawuchi",
      avatar: "CI",
      avatarBg: "bg-purple-100 text-purple-700",
      action: "Submitted Payment Voucher PV-2026-085 (₦680,000)",
      time: "35 mins ago",
      dotColor: "bg-amber-500",
      tag: "Treasury",
    },
    {
      name: "Fatima Olarinwaju",
      avatar: "FO",
      avatarBg: "bg-orange-100 text-[#ff6900]",
      action: "Submitted Annual Leave request for Nov 20–24",
      time: "1 hr ago",
      dotColor: "bg-blue-500",
      tag: "People & Culture",
    },
    {
      name: "Oluwaseun Adeleke",
      avatar: "OA",
      avatarBg: "bg-emerald-100 text-emerald-700",
      action: "Authorized Purchase Order #2026-042 (₦420,000)",
      time: "2 hrs ago",
      dotColor: "bg-emerald-500",
      tag: "CFO Sign-off",
    },
  ];

  // Colleagues Out Today
  const colleaguesOutToday = [
    {
      name: "Ibrahim Bello",
      type: "Annual Leave",
      returnDate: "Returns Nov 25",
      avatar: "IB",
      avatarBg: "bg-orange-100 text-orange-700",
      link: "/leave",
    },
    {
      name: "Oluwaseun Adebayo",
      type: "Medical Leave",
      returnDate: "Returns Nov 14",
      avatar: "OA",
      avatarBg: "bg-amber-100 text-amber-700",
      link: "/leave",
    },
    {
      name: "Kemi Eze",
      type: "Personal Leave",
      returnDate: "Returns tomorrow",
      avatar: "KE",
      avatarBg: "bg-purple-100 text-purple-700",
      link: "/leave",
    },
  ];

  const firstName = user?.first_name || "Daniel";

  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-7 max-w-[1600px] mx-auto pb-16 font-sans">
        {/* ============================================================= */}
        {/* 1. 2026 PAGE HEADER: Context, Greeting & Direct Actions       */}
        {/* ============================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff6900]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Executive Operational Workspace</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-semibold normal-case">Lagos HQ • Victoria Island</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Good morning, {firstName}</span>
              <span className="text-2xl sm:text-3xl">👋</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Consolidated intelligence across workforce attendance, sequential purchase approvals, and automated statutory payroll.
            </p>
          </div>

          {/* Quick Context & Clock */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center shrink-0">
            {/* Live Clock */}
            <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WAT (Africa/Lagos)</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-tight">{formattedTime}</div>
              </div>
            </div>

            {/* Date */}
            <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hidden sm:flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Date</div>
                <div className="text-xs font-bold text-slate-800">{formattedDate}</div>
              </div>
            </div>

            {/* Quick Action Button */}
            <Link
              to="/requests/new"
              className="px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </Link>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 2. 2026 INSIGHT BAR: 4 Luxury High-Density Micro-Cards        */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Pending Approvals */}
          <Link
            to="/requests/approvals"
            className="p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs hover:shadow-2026 hover:border-slate-200/90 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">4 Items</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">₦2.43M</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                <span>2 Vouchers • 1 PR • 1 Leave</span>
                <span className="font-bold text-[#ff6900] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Review <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 2: Workforce Attendance */}
          <Link
            to="/attendance"
            className="p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs hover:shadow-2026 hover:border-slate-200/90 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Time Attendance</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">96.4%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +2%
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                <span>45 Present • 3 Approved Leave</span>
                <span className="font-bold text-[#ff6900] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Roster <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 3: Audited Payroll */}
          <Link
            to="/admin/payroll/authorization"
            className="p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs hover:shadow-2026 hover:border-slate-200/90 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">November Payroll</span>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">₦18.45M</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Audited</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                <span>Bank CSV Batch Ready</span>
                <span className="font-bold text-[#ff6900] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Authorize <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 4: Deliverables & Tasks */}
          <Link
            to="/tasks"
            className="p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs hover:shadow-2026 hover:border-slate-200/90 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Deliverables</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">18 Tasks</span>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">92% velocity</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                <span>4 Due Today • 0 Blockers</span>
                <span className="font-bold text-[#ff6900] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Sprint <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* ============================================================= */}
        {/* 3. WORKSPACE CORE (8 COLS) + ACTIVITY SIDEBAR (4 COLS)        */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ----------------------------------------------------------- */}
          {/* LEFT 8 COLS: WORKSPACE (Linear Entity Rows + Attendance Bar) */}
          {/* ----------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Linear-Style Priority Entity Rows Container */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2026 overflow-hidden">
              {/* Header with Fast Filtering Tabs */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-headline">
                      Priority Work Items
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-50 text-[#ff6900] border border-orange-200/60">
                      {filteredEntities.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Items needing immediate sign-off or milestone completion today
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 text-xs font-semibold self-start sm:self-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("all")}
                    className={`px-3 py-1 rounded-xl transition ${
                      activeFilterTab === "all"
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All ({entities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("vouchers")}
                    className={`px-3 py-1 rounded-xl transition ${
                      activeFilterTab === "vouchers"
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Vouchers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("leave")}
                    className={`px-3 py-1 rounded-xl transition ${
                      activeFilterTab === "leave"
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("tasks")}
                    className={`px-3 py-1 rounded-xl transition ${
                      activeFilterTab === "tasks"
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tasks
                  </button>
                </div>
              </div>

              {/* Entity Rows List */}
              <div className="divide-y divide-slate-100">
                {filteredEntities.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6 stroke-[3]" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">All clear! No pending items in this view.</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      All vouchers, leave requests, and tasks for today have been reviewed.
                    </p>
                  </div>
                ) : (
                  filteredEntities.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      {/* Left: Type, Title, Subtitle, Assignee */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${item.owner.avatarBg}`}>
                          {item.owner.avatar}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition truncate">
                              {item.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.statusColor}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                            <span>{item.typeLabel}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">{item.owner.name}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Value Tag & 1-Click Quick Action */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                          {item.valueTag}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuickApprove(item.id, item.title)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-[#ff6900] text-white text-xs font-bold transition shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{item.actionText}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Entity Footer */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredEntities.length} of {entities.length} total operational items</span>
                <Link to="/requests/approvals" className="font-bold text-[#ff6900] hover:underline flex items-center gap-1">
                  <span>View All Approvals Queue</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Attendance Weekly Rhythm Bar Chart */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2026 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Attendance This Week</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Your daily check-ins and on-time performance</p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendance Rate</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900">96%</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center">↑ 2%</span>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>This Week</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 7 Daily Rhythm Bar Columns */}
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-2">
                {weeklyRhythm.map((item) => (
                  <div key={item.day} className="flex flex-col items-center gap-2 group">
                    {/* Vertical Bar track */}
                    <div className="w-full bg-slate-100/80 rounded-2xl h-28 sm:h-32 flex flex-col justify-end p-1">
                      <div
                        className={`w-full rounded-xl transition-all duration-300 group-hover:opacity-90 ${
                          item.isToday
                            ? "bg-[#ff6900] shadow-sm shadow-orange-500/25"
                            : item.isWeekend
                            ? "bg-slate-300/80"
                            : "bg-emerald-500"
                        }`}
                        style={{ height: item.height }}
                      />
                    </div>
                    {/* Day label */}
                    <span className={`text-xs font-bold ${item.isToday ? "text-[#ff6900]" : "text-slate-700"}`}>
                      {item.day}
                    </span>
                    {/* Percentage */}
                    <span className={`text-[11px] font-semibold ${item.isToday ? "text-[#ff6900]" : "text-slate-400"}`}>
                      {item.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Shift & Clock Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2026 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today&apos;s Shift Rhythm</h2>
                  <p className="text-xs text-slate-400">Victoria Island Campus • Geofenced Check-in Terminal</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Shift Active</span>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-900 font-headline">09:00 – 17:00</div>
                    <div className="text-xs text-slate-500 font-medium">8h 12m logged today • 0 overtime anomalies</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleClock}
                  disabled={clocking}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white flex items-center justify-center gap-2 shadow-sm shadow-orange-500/25 transition cursor-pointer"
                >
                  {clocking ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Square className="h-3 w-3 fill-white" />
                      <span>Clock Out</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Day Target: 8h 00m</span>
                  <span className="text-[#ff6900]">8h 12m completed (102%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#ff6900] h-full rounded-full transition-all duration-500" style={{ width: "95%" }} />
                </div>
              </div>

              {/* Sub-Metrics Row */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Break: <strong className="text-slate-800">60 mins remaining</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Grace Period: <strong className="text-slate-800">15 mins</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-slate-500">Overtime: <strong className="text-slate-800">1.5x hourly rate</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* RIGHT 4 COLS: ACTIVITY SIDEBAR & STANFORTE AI SUGGESTIONS  */}
          {/* ----------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. Stanforte AI Contextual Suggestions Card */}
            <div className="bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 rounded-3xl p-6 border border-orange-200/60 shadow-2026 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ff6900] text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-headline">Stanforte AI</h3>
                    <p className="text-[10px] text-slate-500">Operational Intelligence</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-[#ff6900]">
                  Active
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                4 vouchers exceed policy thresholds. Automated PAYE tax remittance schedule for November is ready for authorization.
              </p>

              {/* Suggested AI Prompts */}
              <div className="space-y-1.5 pt-1">
                <Link
                  to="/requests/approvals"
                  className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-white border border-orange-200/60 hover:border-[#ff6900] text-slate-800 text-xs font-semibold transition shadow-2xs flex items-center justify-between group"
                >
                  <span className="truncate">⚡ What needs my urgent approval?</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[#ff6900] group-hover:translate-x-0.5 transition" />
                </Link>

                <Link
                  to="/finance/payment-vouchers"
                  className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-white border border-orange-200/60 hover:border-[#ff6900] text-slate-800 text-xs font-semibold transition shadow-2xs flex items-center justify-between group"
                >
                  <span className="truncate">₦ Show vouchers above ₦500,000</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[#ff6900] group-hover:translate-x-0.5 transition" />
                </Link>

                <Link
                  to="/admin/payroll/authorization"
                  className="w-full text-left p-2.5 rounded-xl bg-white/90 hover:bg-white border border-orange-200/60 hover:border-[#ff6900] text-slate-800 text-xs font-semibold transition shadow-2xs flex items-center justify-between group"
                >
                  <span className="truncate">📊 Generate payroll summary</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[#ff6900] group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </div>

            {/* 2. Team Activity Stream */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2026 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight font-headline">
                  Live Activity Feed
                </h3>
                <Link to="/teams" className="text-xs font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5">
                  <span>View All</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3.5">
                {teamActivities.map((act) => (
                  <div key={act.name} className="flex items-start gap-3 text-xs">
                    <div className={`w-8 h-8 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${act.avatarBg}`}>
                      {act.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 truncate">{act.name}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{act.action}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {act.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Who's Out Today Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2026 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight font-headline">
                  Colleagues Out Today
                </h3>
                <Link to="/leave" className="text-xs font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5">
                  <span>Leave Hub</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {colleaguesOutToday.map((person) => (
                  <Link
                    key={person.name}
                    to={person.link}
                    className="p-3 rounded-2xl hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${person.avatarBg}`}>
                        {person.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition">
                          {person.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{person.type} • {person.returnDate}</div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                  </Link>
                ))}
              </div>
            </div>

            {/* 4. Quick Smart Actions */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2026 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Shortcuts:
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/leave"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-[#ff6900]/30 transition text-slate-700 hover:text-[#ff6900] font-semibold flex flex-col gap-1.5"
                >
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span>Apply Leave</span>
                </Link>

                <Link
                  to="/finance/payment-vouchers"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-[#ff6900]/30 transition text-slate-700 hover:text-[#ff6900] font-semibold flex flex-col gap-1.5"
                >
                  <Receipt className="h-4 w-4 text-[#ff6900]" />
                  <span>New Voucher</span>
                </Link>

                <Link
                  to="/tasks"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-[#ff6900]/30 transition text-slate-700 hover:text-[#ff6900] font-semibold flex flex-col gap-1.5"
                >
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                  <span>Add Task</span>
                </Link>

                <Link
                  to="/account/payslips"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-[#ff6900]/30 transition text-slate-700 hover:text-[#ff6900] font-semibold flex flex-col gap-1.5"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  <span>Payslips</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
