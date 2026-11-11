import { useEffect, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useLocalization } from "@/shared/lib/localization";
import { useToast } from "@/shared";
import {
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
  UserCheck,
  MessageSquare,
  FileText,
  Play,
  Square,
  ChevronRight,
  Bell,
  Check,
} from "lucide-react";
import { WeeklyAttendanceRhythmChart } from "@/pages/hr/attendance/WeeklyAttendanceRhythmChart";
import { getMyAttendance, clockIn, clockOut, type MyAttendanceResponse } from "@/pages/hr/attendance/attendance-api";

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const localization = useLocalization();

  // Live Digital Clock in Nigeria WAT
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<MyAttendanceResponse | null>(null);
  const [clocking, setClocking] = useState(false);

  useEffect(() => {
    getMyAttendance()
      .then((res) => setAttendanceData(res))
      .catch(() => {
        // Fallback gracefully to default metrics
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

  // Approvals queue (can be approved/declined directly)
  const [approvals, setApprovals] = useState([
    {
      id: "req-1",
      title: "Annual Leave Requisition (5 Days)",
      requester: "Amina Yusuf",
      department: "Product Design",
      date: "Nov 17 – Nov 21",
      type: "Leave",
      tagColor: "bg-purple-50 text-purple-700 border-purple-200",
      avatar: "AY",
    },
    {
      id: "req-2",
      title: "Client Lunch & Strategy Meeting",
      requester: "Emeka Okafor",
      department: "Enterprise Sales",
      date: "₦42,500.00",
      type: "Expense",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatar: "EO",
    },
    {
      id: "req-3",
      title: "Weekend Cloud Migration Overtime (4.5h)",
      requester: "Folake Adeleke",
      department: "Infrastructure",
      date: "Nov 08 (Overtime)",
      type: "Overtime",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
      avatar: "FA",
    },
    {
      id: "req-4",
      title: "Hardware Upgrade: M3 Max Workstation",
      requester: "Chinedu Eze",
      department: "Frontend Engineering",
      date: "₦2,450,000.00",
      type: "Procurement",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
      avatar: "CE",
    },
  ]);

  const handleActionApproval = (id: string, action: "approve" | "reject") => {
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    showToast(
      action === "approve" ? "Requisition approved successfully" : "Requisition declined",
      action === "approve" ? "success" : "info"
    );
  };

  // Colleagues out today
  const teamOutToday = [
    { name: "Zainab Bello", role: "Product Manager", type: "Annual Leave", back: "Returns Mon, Nov 16", avatar: "ZB", color: "bg-purple-100 text-purple-700" },
    { name: "Tunde Bakare", role: "DevOps Engineer", type: "Sick Leave", back: "Returns Tomorrow", avatar: "TB", color: "bg-rose-100 text-rose-700" },
    { name: "Kemi Adebayo", role: "Lead UI/UX", type: "Design Summit (Offsite)", back: "Returns Friday", avatar: "KA", color: "bg-blue-100 text-blue-700" },
    { name: "Segun Obasanjo", role: "Operations Specialist", type: "Compassionate", back: "Returns Nov 20", avatar: "SO", color: "bg-amber-100 text-amber-700" },
  ];

  // Recent Company Activity
  const activityStream = [
    { text: "Information Security Policy 2026 published to Knowledge Hub", time: "18m ago", icon: FileText, color: "text-blue-600 bg-blue-50" },
    { text: "October 2026 payroll disbursement reconciliations completed", time: "1h ago", icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
    { text: "Chinedu Eze submitted a timesheet for Sprint 44 (40.0 hrs)", time: "3h ago", icon: Clock, color: "text-amber-600 bg-amber-50" },
    { text: "New team member Aisha Mohammed joined as QA Analyst", time: "Yesterday", icon: Users, color: "text-purple-600 bg-purple-50" },
  ];

  const firstName = user?.first_name || user?.username || "Colleague";

  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* 1. Executive Greeting & Time Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl shadow-md relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ff6900] text-white tracking-wide shadow-sm">
                STANFORTE EDGE
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Enterprise Live • Lagos HQ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-headline pt-1">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Here&apos;s what&apos;s happening across your workforce, attendance, and operations today.
            </p>
          </div>

          {/* Time & Shift Indicator */}
          <div className="relative z-10 flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-[#ff6900] flex items-center justify-center font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-300">West Africa Time (WAT)</div>
                <div className="text-sm font-black text-white tracking-tight">
                  {formattedTime}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl hidden lg:block">
              <div className="text-[11px] font-medium text-slate-300">Current Date</div>
              <div className="text-xs font-bold text-white tracking-tight">
                {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Top 5 Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Workforce */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Workforce</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">1,240</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-0.5 border border-emerald-200/60">
              <TrendingUp className="h-3 w-3" /> +12%
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present Today</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">1,186</div>
              </div>
            </div>
            <div className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              95.6%
            </div>
          </div>

          {/* Card 3: On Leave / Away */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On Leave / Away</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">18</div>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
              12 Annual
            </div>
          </div>

          {/* Card 4: Pending Approvals */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Action</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">{approvals.length + 19}</div>
              </div>
            </div>
            <Link
              to="/requests/approvals"
              className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full hover:bg-amber-100 border border-amber-200/60 transition"
            >
              Review &rarr;
            </Link>
          </div>

          {/* Card 5: Payroll Cycle Readiness */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payroll Cycle</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5 font-headline">Ready</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              In 5 days
            </span>
          </div>
        </div>

        {/* 3. Row 2: Attendance Rhythm & Weekly Curve + Digital Time Terminal (8 + 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 8 Cols: Full Responsive Attendance Rhythm Chart */}
          <div className="lg:col-span-8 flex flex-col">
            <WeeklyAttendanceRhythmChart
              daily={attendanceData?.daily ?? []}
              title="Attendance Overview & Weekly Rhythm"
              subtitle="Visual log of on-time check-ins vs late arrivals over the last 7 calendar days."
              className="h-full"
            />
          </div>

          {/* Right 4 Cols: Daily Work Session & Shift Card */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-headline">
                    Daily Work Session
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Shift & Schedule Tracking
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  isClockedIn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {isClockedIn ? "● Shift Active" : "○ Clocked Out"}
                </span>
              </div>

              {/* Shift details list */}
              <div className="space-y-3.5 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Expected Shift</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    09:00 – 17:00 (8h Standard)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Logged Today</span>
                  <span className="font-extrabold text-[#ff6900]">
                    8h 12m / 8h
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ff6900] h-full rounded-full" style={{ width: "100%" }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Break Entitlement</span>
                  <span className="font-semibold text-slate-700">60 mins included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Grace Period</span>
                  <span className="font-semibold text-slate-700">15 mins threshold</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Overtime Rate</span>
                  <span className="font-semibold text-slate-700">1.5× standard hourly</span>
                </div>
              </div>
            </div>

            {/* Shift actions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleToggleClock}
                disabled={clocking}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition ${
                  isClockedIn
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-[#ff6900] hover:bg-[#ea580c] text-white"
                }`}
              >
                {clocking ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : isClockedIn ? (
                  <>
                    <Square className="h-4 w-4 fill-white" /> Clock Out for the Day
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" /> Clock In to Start Shift
                  </>
                )}
              </button>

              <Link
                to="/attendance"
                className="w-full block text-center py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                View Complete Attendance Terminal &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Row 3: Management Operations & Team Availability (7 + 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 7 Cols: Pending Approvals Queue */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-headline">
                      Pending Approvals Queue
                    </h3>
                    <p className="text-xs text-slate-500">
                      Requisitions awaiting your review or managerial sign-off
                    </p>
                  </div>
                </div>

                <Link
                  to="/requests/approvals"
                  className="text-xs font-bold text-[#ff6900] hover:underline flex items-center gap-1"
                >
                  View All ({approvals.length + 19}) <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* List of pending items */}
              <div className="space-y-3">
                {approvals.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 font-black text-slate-700 text-xs flex items-center justify-center shrink-0">
                        {item.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor}`}>
                            {item.type}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Requested by <strong className="text-slate-700">{item.requester}</strong> ({item.department}) • <span className="font-semibold text-slate-600">{item.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleActionApproval(item.id, "approve")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionApproval(item.id, "reject")}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <Link
                to="/requests/approvals"
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Open Unified Workflow & Approval Center &rarr;
              </Link>
            </div>
          </div>

          {/* Right 5 Cols: Who's Out Today / Team Leave Roster */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-headline">
                      Who&apos;s Out Today
                    </h3>
                    <p className="text-xs text-slate-500">
                      Colleagues on approved leave or off-duty today
                    </p>
                  </div>
                </div>

                <Link
                  to="/leave"
                  className="text-xs font-bold text-[#ff6900] hover:underline"
                >
                  Leave Hub &rarr;
                </Link>
              </div>

              {/* Roster items */}
              <div className="space-y-3">
                {teamOutToday.map((person) => (
                  <div
                    key={person.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${person.color}`}>
                        {person.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{person.name}</div>
                        <div className="text-[11px] text-slate-500">{person.role}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {person.type}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">{person.back}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <Link
                to="/leave"
                className="w-full block text-center py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs transition"
              >
                + Request Time Off or Check Leave Balance
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Row 4: Workspace Collaboration, Announcements & Next Payroll (4 + 4 + 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Col 1 (4 cols): Quick Workspace Access & Shortcuts */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-headline mb-1">
                Workspace Shortcuts
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Instant access to core enterprise operational hubs
              </p>

              <div className="space-y-2.5">
                <Link
                  to="/chat"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900 flex items-center gap-1.5">
                        Corporate Chat
                        <span className="px-1.5 py-0.2 rounded-full bg-[#ff6900] text-white text-[9px] font-black">
                          NEW
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Direct messages, channels & files</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                <Link
                  to="/account/timesheets"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        Timesheets & Work Logs
                      </div>
                      <div className="text-[11px] text-slate-500">Log project hours and client billing</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                <Link
                  to="/documents"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-purple-900">
                        Documents & Knowledge Hub
                      </div>
                      <div className="text-[11px] text-slate-500">Policies, wikis & corporate handbook</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                <Link
                  to="/finance"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-amber-900">
                        Finance & Procurement
                      </div>
                      <div className="text-[11px] text-slate-500">Budgets, purchase orders & vendor hub</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              </div>
            </div>
          </div>

          {/* Col 2 (4 cols): Recent Company Activity Feed */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <h3 className="text-base font-bold text-slate-900 font-headline">
                    Recent Enterprise Feed
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Stream</span>
              </div>

              <div className="space-y-3.5">
                {activityStream.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {item.text}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <span className="text-xs font-medium text-slate-400">
                All systems operating normally • Up to date
              </span>
            </div>
          </div>

          {/* Col 3 (4 cols): Next Payroll & Financial Pulse Widget */}
          <div className="lg:col-span-4 p-6 rounded-2xl bg-gradient-to-br from-[#0a1128] via-[#0f172a] to-[#1e1b4b] text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
            {/* Glowing orb */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#ff6900]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ff6900] text-white tracking-wide uppercase">
                  PAYROLL PULSE
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                </span>
              </div>

              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto shadow-inner mb-3">
                  <CreditCard className="h-7 w-7 text-[#ff6900]" />
                </div>
                <h4 className="text-lg font-black text-white font-headline">November 2026 Cycle</h4>
                <div className="text-xs text-orange-400 font-bold mt-0.5">
                  Disbursement in 5 days (Nov 25)
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Net Payout</span>
                  <span className="font-bold text-white">₦48,250,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PAYE Tax & Pensions</span>
                  <span className="font-bold text-slate-300">₦8,420,000.00</span>
                </div>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              <Link
                to="/finance"
                className="w-full block py-2.5 px-4 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white text-center shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
              >
                View Payroll & Treasury Details &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
