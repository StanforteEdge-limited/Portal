import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  LayoutDashboard,
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
  DollarSign,
  UserCheck,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState("Dashboard");

  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Daniel Owonikoko";
  const userRole = user?.roles?.[0] ? String(user.roles[0]).replace(/_/g, " ") : "Admin";
  const orgName = (user as any)?.workspace_name || "Acme Nigeria Ltd";

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "HR & Workforce", icon: Users, path: "/admin/users" },
    { label: "Attendance", icon: Clock, path: "/attendance" },
    { label: "Payroll", icon: CreditCard, path: "/finance" },
    { label: "Finance & Procurement", icon: Building2, path: "/finance" },
    { label: "Approvals", icon: FileCheck, path: "/approvals" },
    { label: "Reports", icon: BarChart3, path: "/dashboard" },
    { label: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex font-sans text-slate-900 selection:bg-[#ff6900] selection:text-white">
      {/* 1. Left Sidebar (Dark Navy #0a1128) */}
      <aside className="w-64 bg-[#0a1128] text-white flex flex-col justify-between shrink-0 min-h-screen p-5">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="pt-2">
            <Link to="/dashboard" className="inline-block">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setActiveNav(item.label)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Pill at Bottom of Sidebar */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-[#ff6900] font-bold text-xs flex items-center justify-center border border-orange-500/30">
              {userName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{userName}</div>
              <div className="text-[10px] text-slate-400 capitalize">{userRole}</div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-white" />
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Search Input */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none transition focus:bg-white focus:border-[#ff6900]"
            />
          </div>

          {/* Right Items: Notifications & Org Selector */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </div>

            {/* Organization Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-slate-600" />
              <span>{orgName}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
              <span>Last 30 days</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* 4 Metric Cards in 1 Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Employees */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Present Today</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">1,186</div>
                </div>
              </div>
              <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                95.6%
              </div>
            </div>

            {/* Card 3: Pending Approvals */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Pending Approvals</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">23</div>
              </div>
            </div>

            {/* Card 4: Payroll Status */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Payroll Status</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">Ready</div>
              </div>
            </div>
          </div>

          {/* Grid Row: Attendance Overview + Quick Actions + Next Payroll */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 6 Columns: Attendance Overview Chart */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
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

              {/* Chart SVG Canvas */}
              <div className="h-60 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-axis labels */}
                  <g className="text-[10px] fill-slate-400">
                    <line x1="30" y1="20" x2="490" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <text x="5" y="24">1.5k</text>

                    <line x1="30" y1="70" x2="490" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                    <text x="12" y="74">1k</text>

                    <line x1="30" y1="120" x2="490" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                    <text x="8" y="124">500</text>

                    <line x1="30" y1="170" x2="490" y2="170" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="18" y="174">0</text>
                  </g>

                  {/* Present Area Gradient */}
                  <path
                    d="M 40 70 Q 110 50, 180 65 T 320 60 T 470 70 L 470 170 L 40 170 Z"
                    fill="url(#presentGrad)"
                  />

                  {/* Present Spline Curve (Blue) */}
                  <path
                    d="M 40 70 Q 110 50, 180 65 T 320 60 T 470 70"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Absent Spline Curve (Orange) */}
                  <path
                    d="M 40 155 Q 110 145, 180 150 T 320 148 T 470 155"
                    fill="none"
                    stroke="#ff6900"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* X-Axis Days Labels */}
                  <g className="text-[11px] fill-slate-500 font-medium">
                    <text x="40" y="192" textAnchor="middle">Mon</text>
                    <text x="110" y="192" textAnchor="middle">Tue</text>
                    <text x="180" y="192" textAnchor="middle">Wed</text>
                    <text x="250" y="192" textAnchor="middle">Thu</text>
                    <text x="320" y="192" textAnchor="middle">Fri</text>
                    <text x="390" y="192" textAnchor="middle">Sat</text>
                    <text x="470" y="192" textAnchor="middle">Sun</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Middle 3 Columns: Quick Actions */}
            <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>

              <div className="space-y-2.5">
                {/* 1. Process Payroll */}
                <Link
                  to="/finance"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">Process Payroll</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </Link>

                {/* 2. Approve Requests */}
                <Link
                  to="/approvals"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">Approve Requests</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </Link>

                {/* 3. Request Leave */}
                <Link
                  to="/requests"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">Request Leave</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </Link>

                {/* 4. Raise Purchase Order */}
                <Link
                  to="/finance"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">Raise Purchase Order</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </Link>
              </div>
            </div>

            {/* Right 3 Columns: Next Payroll in 5 Days Card */}
            <div className="lg:col-span-3 p-6 rounded-2xl bg-gradient-to-b from-[#131d36] to-[#0a1128] text-white flex flex-col justify-between min-h-[280px] shadow-lg relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4 relative z-10 text-center flex flex-col items-center">
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
        </main>
      </div>
    </div>
  );
}
