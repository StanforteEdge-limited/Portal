import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";

type ShowcaseTab = "roster" | "payroll" | "approvals" | "attendance";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("roster");

  return (
    <PublicLayout activePath="/">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-6">
            Enterprise Workforce Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 font-headline leading-[1.12]">
            Workforce, payroll, and operations for modern organizations.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-body">
            Stanforte Edge unifies staff directory, automated salary disbursement, biometric attendance tracking, and multi-tier approval workflows in a single, dependable portal.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-md font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Start Free Workspace
            </Link>
            <Link
              to="/pricing"
              className="px-6 py-3.5 rounded-md font-semibold text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              View Pricing & Plans
            </Link>
            <span className="text-xs text-slate-500 pl-2">
              Free for up to 15 employees &bull; No credit card needed
            </span>
          </div>
        </div>

        {/* Realistic Product Mockup UI */}
        <div className="mt-14 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Top Bar of Product Window */}
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="ml-3 text-xs font-mono text-slate-500">app.stanforteedge.com/workspace</span>
            </div>

            {/* Interactive Tabs */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs font-medium">
              <button
                onClick={() => setActiveTab("roster")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "roster"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Staff Directory
              </button>
              <button
                onClick={() => setActiveTab("payroll")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "payroll"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Payroll Summary
              </button>
              <button
                onClick={() => setActiveTab("approvals")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "approvals"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Approvals & Requests
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "attendance"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Daily Attendance
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-6 overflow-x-auto">
            {activeTab === "roster" && (
              <div className="min-w-[680px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Active Staff Directory</h3>
                    <p className="text-xs text-slate-500">Showing 48 total verified team members across 4 departments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs border border-slate-200 rounded px-2.5 py-1 text-slate-600">Filter by Department</span>
                    <span className="text-xs bg-slate-900 text-white rounded px-3 py-1 font-medium">+ Add Employee</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs mt-3">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100">
                      <th className="py-2.5">Employee Name</th>
                      <th className="py-2.5">Staff ID</th>
                      <th className="py-2.5">Department</th>
                      <th className="py-2.5">Role</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 font-medium text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">OA</div>
                        Oluwaseun Adeleke
                      </td>
                      <td className="py-3 font-mono text-slate-500">STE-2024-001</td>
                      <td className="py-3">Finance & Accounts</td>
                      <td className="py-3">Chief Financial Officer</td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-medium hover:text-slate-900 cursor-pointer">Manage</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">FO</div>
                        Fatima Olarinwaju
                      </td>
                      <td className="py-3 font-mono text-slate-500">STE-2024-014</td>
                      <td className="py-3">Human Resources</td>
                      <td className="py-3">HR Business Partner</td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-medium hover:text-slate-900 cursor-pointer">Manage</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">CI</div>
                        Chinedu Ibeawuchi
                      </td>
                      <td className="py-3 font-mono text-slate-500">STE-2024-032</td>
                      <td className="py-3">Operations & Logistics</td>
                      <td className="py-3">Fleet Supervisor</td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          On Leave
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-medium hover:text-slate-900 cursor-pointer">Manage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "payroll" && (
              <div className="min-w-[680px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Monthly Payroll Run &bull; November 2026</h3>
                    <p className="text-xs text-slate-500">Statutory deductions (PAYE, NHF, Pension) auto-calculated</p>
                  </div>
                  <span className="text-xs bg-emerald-600 text-white rounded px-3 py-1 font-medium">Batch Approved</span>
                </div>

                <div className="grid grid-cols-4 gap-4 my-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Gross Salaries</div>
                    <div className="text-base font-bold text-slate-900 mt-1">&#8358;18,450,000</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">PAYE Tax Remittance</div>
                    <div className="text-base font-bold text-slate-900 mt-1">&#8358;2,860,000</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Pension Contributions</div>
                    <div className="text-base font-bold text-slate-900 mt-1">&#8358;1,476,000</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Net Disbursed</div>
                    <div className="text-base font-bold text-slate-900 mt-1">&#8358;14,114,000</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
                  <span>Batch Bank Disbursals: 48 Accounts matched</span>
                  <span className="text-blue-700 font-semibold cursor-pointer hover:underline">Download Bank Schedule (CSV) &rarr;</span>
                </div>
              </div>
            )}

            {activeTab === "approvals" && (
              <div className="min-w-[680px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Multi-Tier Approval Queue</h3>
                    <p className="text-xs text-slate-500">2 pending management sign-offs requiring action</p>
                  </div>
                  <span className="text-xs border border-slate-200 rounded px-2.5 py-1 text-slate-600">All Categories</span>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="p-3.5 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">Expense Claim &bull; Office Equipment Replacement</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending CFO Approval</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Requested by: Zainab Bello (IT Support) &bull; Amount: &#8358;420,000</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-50">Reject</button>
                      <button className="px-3 py-1 text-xs bg-slate-900 text-white rounded hover:bg-slate-800">Approve Voucher</button>
                    </div>
                  </div>

                  <div className="p-3.5 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">Annual Leave Request &bull; 10 Days</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Supervisor Approved</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Requested by: Emeka Okonkwo &bull; Starting: Dec 1, 2026 &bull; Balance Remaining: 14 days</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Cleared for HR Record</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="min-w-[680px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Today&apos;s Attendance Digest</h3>
                    <p className="text-xs text-slate-500">Real-time clock-in log &bull; Main Corporate Campus</p>
                  </div>
                  <span className="text-xs border border-slate-200 rounded px-2.5 py-1 text-slate-600">Export Today&apos;s Sheet</span>
                </div>

                <div className="grid grid-cols-3 gap-4 my-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Present Today</div>
                    <div className="text-base font-bold text-emerald-700 mt-1">45 / 48 (93.7%)</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Average Clock-In</div>
                    <div className="text-base font-bold text-slate-900 mt-1">08:18 AM</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Approved Leave / Off-site</div>
                    <div className="text-base font-bold text-slate-600 mt-1">3 Employees</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="border-t border-slate-200 bg-slate-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-headline">
              Engineered for everyday corporate operations
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              Replace disconnected spreadsheets and manual email approvals with structured, auditable workflows.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <div className="text-slate-900 font-bold text-base">Compliant Salary & Payroll</div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automate monthly payroll calculations with local tax schedules, pension administrator schedules, and downloadable bank disbursement files.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                <li>&bull; Automatic PAYE tax computations</li>
                <li>&bull; PDF payslips generated per employee</li>
                <li>&bull; Direct bank schedule exports</li>
              </ul>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <div className="text-slate-900 font-bold text-base">Attendance & Shift Records</div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Record clock-in times across branches with biometric device integration, office network validation, and automated tardiness calculations.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                <li>&bull; Shift scheduling and roster management</li>
                <li>&bull; Automated leave deduction reconciliation</li>
                <li>&bull; Overtime logs for payroll integration</li>
              </ul>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <div className="text-slate-900 font-bold text-base">Multi-Level Approvals</div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Configure customized approval chains for leave, purchase vouchers, and cash advances with full traceability and email notifications.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                <li>&bull; Line manager and finance sign-offs</li>
                <li>&bull; Spending limit enforcement</li>
                <li>&bull; Permanent audit log for external review</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Standards Bar */}
      <section className="border-t border-slate-200 bg-white py-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <div className="text-3xl font-bold text-slate-900">99.9%</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Service Uptime SLA</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-slate-900">Strict</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Tenant Data Isolation</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-slate-900">Full</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Statutory Compliance</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-slate-900">24/7</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Enterprise SLA Support</div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
