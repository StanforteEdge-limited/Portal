import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <PublicLayout activePath="/pricing">
      {/* Hero Header */}
      <section className="pt-20 pb-16 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          Simple, Predictable SaaS Pricing
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Transparent Plans Built to Scale With Your Workforce
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          Start free with core workforce tools, then scale into automated payroll, multi-currency ledgers, and B2B vendor portals as your organization grows.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-10 inline-flex items-center gap-4 p-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
          <button
            onClick={() => setAnnualBilling(false)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              !annualBilling ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnualBilling(true)}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              annualBilling ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Annual Billing
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</div>
              <div className="text-4xl sm:text-5xl font-black text-white mt-3">
                $0 <span className="text-sm text-slate-400 font-normal">/ month</span>
              </div>
              <div className="text-xs text-emerald-400 font-semibold mt-1">Free forever • No credit card required</div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                Ideal for startups, non-profits, and small teams needing modern attendance, leave, and request tracking.
              </p>

              <div className="border-t border-slate-800 my-6" />

              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Included Features:</div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Up to 15 Active Employees
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Clock-In / Clock-Out Attendance
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Leave Allowances & Approvals
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Standard Expense & Travel Requests
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  5 GB Secure S3 Cloud Storage
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Community & Documentation Support
                </li>
              </ul>
            </div>

            <Link
              to="/register"
              className="mt-8 block text-center py-3.5 rounded-xl font-bold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all transform hover:-translate-y-0.5"
            >
              Start Free Workspace
            </Link>
          </div>

          {/* Growth / Business Plan */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-blue-900/40 via-slate-800/60 to-slate-900 border-2 border-blue-500 flex flex-col justify-between relative shadow-2xl shadow-blue-500/20 transform md:-translate-y-2">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold bg-blue-500 text-white uppercase tracking-wider shadow-md">
              Most Popular
            </span>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-400">Growth / Business</div>
              <div className="text-4xl sm:text-5xl font-black text-white mt-3">
                {annualBilling ? "$39" : "$49"}{" "}
                <span className="text-sm text-slate-400 font-normal">/ month</span>
              </div>
              <div className="text-xs text-blue-300 font-semibold mt-1">
                {annualBilling ? "Billed annually ($468/yr)" : "Billed monthly"}
              </div>
              <p className="text-xs text-slate-300 mt-4 leading-relaxed">
                Everything growing companies need: automated payroll, statutory tax deductions, and full financial ledgers.
              </p>

              <div className="border-t border-slate-800/80 my-6" />

              <div className="text-xs font-bold text-white uppercase tracking-wider mb-4">Everything in Starter, plus:</div>
              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Up to 100 Active Employees
                </li>
                <li className="flex items-center gap-2.5 font-semibold text-white">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Automated Monthly Payroll Runs
                </li>
                <li className="flex items-center gap-2.5 font-semibold text-white">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Statutory Tax (PAYE, Pension, NHF)
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Batch PDF Payslip Email Delivery
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  GPS-Geofenced Attendance Hubs
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Double-Entry General Ledger & Accounts
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  50 GB Secure S3 Cloud Storage
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Priority Email & Live Chat Support
                </li>
              </ul>
            </div>

            <Link
              to="/register"
              className="mt-8 block text-center py-4 rounded-xl font-extrabold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise</div>
              <div className="text-4xl sm:text-5xl font-black text-white mt-3">
                Custom <span className="text-sm text-slate-400 font-normal">/ quote</span>
              </div>
              <div className="text-xs text-indigo-400 font-semibold mt-1">Dedicated cloud • Custom governance</div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                For large corporations and holding groups requiring multi-entity hierarchies, B2B vendor portals, and custom SLAs.
              </p>

              <div className="border-t border-slate-800 my-6" />

              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Everything in Growth, plus:</div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Unlimited Employees & Subsidiaries
                </li>
                <li className="flex items-center gap-2.5 font-semibold text-white">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  B2B Vendor Portal & Purchase Orders
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Multi-Tier Custom Approval Workflows
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Dedicated Redis & S3 Bucket Partitions
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  Custom Single Sign-On (SSO) & SAML
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  99.99% Uptime SLA & Dedicated Account Lead
                </li>
              </ul>
            </div>

            <a
              href="mailto:sales@stanforteedge.com?subject=Enterprise%20Inquiry%20-%20Stanforte%20Edge%20Portal"
              className="mt-8 block text-center py-3.5 rounded-xl font-bold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all transform hover:-translate-y-0.5"
            >
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      </section>

      {/* In-Depth Feature Comparison Matrix */}
      <section className="px-6 max-w-7xl mx-auto py-16 border-t border-slate-800">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Detailed Breakdown</div>
          <h2 className="text-3xl font-extrabold text-white">Complete Feature Comparison</h2>
          <p className="text-slate-400 text-sm mt-2">See exactly what is included in each subscription tier.</p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-300">
                <th className="py-4 px-6 font-bold text-sm text-white">Capability</th>
                <th className="py-4 px-6 font-bold text-sm text-white w-48 text-center">Starter</th>
                <th className="py-4 px-6 font-bold text-sm text-blue-400 w-52 text-center bg-blue-500/10">Growth</th>
                <th className="py-4 px-6 font-bold text-sm text-indigo-400 w-48 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {/* Category: Workforce & Tenancy */}
              <tr className="bg-slate-900/40 font-bold text-slate-200">
                <td colSpan={4} className="py-3 px-6 uppercase tracking-wider text-[11px] text-blue-400">
                  Workforce & Multi-Tenancy
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6">Included Active Employee Seats</td>
                <td className="py-3 px-6 text-center">15 Staff</td>
                <td className="py-3 px-6 text-center font-semibold text-white bg-blue-500/5">100 Staff</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Tenant Organizations & Subsidiaries</td>
                <td className="py-3 px-6 text-center">1 Workspace</td>
                <td className="py-3 px-6 text-center bg-blue-500/5">Up to 3 Sub-Orgs</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Unlimited Multi-Entity</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Custom Roles & Permissions (RBAC)</td>
                <td className="py-3 px-6 text-center">Standard Roles</td>
                <td className="py-3 px-6 text-center bg-blue-500/5">Custom Roles</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Granular Bitfield RBAC</td>
              </tr>

              {/* Category: HR & Attendance */}
              <tr className="bg-slate-900/40 font-bold text-slate-200">
                <td colSpan={4} className="py-3 px-6 uppercase tracking-wider text-[11px] text-blue-400">
                  People Operations & Attendance
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6">Web & Mobile Clock In/Out</td>
                <td className="py-3 px-6 text-center"><span className="material-symbols-outlined text-sm text-emerald-400">check</span></td>
                <td className="py-3 px-6 text-center bg-blue-500/5"><span className="material-symbols-outlined text-sm text-emerald-400">check</span></td>
                <td className="py-3 px-6 text-center"><span className="material-symbols-outlined text-sm text-emerald-400">check</span></td>
              </tr>
              <tr>
                <td className="py-3 px-6">GPS Geofenced Office Locations</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center font-semibold text-white bg-blue-500/5">Included</td>
                <td className="py-3 px-6 text-center font-semibold text-white">Included + Biometric Webhooks</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Leave Accrual & Carry-Over Rules</td>
                <td className="py-3 px-6 text-center">Standard</td>
                <td className="py-3 px-6 text-center bg-blue-500/5">Advanced Multi-Policy</td>
                <td className="py-3 px-6 text-center">Custom Tenure Rules</td>
              </tr>

              {/* Category: Payroll & Finance */}
              <tr className="bg-slate-900/40 font-bold text-slate-200">
                <td colSpan={4} className="py-3 px-6 uppercase tracking-wider text-[11px] text-blue-400">
                  Payroll & Financial Accounting
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6">Automated Monthly Pay Runs</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center font-semibold text-emerald-400 bg-blue-500/5">Automated Runs</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Multi-Batch Parallel Runs</td>
              </tr>
              <tr>
                <td className="py-3 px-6">PAYE, Pension & NHF Deductions</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center font-semibold text-emerald-400 bg-blue-500/5">Automated Tables</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Custom Statutory Formulas</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Double-Entry General Ledger</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center font-semibold text-emerald-400 bg-blue-500/5">Included</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Multi-Currency Ledger</td>
              </tr>

              {/* Category: Procurement & Workflows */}
              <tr className="bg-slate-900/40 font-bold text-slate-200">
                <td colSpan={4} className="py-3 px-6 uppercase tracking-wider text-[11px] text-blue-400">
                  Procurement & B2B Vendor Management
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6">Public-Facing B2B Vendor Portal</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center text-slate-600 bg-blue-500/5">—</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Included</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Automated Purchase Order (PO) PDF</td>
                <td className="py-3 px-6 text-center text-slate-600">—</td>
                <td className="py-3 px-6 text-center text-slate-600 bg-blue-500/5">—</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Included</td>
              </tr>

              {/* Category: Storage & SLA */}
              <tr className="bg-slate-900/40 font-bold text-slate-200">
                <td colSpan={4} className="py-3 px-6 uppercase tracking-wider text-[11px] text-blue-400">
                  Cloud Infrastructure & Support
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6">Secure S3 Cloud Storage</td>
                <td className="py-3 px-6 text-center">5 GB</td>
                <td className="py-3 px-6 text-center font-semibold text-white bg-blue-500/5">50 GB</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">Dedicated Terabyte Pool</td>
              </tr>
              <tr>
                <td className="py-3 px-6">Support Channels</td>
                <td className="py-3 px-6 text-center">Community</td>
                <td className="py-3 px-6 text-center bg-blue-500/5">Email & Live Chat</td>
                <td className="py-3 px-6 text-center font-bold text-emerald-400">24/7 Dedicated Manager</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="px-6 max-w-4xl mx-auto py-16 border-t border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-sm mt-2">Have a question about our SaaS platform? Find quick answers below.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does workspace multi-tenancy protect my organization's data?",
              a: "Stanforte Edge is built with strict row-level tenant isolation in PostgreSQL. Every database record is cryptographically bound to your workspace's unique tenant ID, and context-bound repositories prevent cross-tenant data access at both compile-time and runtime.",
            },
            {
              q: "Can I add more employees as our company expands?",
              a: "Yes. You can upgrade seamlessly between tiers from your workspace administrator settings at any point. Your existing data, staff profiles, leave balances, and financial history remain 100% intact.",
            },
            {
              q: "How are statutory payroll deductions (PAYE, Pension) handled?",
              a: "Our automated payroll engine incorporates African and international tax brackets, calculating PAYE tax, pension fund contributions, and statutory employee/employer shares automatically during every monthly pay run.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We support Visa, Mastercard, American Express, direct corporate bank transfer (NIP / SEPA / SWIFT), and automated monthly invoicing for Enterprise accounts.",
            },
            {
              q: "Can we migrate our existing employee and financial data from spreadsheets?",
              a: "Yes. Our admin suite provides built-in CSV bulk import tools for employees, historical leave balances, and initial chart of accounts ledgers.",
            },
          ].map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800">
              <h3 className="font-bold text-white text-base">{faq.q}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}

