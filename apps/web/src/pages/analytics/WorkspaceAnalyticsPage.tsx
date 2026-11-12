import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  Download,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/shared/context/AuthProvider";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";

export default function WorkspaceAnalyticsPage() {
  const { user } = useAuth();
  const { isAdmin } = useWorkspace();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("week");
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "requests" | "teams">("overview");

  // Sample weekly metrics
  const attendanceVelocity = [
    { day: "Mon", rate: 98, count: 48, onTime: 47, status: "optimal" },
    { day: "Tue", rate: 96, count: 48, onTime: 46, status: "optimal" },
    { day: "Wed", rate: 94, count: 48, onTime: 45, status: "good" },
    { day: "Thu", rate: 96, count: 48, onTime: 46, status: "optimal" },
    { day: "Fri", rate: 92, count: 48, onTime: 44, status: "good" },
    { day: "Sat", rate: 85, count: 12, onTime: 11, status: "reduced" },
    { day: "Sun", rate: 88, count: 8, onTime: 8, status: "reduced" },
  ];

  const departmentPunctuality = [
    { name: "Engineering & IT", onTime: "98.4%", tasksClosed: 34, sla: "99.1%" },
    { name: "Finance & Accounts", onTime: "97.2%", tasksClosed: 28, sla: "98.5%" },
    { name: "Operations & Fleet", onTime: "95.6%", tasksClosed: 42, sla: "96.2%" },
    { name: "Client Relations", onTime: "94.8%", tasksClosed: 19, sla: "95.0%" },
  ];

  return (
    <PortalLayout activeNav="Analytics">
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* 1. PAGE HEADER (2026 Executive Workspace Architecture) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2026 border border-slate-100/80 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-[#ff6900] border border-orange-200/60">
                Admin Intelligence
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Live Data • Lagos HQ Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Organization Analytics &amp; Velocity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-normal">
              Executive operational metrics, workforce punctuality velocity, task turnaround rhythms, and department productivity tracking across Stanforte Group.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Timeframe pill switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setTimeRange("week")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${timeRange === "week"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${timeRange === "month"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("quarter")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${timeRange === "quarter"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Q4 2026
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export Summary</span>
            </button>
          </div>
        </div>

        {/* Workspace Mode Notice if Admin */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs bg-slate-50/70 p-3 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>
                You are viewing <strong>Executive Admin Organization Analytics</strong>. Need detailed financial statements and ledger audits?
              </span>
            </div>
            <Link
              to="/finance/reports"
              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Open Finance Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 2. INSIGHT BAR (Key Metrics & Velocity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl p-5 shadow-2026 border border-slate-100/80 hover:border-orange-200/70 transition group">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Weekly Punctuality</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> +2.4%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">96.8%</span>
            <span className="text-xs text-slate-400 font-medium">on-time arrival</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "96.8%" }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl p-5 shadow-2026 border border-slate-100/80 hover:border-orange-200/70 transition group">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Avg Request SLA</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> -1.8h faster
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">4.2 hrs</span>
            <span className="text-xs text-slate-400 font-medium">approval turnaround</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#ff6900] h-1.5 rounded-full" style={{ width: "84%" }} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl p-5 shadow-2026 border border-slate-100/80 hover:border-orange-200/70 transition group">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Task Velocity</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              123 closed
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">94.1%</span>
            <span className="text-xs text-slate-400 font-medium">on-schedule deliver</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "94.1%" }} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-3xl p-5 shadow-2026 border border-slate-100/80 hover:border-orange-200/70 transition group">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Presence Reliability</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              48 active staff
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">99.4%</span>
            <span className="text-xs text-slate-400 font-medium">terminal sync</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "99.4%" }} />
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE CORE & ACTIVITY SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Records / Charts (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Attendance Rhythm Bar Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-2026 border border-slate-100/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Weekly Attendance Velocity Rhythm
                </h2>
                <p className="text-xs text-slate-500">
                  Punctuality percentages and on-time check-ins recorded at Lagos HQ Geofence.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                Average 96.8%
              </span>
            </div>

            {/* Vertical Bars Visual */}
            <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6 pb-2 px-2 border-b border-slate-100">
              {attendanceVelocity.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.rate}%
                  </span>
                  <div
                    className="w-full max-w-[42px] rounded-xl transition-all group-hover:brightness-95 shadow-xs"
                    style={{
                      height: `${(item.rate / 100) * 140}px`,
                      backgroundColor:
                        item.status === "optimal"
                          ? "#22c55e"
                          : item.status === "good"
                            ? "#ff6900"
                            : "#94a3b8",
                    }}
                  />
                  <span className="text-xs font-bold text-slate-700 mt-1">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend & Summary */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Optimal (&gt;95%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff6900]" />
                  <span>Normal (90-95%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Weekend Shift</span>
                </div>
              </div>
              <span className="font-semibold text-slate-700">
                Peak Arrival Window: 08:35 – 08:50 AM WAT
              </span>
            </div>
          </div>

          {/* Section: Department Turnaround & SLA Velocity */}
          <div className="bg-white rounded-3xl p-6 shadow-2026 border border-slate-100/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Unit Velocity &amp; Task Deliverables
                </h2>
                <p className="text-xs text-slate-500">
                  Turnaround benchmarks by team and functional unit.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                4 Active Units
              </span>
            </div>

            <div className="space-y-3">
              {departmentPunctuality.map((dept) => (
                <div
                  key={dept.name}
                  className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50/80 border border-slate-100 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold text-xs shrink-0">
                      {dept.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 group-hover:text-[#ff6900] transition-colors">
                        {dept.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {dept.tasksClosed} deliverables completed this cycle
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {dept.onTime}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Punctuality
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs font-bold text-slate-800">
                        {dept.sla}
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold">
                        SLA Adherence
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. ACTIVITY & AI SUGGESTIONS SIDEBAR (1 Column) */}
        <div className="space-y-6">
          {/* Stanforte AI Operational Insight */}
          <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-3xl p-6 border border-orange-200/60 shadow-2026">
            <div className="flex items-center gap-2 text-[#ff6900] font-black text-xs uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Stanforte Intelligence</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              Workforce Rhythm Analysis
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Attendance reliability reached an all-time peak of 98% this Monday. Requisition approvals submitted before 11:00 AM are cleared within 2.3 hours on average.
            </p>
            <div className="mt-4 pt-3 border-t border-orange-200/40 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-slate-700">
                Suggested Context Queries:
              </div>
              <button
                type="button"
                className="text-left text-xs text-orange-950 bg-white/80 hover:bg-white p-2 rounded-xl border border-orange-200/50 transition font-medium"
              >
                &ldquo;Who logged the highest overtime this cycle?&rdquo;
              </button>
              <button
                type="button"
                className="text-left text-xs text-orange-950 bg-white/80 hover:bg-white p-2 rounded-xl border border-orange-200/50 transition font-medium"
              >
                &ldquo;Compare engineering vs operations turnaround&rdquo;
              </button>
            </div>
          </div>

          {/* Live Activity & SLA Feed */}
          <div className="bg-white rounded-3xl p-6 shadow-2026 border border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Operational Events</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">
                    Shift check-in sync completed
                  </div>
                  <div className="text-[10px] text-slate-400">
                    48 records reconciled • 2 mins ago
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">
                    Task deliverable batch sign-off
                  </div>
                  <div className="text-[10px] text-slate-400">
                    12 items approved by IT Lead • 18 mins ago
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#ff6900] mt-1 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">
                    Leave cover schedule verified
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ibrahim Bello annual leave • 1 hr ago
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                to="/hr/attendance"
                className="flex items-center justify-between text-xs font-bold text-[#ff6900] hover:underline"
              >
                <span>View Workforce Attendance Logs</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PortalLayout>
  );
}

