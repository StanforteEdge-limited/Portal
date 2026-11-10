import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import {
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
  UserCheck,
} from "lucide-react";

export default function DashboardPage() {
  const quickActions = [
    { label: "Process Payroll", icon: CreditCard, path: "/finance", color: "text-emerald-600 bg-emerald-50" },
    { label: "Approve Requests", icon: FileCheck, path: "/requests/approvals", color: "text-blue-600 bg-blue-50" },
    { label: "Request Leave", icon: Calendar, path: "/leave", color: "text-purple-600 bg-purple-50" },
    { label: "Raise Purchase Order", icon: Building2, path: "/procurement", color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-6">
        {/* Title Row & Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Here&apos;s what&apos;s happening in your organization today.
            </p>
          </div>

          {/* Date Filter Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 self-start sm:self-auto">
            <span>Last 30 days</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 4 Metric Cards in 1 Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Employees */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Employees</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">1,240</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> 12%
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Present Today</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">1,186</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              95.6%
            </div>
          </div>

          {/* Card 3: Pending Approvals */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Pending Approvals</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">23</div>
            </div>
          </div>

          {/* Card 4: Payroll Status */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Payroll Status</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">Ready</div>
            </div>
          </div>
        </div>

        {/* Grid Row: Attendance Overview + Quick Actions + Next Payroll (6 + 3 + 3 = 12 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 6 Columns: Attendance Overview Chart */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-slate-600">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff6900]" />
                  <span className="text-slate-600">Absent</span>
                </div>
              </div>
            </div>

            {/* SVG Wave Chart with Y-axis and X-axis matching mockup */}
            <div className="flex items-stretch gap-2 h-48 w-full pt-2">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 py-1 select-none pr-1">
                <span>1.5k</span>
                <span>1k</span>
                <span>500</span>
                <span>0</span>
              </div>

              {/* Chart SVG Canvas */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="h-40 w-full relative">
                  <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6900" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ff6900" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Subtle Horizontal Grid lines */}
                    <line x1="0" y1="10" x2="500" y2="10" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="55" x2="500" y2="55" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="0" y1="145" x2="500" y2="145" stroke="#e2e8f0" />

                    {/* Present Area & Smooth Curve */}
                    <path
                      d="M 0 55 Q 80 35, 160 48 T 330 32 T 500 45 L 500 145 L 0 145 Z"
                      fill="url(#presentGrad)"
                    />
                    <path
                      d="M 0 55 Q 80 35, 160 48 T 330 32 T 500 45"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Absent Area & Smooth Curve */}
                    <path
                      d="M 0 115 Q 80 105, 170 112 T 340 98 T 500 108 L 500 145 L 0 145 Z"
                      fill="url(#absentGrad)"
                    />
                    <path
                      d="M 0 115 Q 80 105, 170 112 T 340 98 T 500 108"
                      fill="none"
                      stroke="#ff6900"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* X-axis Days of week */}
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center 3 Columns: Quick Actions */}
          <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>

              <div className="space-y-2.5">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <Link
                      key={qa.label}
                      to={qa.path}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${qa.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                          {qa.label}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 3 Columns: Next Payroll Card (Dark Navy Glowing Card) */}
          <div className="lg:col-span-3 p-5 rounded-2xl bg-[#0a1128] text-white flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[260px]">
            {/* Subtle Orange Radial Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10 text-center flex flex-col items-center pt-2">
              {/* Calendar Illustration Badge */}
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex flex-col items-center justify-center relative shadow-inner">
                <Calendar className="h-8 w-8 text-white" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ff6900] flex items-center justify-center text-white shadow-md">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">Next Payroll</h4>
                <div className="text-xs text-orange-400 font-semibold mt-0.5">in 5 days</div>
              </div>
            </div>

            <div className="pt-4 relative z-10">
              <Link
                to="/finance"
                className="w-full block py-2.5 px-4 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white text-center shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
              >
                View Details &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
