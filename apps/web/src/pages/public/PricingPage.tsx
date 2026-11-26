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

const COMPARISON_ROWS = [
  { capability: "Included staff seats", starter: "Up to 15", growth: "Up to 100", enterprise: "Unlimited" },
  { capability: "Automated monthly payroll", starter: false, growth: true, enterprise: true },
  { capability: "PAYE, PenCom, and NHF schedules", starter: false, growth: true, enterprise: true },
  { capability: "Multi-tier approval routing", starter: "Single level", growth: "Up to 3 levels", enterprise: "Custom chains" },
  { capability: "Attendance clock-in verification", starter: "Web portal", growth: "Biometric & GPS", enterprise: "Hardware & API" },
  { capability: "Audit trail retention", starter: "30 days", growth: "1 year", enterprise: "7+ years" },
  { capability: "Technical support", starter: "Email", growth: "Priority email & chat", enterprise: "Dedicated manager" },
];

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <PublicLayout activePath="/pricing">
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        {/* Header */}
        <section className="pt-16 pb-12 sm:pt-20 px-6 text-center max-w-4xl mx-auto space-y-5">
          <h1 className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] font-headline">
            Predictable pricing for growing{" "}
            <span className="text-[#C2410C]">teams</span>.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#475569] max-w-[60ch] mx-auto leading-[1.6]">
            Start free with up to 15 staff records. Upgrade when you need automated payroll, attendance geofencing, and multi-tier approvals.
          </p>

          {/* Billing Toggle */}
          <div className="pt-2">
            <div
              role="group"
              aria-label="Billing interval"
              className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]"
            >
              <button
                type="button"
                aria-pressed={!annualBilling}
                onClick={() => setAnnualBilling(false)}
                className={`min-h-[44px] px-5 py-2 rounded-md text-[14px] font-semibold transition-colors ${
                  !annualBilling
                    ? "bg-[#0F172A] text-white"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                aria-pressed={annualBilling}
                onClick={() => setAnnualBilling(true)}
                className={`min-h-[44px] px-5 py-2 rounded-md text-[14px] font-semibold transition-colors inline-flex items-center gap-2 ${
                  annualBilling
                    ? "bg-[#0F172A] text-white"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                <span>Annual</span>
                <span className="text-[12px] font-medium text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="px-6 max-w-6xl mx-auto pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="p-8 rounded-xl border border-[#E2E8F0] bg-white flex flex-col justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] font-headline">
                  Starter
                </h2>
                <div className="text-[40px] font-semibold text-[#0F172A] mt-3 font-mono tabular-nums leading-none">
                  Free
                </div>
                <p className="text-[13px] text-[#475569] mt-2">
                  For teams up to 15 employees
                </p>
                <p className="text-[15px] text-[#475569] mt-4 leading-[1.55]">
                  Core staff directory, profile records, and leave requests for small offices.
                </p>

                <div className="border-t border-[#E2E8F0] my-6" />

                <ul className="space-y-3 text-[15px] text-[#0F172A]">
                  {[
                    "Up to 15 active staff records",
                    "Employee directory and profiles",
                    "Standard leave tracking",
                    "Web clock-in and clock-out",
                    "Role-based access permissions",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="h-[18px] w-[18px] mt-0.5 text-[#15803D] shrink-0" strokeWidth={2} aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="min-h-[44px] w-full px-5 py-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-[15px] font-semibold inline-flex items-center justify-center transition-colors"
                >
                  Create free workspace
                </Link>
              </div>
            </div>

            {/* Growth (Primary Recommended) */}
            <div className="p-8 rounded-xl border border-[#0F172A] bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[18px] font-semibold text-[#0F172A] font-headline">
                    Growth
                  </h2>
                  <span className="text-[12px] font-semibold text-[#0F172A] bg-[#F1F5F9] px-2.5 py-1 rounded">
                    Most common
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[40px] font-semibold text-[#0F172A] font-mono tabular-nums leading-none">
                    {annualBilling ? "$49" : "$59"}
                  </span>
                  <span className="text-[14px] text-[#475569]">/ month</span>
                </div>
                <p className="text-[13px] text-[#475569] mt-2">
                  {annualBilling ? "Billed annually (NGN 35,000/mo)" : "Billed monthly (NGN 42,000/mo)"}
                </p>
                <p className="text-[15px] text-[#475569] mt-4 leading-[1.55]">
                  Automated monthly payroll with local tax schedules, tiered approvals, and budget controls.
                </p>

                <div className="border-t border-[#E2E8F0] my-6" />

                <ul className="space-y-3 text-[15px] text-[#0F172A]">
                  {[
                    "Up to 100 active staff records",
                    "Automated monthly payroll and PAYE schedules",
                    "Multi-level approval chains",
                    "Biometric and geofenced attendance",
                    "Expense and procurement vouchers",
                    "Commercial bank CSV disbursement export",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="h-[18px] w-[18px] mt-0.5 text-[#15803D] shrink-0" strokeWidth={2} aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="min-h-[44px] w-full px-5 py-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 hover:-translate-y-[1px]"
                >
                  <span>Start Growth plan</span>
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-xl border border-[#E2E8F0] bg-white flex flex-col justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] font-headline">
                  Enterprise
                </h2>
                <div className="text-[40px] font-semibold text-[#0F172A] mt-3 font-mono tabular-nums leading-none">
                  Custom
                </div>
                <p className="text-[13px] text-[#475569] mt-2">
                  Multi-branch and group operations
                </p>
                <p className="text-[15px] text-[#475569] mt-4 leading-[1.55]">
                  Dedicated infrastructure, custom statutory rules, ERP sync, and formal SLA commitments.
                </p>

                <div className="border-t border-[#E2E8F0] my-6" />

                <ul className="space-y-3 text-[15px] text-[#0F172A]">
                  {[
                    "Unlimited staff across subsidiaries",
                    "Custom approval hierarchies and budgets",
                    "99.9% uptime service agreement",
                    "Dedicated technical account manager",
                    "Custom payroll tax rule configuration",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="h-[18px] w-[18px] mt-0.5 text-[#15803D] shrink-0" strokeWidth={2} aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/contact"
                  className="min-h-[44px] w-full px-5 py-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-[15px] font-semibold inline-flex items-center justify-center transition-colors"
                >
                  Contact enterprise sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Plan Comparison Table */}
        <section className="border-t border-[#E2E8F0] bg-white py-20 px-6">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] tracking-[-0.01em] font-headline">
                Compare plans side by side
              </h2>
              <p className="text-[16px] text-[#475569]">
                Every plan includes isolated tenant storage and HTTPS encryption.
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] overflow-x-auto bg-white">
              <table className="w-full min-w-[600px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-[#0F172A] font-semibold">
                    <th className="p-4 w-2/5">Capability</th>
                    <th className="p-4 text-center">Starter</th>
                    <th className="p-4 text-center bg-[#F1F5F9]">Growth</th>
                    <th className="p-4 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#475569]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.capability}>
                      <td className="p-4 font-medium text-[#0F172A]">{row.capability}</td>
                      {(["starter", "growth", "enterprise"] as const).map((tier) => {
                        const val = row[tier];
                        return (
                          <td
                            key={tier}
                            className={`p-4 text-center ${
                              tier === "growth" ? "bg-[#F8FAFC] text-[#0F172A] font-medium" : ""
                            }`}
                          >
                            {val === true ? (
                              <Check className="h-[18px] w-[18px] text-[#15803D] mx-auto" strokeWidth={2} aria-label="Included" />
                            ) : val === false ? (
                              <Minus className="h-[18px] w-[18px] text-[#94A3B8] mx-auto" aria-label="Not included" />
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#FAFAFA] py-20 px-6 border-t border-[#E2E8F0]">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] tracking-[-0.01em] font-headline">
                Billing and migration questions
              </h2>
              <p className="text-[16px] text-[#475569]">
                Direct answers about switching from spreadsheets and paying in Naira or USD.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Can I migrate existing employee records from Excel?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Bulk CSV imports cover employee profiles, leave balances, bank details, and departments. Our onboarding team can also help check your first import.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How is monthly payroll calculated?</AccordionTrigger>
                  <AccordionContent>
                    Payroll computes gross salaries, PAYE tax, pension contributions, and allowances from approved attendance records. You can review every line before exporting bank files.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Which payment methods are supported?</AccordionTrigger>
                  <AccordionContent>
                    We accept corporate transfers, debit and credit cards, and Paystack billing in Nigerian Naira (NGN) and USD. Annual plans include formal invoices.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>What happens if my headcount exceeds the plan limit?</AccordionTrigger>
                  <AccordionContent>
                    We notify your workspace administrators so you can add seats or upgrade tiers. Your staff records and active payroll runs are never abruptly locked.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
