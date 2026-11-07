import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <PublicLayout activePath="/pricing">
      {/* Header */}
      <section className="pt-16 pb-14 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-6">
          Transparent Pricing
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Plans designed for organizations of all sizes
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Start with our complimentary tier for smaller teams, or upgrade to complete automated payroll and multi-level approvals as your workforce grows.
        </p>

        {/* Billing Switch */}
        <div className="mt-8 inline-flex items-center gap-2 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setAnnualBilling(false)}
            className={`px-4 py-2 rounded-md transition-colors ${
              !annualBilling ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnualBilling(true)}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
              annualBilling ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Annual Billing
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 max-w-7xl mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Starter */}
          <div className="p-8 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">
                Free
              </div>
              <div className="text-xs text-slate-500 mt-1">For teams up to 15 employees</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Core tools to organize staff profiles, basic attendance tracking, and employee leave requests.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Included features:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Up to 15 active staff records
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Employee directory & profiles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Standard leave tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Web-based clock-in / clock-out
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Role-based access permissions
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="w-full block text-center py-2.5 px-4 rounded-md font-semibold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>

          {/* Tier 2: Growth (Recommended) */}
          <div className="p-8 rounded-xl border-2 border-slate-900 bg-white shadow-sm flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Growth</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">
                {annualBilling ? "$49" : "$59"}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Billed annually (or &#8358;35,000/mo)</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Complete automated payroll with tax calculations, multi-tier approvals, and departmental budgets for scaling firms.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Everything in Starter, plus:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Up to 100 active staff records
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Automated monthly payroll & tax schedules
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Multi-level approval chains
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Biometric & geofenced attendance
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Expense & procurement requisitions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Bank disbursement schedule exports
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="w-full block text-center py-2.5 px-4 rounded-md font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                Start Growth Plan
              </Link>
            </div>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="p-8 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">
                Custom
              </div>
              <div className="text-xs text-slate-500 mt-1">Multi-branch and conglomerate operations</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Dedicated infrastructure, tailored statutory deductions, ERP integrations, and custom SLA commitments.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Enterprise features:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Unlimited staff across multiple subsidiaries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Custom approval hierarchies & budgets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> 99.9% uptime Service Level Agreement
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Dedicated technical account manager
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">&#10003;</span> Custom payroll tax rule configuration
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="mailto:sales@stanforteedge.com"
                className="w-full block text-center py-2.5 px-4 rounded-md font-semibold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 font-headline mb-6 text-center">
            Detailed Plan Comparison
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                  <th className="p-4 w-1/2">Capability</th>
                  <th className="p-4 text-center">Starter</th>
                  <th className="p-4 text-center bg-slate-100/50">Growth</th>
                  <th className="p-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-4 font-medium text-slate-900">Included Employee Seats</td>
                  <td className="p-4 text-center">Up to 15</td>
                  <td className="p-4 text-center font-semibold text-slate-900 bg-slate-50/50">Up to 100</td>
                  <td className="p-4 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Automated Monthly Payroll</td>
                  <td className="p-4 text-center text-slate-400">&mdash;</td>
                  <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">&#10003;</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">&#10003;</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Statutory Tax & Pension Schedules</td>
                  <td className="p-4 text-center text-slate-400">&mdash;</td>
                  <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">&#10003;</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">&#10003;</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Multi-Tier Approval Routing</td>
                  <td className="p-4 text-center">Single Level</td>
                  <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">&#10003; Up to 3 Levels</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">&#10003; Custom Hierarchies</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Attendance Clock-in Validation</td>
                  <td className="p-4 text-center">Web Portal</td>
                  <td className="p-4 text-center text-slate-900 bg-slate-50/50">Biometric & GPS Geofence</td>
                  <td className="p-4 text-center text-slate-900">Hardware & API Sync</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Audit Trail Retention</td>
                  <td className="p-4 text-center">30 Days</td>
                  <td className="p-4 text-center text-slate-900 bg-slate-50/50">1 Year</td>
                  <td className="p-4 text-center font-semibold text-slate-900">Permanent (7+ Years)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Technical Support</td>
                  <td className="p-4 text-center">Email</td>
                  <td className="p-4 text-center font-medium text-slate-900 bg-slate-50/50">Priority Email & Chat</td>
                  <td className="p-4 text-center font-semibold text-slate-900">Dedicated Account Manager</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-white py-16 px-6 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 font-headline mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="p-5 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900">Can I migrate our existing employee records from Excel?</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Yes. Stanforte Edge supports bulk CSV imports for employee profiles, leave balances, bank account details, and departmental structures.
              </p>
            </div>

            <div className="p-5 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900">How is monthly payroll calculated?</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Payroll computes gross salaries, statutory PAYE taxes, pension contributions, and custom allowances or deductions based on approved attendance records. You can preview, adjust, and approve before exporting bank payment files.
              </p>
            </div>

            <div className="p-5 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900">What payment methods are supported for billing?</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                We support corporate electronic transfers, major debit/credit cards, and direct debit in both Nigerian Naira (&#8358;) and USD ($).
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
