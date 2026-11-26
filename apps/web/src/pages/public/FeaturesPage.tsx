import { useEffect } from "react";
import { PublicLayout } from "./PublicLayout";
import { Link, useLocation } from "@/shared/router-adapter";
import { ArrowRight, Check } from "lucide-react";

const FEATURE_SUITES = [
  {
    id: "workforce",
    title: "Workforce and people operations",
    summary:
      "Keep employee records, reporting lines, and branch assignments in one directory.",
    screenshot: "/screenshots/05-hr-employees.png",
    screenshotAlt: "Stanforte Edge staff directory showing employee profiles across branches",
    items: [
      {
        title: "Staff directory and profiles",
        description:
          "Store digital employee records, job roles, emergency contacts, identification numbers, and bank details.",
      },
      {
        title: "Department and branch hierarchy",
        description:
          "Model multi-branch and multi-department structures with clear line-manager reporting.",
      },
      {
        title: "Structured onboarding and exits",
        description:
          "Track onboarding checklists, policy acknowledgements, asset handovers, and offboarding steps.",
      },
      {
        title: "Centralized document storage",
        description:
          "Keep employment contracts, IDs, certificates, and appraisal records scoped by role.",
      },
    ],
  },
  {
    id: "payroll",
    title: "Payroll and statutory compliance",
    summary:
      "Run gross-to-net salary calculations and generate Nigerian tax and pension schedules without spreadsheet formulas.",
    screenshot: "/screenshots/04-payroll-light.png",
    screenshotAlt: "Stanforte Edge payroll calculation table with PAYE and pension columns",
    items: [
      {
        title: "Monthly salary runs",
        description:
          "Compute net pay from verified attendance, unpaid leave, bonuses, and recurring allowances.",
      },
      {
        title: "PAYE, PenCom, and NHF schedules",
        description:
          "Generate monthly tax deduction schedules, pension administrator remittances, and housing fund files.",
      },
      {
        title: "Bank disbursement batches",
        description:
          "Export clean CSV files formatted for commercial bank portals without re-keying account numbers.",
      },
      {
        title: "Self-service payslips",
        description:
          "Publish downloadable PDF payslips to employee accounts as soon as finance approves the run.",
      },
    ],
  },
  {
    id: "attendance",
    title: "Time, shifts, and leave tracking",
    summary:
      "Record daily check-ins by campus boundary and feed approved hours straight into payroll.",
    screenshot: "/screenshots/06-attendance-light.png",
    screenshotAlt: "Stanforte Edge daily attendance log with branch verification",
    items: [
      {
        title: "Campus geofenced clock-ins",
        description:
          "Verify daily attendance using office GPS boundaries, biometric exports, or supervisor logs.",
      },
      {
        title: "Shift schedules and rosters",
        description:
          "Plan recurring shift rotations, weekend cover, and overtime allocations with conflict checks.",
      },
      {
        title: "Leave balances and requests",
        description:
          "Track annual, sick, and compassionate leave with automatic balance updates on approval.",
      },
      {
        title: "Direct payroll sync",
        description:
          "Feed approved overtime and unexcused absences directly into the monthly salary run.",
      },
    ],
  },
  {
    id: "approvals",
    title: "Approvals, procurement, and spend controls",
    summary:
      "Route purchase requests and payment vouchers through departmental budgets before funds leave the account.",
    screenshot: "/screenshots/03-payment-vouchers.png",
    screenshotAlt: "Stanforte Edge payment voucher queue and approval trail",
    items: [
      {
        title: "Tiered approval chains",
        description:
          "Route requisitions, travel advances, and claims through line managers, finance, and executives.",
      },
      {
        title: "Payment vouchers and receipts",
        description:
          "Attach vendor invoices, cost-center tags, and two-step verification before disbursement.",
      },
      {
        title: "Departmental budget checks",
        description:
          "Compare every purchase request against remaining quarterly or annual budget allocations.",
      },
      {
        title: "Immutable audit log",
        description:
          "Record who submitted, reviewed, returned, or approved every transaction with timestamps.",
      },
    ],
  },
];

export default function FeaturesPage() {
  const location = useLocation();

  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      window.setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  return (
    <PublicLayout activePath="/features">
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        {/* Hero */}
        <section className="pt-16 pb-14 sm:pt-20 sm:pb-16 px-6 max-w-4xl mx-auto text-center space-y-5">
          <h1 className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] font-headline text-balance">
            Every core workflow for <span className="text-[#C2410C]">operations</span> in one system.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#475569] leading-[1.6] max-w-[60ch] mx-auto">
            Staff records, attendance, Nigerian statutory payroll, and spend approvals share the same directory and permission model.
          </p>

          {/* Jump Links */}
          <nav aria-label="Feature suites" className="pt-3 flex flex-wrap items-center justify-center gap-2">
            {FEATURE_SUITES.map((suite) => (
              <a
                key={suite.id}
                href={`#${suite.id}`}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[14px] font-medium text-[#0F172A] inline-flex items-center hover:bg-[#F1F5F9] transition-colors"
              >
                {suite.id === "workforce"
                  ? "Workforce"
                  : suite.id === "payroll"
                  ? "Payroll & Tax"
                  : suite.id === "attendance"
                  ? "Attendance"
                  : "Approvals & Spend"}
              </a>
            ))}
          </nav>
        </section>

        {/* Feature Suites */}
        <section className="px-6 pb-24 max-w-5xl mx-auto space-y-24">
          {FEATURE_SUITES.map((suite, index) => (
            <div
              key={suite.id}
              id={suite.id}
              className="scroll-mt-24 pt-12 border-t border-[#E2E8F0] space-y-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div
                  className={`lg:col-span-5 space-y-4 ${
                    index % 2 === 1 ? "lg:order-2" : ""
                  }`}
                >
                  <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] leading-[1.2] tracking-[-0.01em] font-headline">
                    {suite.title}
                  </h2>
                  <p className="text-[16px] text-[#475569] leading-[1.6]">
                    {suite.summary}
                  </p>
                </div>

                <div
                  className={`lg:col-span-7 ${
                    index % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
                    <img
                      src={suite.screenshot}
                      alt={suite.screenshotAlt}
                      width={1280}
                      height={800}
                      loading="lazy"
                      className="w-full h-auto block aspect-[16/10] object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                {suite.items.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <Check
                      className="h-[18px] w-[18px] mt-1 shrink-0 text-[#15803D]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <div className="space-y-1">
                      <h3 className="text-[18px] font-semibold text-[#0F172A] leading-[1.3] font-headline">
                        {item.title}
                      </h3>
                      <p className="text-[15px] text-[#475569] leading-[1.55]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-6 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto rounded-xl bg-[#0F172A] text-[#F8FAFC] p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-[26px] sm:text-[32px] font-semibold leading-[1.2] font-headline">
                Start with your team directory today
              </h2>
              <p className="text-[16px] text-[#CBD5E1] leading-[1.6]">
                Free for up to 15 employees. Add payroll and multi-tier approvals when you are ready.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/register"
                className="min-h-[44px] px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Create a workspace</span>
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                to="/pricing"
                className="min-h-[44px] px-6 py-3 rounded-lg border border-[#334155] text-[#F8FAFC] text-[15px] font-semibold inline-flex items-center hover:bg-[#1E293B] transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
