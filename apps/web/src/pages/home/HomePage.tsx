import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";
import {
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  ArrowRight,
  Play,
  TrendingUp,
  Check,
  ShieldCheck,
  CheckCircle2,
  Download,
  Plus,
  DollarSign,
  ChevronRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Lock,
} from "lucide-react";

type ProductTab = "roster" | "payroll" | "approvals" | "attendance" | "procurement";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ProductTab>("roster");

  return (
    <PublicLayout activePath="/">
      {/* 1. Hero Section (Pixel-by-Pixel match with design system) */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-tight text-slate-900 leading-[1.12] font-headline">
              Run Your Business <br />
              Smarter with <br />
              <span className="text-[#ff6900]">Stanforte Edge</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              An integrated multi-tenant enterprise OS for HR, Payroll, Attendance, Finance and Approvals. Built for growing organizations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-full font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#interactive-demo"
                className="px-7 py-3.5 rounded-full font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-2.5 shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
                </div>
                Watch Demo
              </a>
            </div>

            {/* 5 Feature Module Pills Row */}
            <div className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    activeTab === "roster"
                      ? "border-[#ff6900] bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Users className="h-4 w-4 text-[#ff6900] mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">HR & Workforce</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    activeTab === "attendance"
                      ? "border-[#ff6900] bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Clock className="h-4 w-4 text-[#ff6900] mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Time & Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    activeTab === "payroll"
                      ? "border-[#ff6900] bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-[#ff6900] mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Payroll & Compliance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("procurement")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    activeTab === "procurement"
                      ? "border-[#ff6900] bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Building2 className="h-4 w-4 text-[#ff6900] mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Finance & Procurement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("approvals")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center col-span-2 sm:col-span-1 ${
                    activeTab === "approvals"
                      ? "border-[#ff6900] bg-orange-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <FileCheck className="h-4 w-4 text-[#ff6900] mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Approval Workflows</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual with Woman & Floating Cards */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            {/* Orange Curved Graphic Backdrop */}
            <div className="absolute top-1/2 -translate-y-1/2 right-4 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] bg-gradient-to-tr from-[#ff6900] via-[#ff8800] to-[#ffa500] rounded-full -z-0 opacity-90 blur-0" />

            {/* Hero Photo Container */}
            <div className="relative z-10 w-[310px] sm:w-[380px] h-[400px] sm:h-[480px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                alt="Executive using Stanforte Edge"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Floating Metric Card 1: Total Employees */}
            <div className="absolute -top-3 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Employees</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-extrabold text-slate-900">1,240</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" /> 12%
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Metric Card 2: On Time Today */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:left-0 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">On Time Today</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">96%</div>
              </div>
            </div>

            {/* Floating Metric Card 3: Payroll Ready */}
            <div className="absolute bottom-6 left-2 sm:left-8 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payroll Ready</div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                  &check; Done
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof / Trusted By Bar */}
        <div className="mt-20 pt-8 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              &mdash; Trusted by forward thinking organizations
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-700">AccessBank</span>
              <span className="font-black text-sm sm:text-base tracking-widest text-slate-700">DANGOTE</span>
              <span className="font-black text-sm sm:text-base tracking-tighter text-red-600">UBA&#9650;</span>
              <span className="font-extrabold text-sm sm:text-base text-slate-700">Nestle</span>
              <div className="w-10 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center">
                MTN
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Live Product Experience */}
      <section id="interactive-demo" className="py-20 px-6 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-[#ff6900] text-xs font-bold uppercase tracking-wider">
              Interactive Product Walkthrough
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-headline">
              A Single Workspace for Your Whole Organization
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore how Stanforte Edge unifies staff records, monthly salary disbursements, daily clock-in logs, and internal purchase approvals in one intuitive workspace.
            </p>
          </div>

          {/* Interactive Window Container */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
            {/* Top Window Bar */}
            <div className="border-b border-slate-200 bg-slate-100/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs font-mono text-slate-500 font-medium">app.stanforteedge.com/workspace</span>
              </div>

              {/* Tab Selector Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "roster"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Staff Directory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "payroll"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Payroll Engine
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("approvals")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "approvals"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Approval Queue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "attendance"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daily Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("procurement")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "procurement"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Procurement
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-8">
              {/* Tab 1: Staff Directory */}
              {activeTab === "roster" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Enterprise Workforce Directory</h3>
                      <p className="text-xs text-slate-500">48 active personnel across 4 departments & 2 corporate campus locations</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-slate-50">Filter by Campus</span>
                      <button type="button" className="text-xs bg-[#ff6900] text-white font-bold rounded-lg px-3.5 py-1.5 flex items-center gap-1 shadow-sm">
                        <Plus className="h-3.5 w-3.5" /> Add Employee
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="py-3">Employee Name</th>
                          <th className="py-3">Staff ID</th>
                          <th className="py-3">Department</th>
                          <th className="py-3">Role</th>
                          <th className="py-3">Status</th>
                          <th className="py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-3.5 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">OA</div>
                            <div>
                              <div>Oluwaseun Adeleke</div>
                              <div className="text-[10px] text-slate-400 font-normal">o.adeleke@stanforteedge.com</div>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-slate-500">STE-2024-001</td>
                          <td className="py-3.5">Finance & Accounts</td>
                          <td className="py-3.5 font-medium">Chief Financial Officer</td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-semibold text-[#ff6900] cursor-pointer hover:underline">Manage</td>
                        </tr>
                        <tr>
                          <td className="py-3.5 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6900] font-bold flex items-center justify-center text-xs">FO</div>
                            <div>
                              <div>Fatima Olarinwaju</div>
                              <div className="text-[10px] text-slate-400 font-normal">f.olarinwaju@stanforteedge.com</div>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-slate-500">STE-2024-014</td>
                          <td className="py-3.5">People & Culture</td>
                          <td className="py-3.5 font-medium">Head of Human Resources</td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-semibold text-[#ff6900] cursor-pointer hover:underline">Manage</td>
                        </tr>
                        <tr>
                          <td className="py-3.5 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">CI</div>
                            <div>
                              <div>Chinedu Ibeawuchi</div>
                              <div className="text-[10px] text-slate-400 font-normal">c.ibeawuchi@stanforteedge.com</div>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono text-slate-500">STE-2024-032</td>
                          <td className="py-3.5">Supply Chain</td>
                          <td className="py-3.5 font-medium">Logistics Manager</td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              On Leave
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-semibold text-[#ff6900] cursor-pointer hover:underline">Manage</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Payroll Engine */}
              {activeTab === "payroll" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Monthly Salary Run &bull; November 2026</h3>
                      <p className="text-xs text-slate-500">Automated statutory computations (PAYE Tax, Pension Reform Act 2014, NHF)</p>
                    </div>
                    <span className="text-xs bg-emerald-600 text-white font-bold rounded-lg px-3 py-1.5 shadow-sm">
                      Ready for Disbursement
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Salaries</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;18,450,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">48 active payroll profiles</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PAYE Tax Deductions</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;2,860,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">State IRS schedule ready</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pension Contributions</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;1,476,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">PFA allocation breakdown</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                      <div className="text-[10px] uppercase font-bold text-[#ff6900] tracking-wider">Net Salary Disbursal</div>
                      <div className="text-xl font-black text-[#ff6900] mt-1">&#8358;14,114,000</div>
                      <div className="text-[10px] text-orange-700/80 mt-0.5">Ready for bank batch upload</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Zero calculation errors &bull; Fully audited against daily attendance
                    </span>
                    <button type="button" className="text-xs font-bold text-[#ff6900] hover:underline flex items-center gap-1.5">
                      <Download className="h-4 w-4" /> Download Bank Disbursement Schedule (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Approval Queue */}
              {activeTab === "approvals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Multi-Tier Approval Matrix</h3>
                      <p className="text-xs text-slate-500">Sequential sign-offs preventing unauthorized departmental expenditures</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
                      2 Pending Sign-Offs
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Purchase Voucher &bull; Office IT Hardware Upgrade</span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pending CFO Approval
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Requisitioned by: <span className="font-semibold text-slate-700">Zainab Bello</span> (IT) &bull; Amount: <span className="font-bold text-slate-900">&#8358;420,000</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700">
                          Reject
                        </button>
                        <button type="button" className="px-4 py-1.5 text-xs font-bold bg-[#ff6900] hover:bg-[#ea580c] text-white rounded-lg shadow-sm">
                          Approve Voucher
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Annual Leave Application &bull; 10 Days</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Supervisor Approved
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Requisitioned by: <span className="font-semibold text-slate-700">Emeka Okonkwo</span> &bull; Starting: Dec 1, 2026 &bull; Leave balance remaining: 14 days
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Cleared for HR Record</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Attendance Digest */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Live Campus Attendance Digest</h3>
                      <p className="text-xs text-slate-500">Real-time clock-in records synchronized with biometric devices and polygon geofencing</p>
                    </div>
                    <span className="text-xs border border-slate-200 bg-white rounded-lg px-3 py-1.5 font-semibold text-slate-700">
                      Export Today&apos;s Timesheet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Present On-Site Today</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">45 / 48 (93.7%)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Average clock-in time: 08:18 AM</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Approved Leave / Off-site</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">3 Employees</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">2 Annual Leave, 1 Field Operation</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tardiness Rate</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">0% Discrepancies</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Automatically synced with payroll deductions</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Procurement */}
              {activeTab === "procurement" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Departmental Budgets & Procurement Vouchers</h3>
                      <p className="text-xs text-slate-500">Track quarterly spending allocations against live purchase orders</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                      Q4 Budget: 64% Utilized
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Operations & Logistics</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;8,200,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-[#ff6900] h-1.5 rounded-full w-[72%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">72% of &#8358;11.4M limit</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Information Technology</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;3,450,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-600 h-1.5 rounded-full w-[48%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">48% of &#8358;7.2M limit</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Human Resources</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;1,200,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-600 h-1.5 rounded-full w-[30%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">30% of &#8358;4.0M limit</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep Operational Capabilities (6 Pillar Grid) */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-[#ff6900] text-xs font-bold uppercase tracking-wider">
              Comprehensive Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-headline">
              Engineered for Real-World Organizational Complexity
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Every workflow in Stanforte Edge addresses the exact compliance, payroll, and administrative friction points experienced by growing institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">Automated Salary & Tax Remittances</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compute monthly payroll with statutory PAYE tax schedules, pension administrator remittances, and NHF contributions with zero calculation errors.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">Biometric & Polygon Geofence Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eliminate proxy attendance with GPS coordinate verification and physical biometric machine integration across all branches.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">Multi-Tier Approval Guardrails</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enforce sign-off hierarchies for leave, travel allowances, and purchase vouchers with full audit history and notification routing.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">PostgreSQL Row-Level Multi-Tenancy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Protect sensitive corporate records with strict database-level row isolation, custom roles, and HttpOnly session architecture.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 5 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">Staff Self-Service Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Give employees instant access to download digital payslips, check accrued leave balances, and submit expense claims from any device.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Pillar 6 */}
            <div className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] transition-all shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline">Multi-Subsidiary & Branch Network</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operate across multiple holding entities, state branches, and cost centers with centralized executive oversight.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Step-by-Step Implementation Flow */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
              Up and Running in Less Than an Hour
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Zero complicated infrastructure. Easy bulk onboarding from your existing spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-sm relative">
              <div className="text-3xl font-black text-[#ff6900]/30 font-headline">01</div>
              <h3 className="text-sm font-bold text-slate-900">Import Employee Records</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your staff roster via CSV or Excel with automatic column matching, designation mapping, and bank account verification.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-sm relative">
              <div className="text-3xl font-black text-[#ff6900]/30 font-headline">02</div>
              <h3 className="text-sm font-bold text-slate-900">Define Shifts & Approval Rules</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Set company leave policies, work schedules, and approval limits tailored to your managerial structure and spending guidelines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-sm relative">
              <div className="text-3xl font-black text-[#ff6900]/30 font-headline">03</div>
              <h3 className="text-sm font-bold text-slate-900">Automate Monthly Operations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Run month-end salary calculations in 1 click, auto-generate tax schedules, and export batch payment files directly to your commercial bank.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Enterprise Impact Metrics */}
      <section className="py-16 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">4.8x</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Faster Salary Runs</div>
            <div className="text-[11px] text-slate-500">From 4 days to under 45 minutes</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">99.8%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Calculation Accuracy</div>
            <div className="text-[11px] text-slate-500">Zero PAYE or pension discrepancies</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">100%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Audit Trail Integrity</div>
            <div className="text-[11px] text-slate-500">Every voucher and approval logged</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">99.9%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform Availability</div>
            <div className="text-[11px] text-slate-500">ISO-certified high availability</div>
          </div>
        </div>
      </section>

      {/* 6. Executive Customer Testimonials */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
              Trusted by Operational Leaders
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              See how corporate leaders streamline their workforce administration with Stanforte Edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;Before Stanforte Edge, reconcilining attendance from three branches with monthly salaries took a week. Now payroll is compiled in under an hour with complete tax compliance.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">IB</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Ibrahim Balogun</div>
                  <div className="text-[10px] text-slate-500">Director of Operations, West Africa Logistics</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;The multi-tier purchase approval system stopped budget overruns dead in their tracks. Every requisition requires departmental approval before cash is disbursed.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6900] font-bold flex items-center justify-center text-xs">CN</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Chioma Nnamdi</div>
                  <div className="text-[10px] text-slate-500">Chief Financial Officer, Apex Holdings</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;Our staff love the self-service portal. They can apply for leave and immediately download their monthly payslips without contacting HR every single month.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">TA</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Tolulope Adeleke</div>
                  <div className="text-[10px] text-slate-500">Head of Human Resources, Zenith Tech</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. High-Conversion Bottom Call to Action */}
      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#070e20] to-[#0a1128] text-white p-10 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-400 text-xs font-bold uppercase tracking-wider">
            Ready to Get Started?
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-headline max-w-2xl mx-auto leading-tight">
            Run your organization with clarity and confidence.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Provision your organization workspace in less than 60 seconds. Free for up to 15 employees with zero credit card required.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-full font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-xl shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Start Free Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="px-7 py-4 rounded-full font-semibold text-sm border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            >
              View Headcount Pricing
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
