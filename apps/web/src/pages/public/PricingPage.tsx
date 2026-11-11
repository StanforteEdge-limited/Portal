import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Check, Minus, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <PublicLayout activePath="/pricing">
      {/* Header Section */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-5">
        <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
          Predictable Headcount Pricing
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-headline">
          Plans Designed for Growing <br className="hidden sm:inline" />
          <span className="text-[#ff6900]">Organizations</span>
        </h1>

        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Start with our free tier for early-stage teams, or scale to automated payroll, attendance tracking, and multi-tier approval chains as you grow.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="pt-2">
          <div className="inline-flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`px-5 py-2 rounded-full transition-all ${
                !annualBilling
                  ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`px-5 py-2 rounded-full transition-all flex items-center gap-1.5 ${
                annualBilling
                  ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual Billing
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* 1. Starter Tier */}
          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</div>
              <div className="text-4xl font-black text-slate-900 mt-2">
                Free
              </div>
              <div className="text-xs text-slate-500 mt-1">For teams up to 15 employees</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Core staff records, profile directory, and self-service leave requests for small teams and branch offices.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Included features:</div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Up to 15 active staff records
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Employee directory & profiles
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Standard leave tracking
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Web-based clock-in / clock-out
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Role-based access permissions
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="w-full block text-center py-3 px-4 rounded-full font-bold text-xs border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>

          {/* 2. Growth Tier (Most Popular) */}
          <div className="p-8 rounded-3xl border-2 border-[#ff6900] bg-white flex flex-col justify-between relative shadow-xl">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#ff6900] text-white text-[10px] uppercase font-bold tracking-wider px-3.5 py-1 rounded-md shadow-sm">
                Most Popular
              </span>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#ff6900]">Growth</div>
              <div className="text-4xl font-black text-slate-900 mt-2">
                {annualBilling ? "$49" : "$59"}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Billed annually (or &#8358;35,000/mo)</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Automated monthly salary calculation with local tax formulas, multi-tier approvals, and budget tracking.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Everything in Starter, plus:</div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Up to 100 active staff records
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Automated monthly payroll & tax schedules
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Multi-level approval chains
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Biometric & geofenced attendance
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Expense & procurement requisitions
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Commercial bank schedule CSV export
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="w-full py-3.5 px-4 rounded-full font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              >
                <span>Start Growth Plan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* 3. Enterprise Tier */}
          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</div>
              <div className="text-4xl font-black text-slate-900 mt-2">
                Custom
              </div>
              <div className="text-xs text-slate-500 mt-1">Multi-branch and conglomerate operations</div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Dedicated infrastructure, tailored statutory deductions, ERP integrations, and custom SLA commitments.
              </p>

              <div className="border-t border-slate-100 my-6" />

              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Enterprise capabilities:</div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Unlimited staff across multiple subsidiaries
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Custom approval hierarchies & budgets
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  99.9% uptime Service Level Agreement
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Dedicated technical account manager
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  Custom payroll tax rule configuration
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="mailto:sales@stanforteedge.com"
                className="w-full block text-center py-3 px-4 rounded-full font-bold text-xs border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Detailed Plan Comparison
            </h2>
            <p className="text-xs text-slate-500">Side-by-side feature capability breakdown</p>
          </div>

          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold">
                  <th className="p-4 w-1/2">Capability</th>
                  <th className="p-4 text-center">Starter</th>
                  <th className="p-4 text-center bg-orange-50/50 text-[#ff6900] font-bold">Growth</th>
                  <th className="p-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-4 font-medium text-slate-900">Included Employee Seats</td>
                  <td className="p-4 text-center">Up to 15</td>
                  <td className="p-4 text-center font-bold text-slate-900 bg-orange-50/20">Up to 100</td>
                  <td className="p-4 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Automated Monthly Payroll</td>
                  <td className="p-4 text-center"><Minus className="h-4 w-4 text-slate-300 mx-auto" /></td>
                  <td className="p-4 text-center bg-orange-50/20"><Check className="h-4 w-4 text-[#ff6900] mx-auto font-bold stroke-[3]" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold stroke-[3]" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Statutory Tax & Pension Schedules</td>
                  <td className="p-4 text-center"><Minus className="h-4 w-4 text-slate-300 mx-auto" /></td>
                  <td className="p-4 text-center bg-orange-50/20"><Check className="h-4 w-4 text-[#ff6900] mx-auto font-bold stroke-[3]" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold stroke-[3]" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Multi-Tier Approval Routing</td>
                  <td className="p-4 text-center">Single Level</td>
                  <td className="p-4 text-center bg-orange-50/20 font-semibold text-slate-900">Up to 3 Levels</td>
                  <td className="p-4 text-center">Custom Hierarchies</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Attendance Clock-in Validation</td>
                  <td className="p-4 text-center">Web Portal</td>
                  <td className="p-4 text-center bg-orange-50/20 text-slate-900">Biometric & GPS</td>
                  <td className="p-4 text-center text-slate-900">Hardware & API Sync</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Audit Trail Retention</td>
                  <td className="p-4 text-center">30 Days</td>
                  <td className="p-4 text-center bg-orange-50/20 text-slate-900">1 Year</td>
                  <td className="p-4 text-center font-bold text-slate-900">Permanent (7+ Years)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900">Technical Support</td>
                  <td className="p-4 text-center">Email</td>
                  <td className="p-4 text-center bg-orange-50/20 font-medium text-slate-900">Priority Email & Chat</td>
                  <td className="p-4 text-center font-bold text-slate-900">Dedicated Account Manager</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-white py-16 px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500">Everything you need to know about plans and billing</p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Can I migrate our existing employee records from Excel?</AccordionTrigger>
                <AccordionContent>
                  Yes. Stanforte Edge supports bulk CSV imports for employee profiles, leave balances, bank account details, and departmental structures. Our onboarding team can also assist with automated migration.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>How is monthly payroll calculated?</AccordionTrigger>
                <AccordionContent>
                  Payroll computes gross salaries, statutory PAYE taxes, pension contributions, and custom allowances or deductions based on approved attendance records. You can preview, adjust, and approve before exporting bank payment files.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>What payment methods are supported for subscription billing?</AccordionTrigger>
                <AccordionContent>
                  We support corporate electronic transfers, major debit/credit cards, and direct debit in both Nigerian Naira (&#8358;) and USD ($). Annual subscriptions include formal invoice reconciliation.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>What happens if my employee count exceeds the plan limit?</AccordionTrigger>
                <AccordionContent>
                  You will receive a notification prompting you to upgrade to the next tier or add custom seat packs. Your workforce operations and access to employee records are never abruptly locked.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
