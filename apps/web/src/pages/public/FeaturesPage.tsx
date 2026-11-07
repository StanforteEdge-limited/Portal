import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";

export default function FeaturesPage() {
  const suites = [
    {
      category: "Workforce & People Operations",
      description: "Centralize employee information, contracts, and organizational reporting lines.",
      items: [
        {
          title: "Staff Directory & Profiles",
          description: "Maintain comprehensive digital employee records, job roles, emergency contacts, national identification, and bank details in a centralized directory.",
        },
        {
          title: "Department & Branch Structure",
          description: "Model multi-branch, multi-department corporate structures with clear management hierarchies and division-level reporting.",
        },
        {
          title: "Structured Onboarding & Offboarding",
          description: "Standardize onboarding task lists, policy acknowledgements, asset issuances, and exit handovers with automated status tracking.",
        },
        {
          title: "Digital Document Storage",
          description: "Secure repository for employee contracts, identification scans, qualification certificates, and annual appraisal files.",
        },
      ],
    },
    {
      category: "Automated Payroll & Statutory Compliance",
      description: "Eliminate manual payroll calculation errors and ensure full regulatory compliance.",
      items: [
        {
          title: "Monthly Salary Calculation",
          description: "Automatically compute gross to net salaries based on verified attendance, unpaid leave deductions, bonuses, and recurring allowances.",
        },
        {
          title: "Statutory Tax & Pension Schedules",
          description: "Generate compliant monthly PAYE tax deduction schedules, pension administrator remittances, and national housing fund contributions.",
        },
        {
          title: "Commercial Bank Disbursement Batches",
          description: "Export standardized payment schedule files ready for direct upload into commercial banking portals for batch salary disbursement.",
        },
        {
          title: "Self-Service Digital Payslips",
          description: "Automatically generate downloadable, password-protected PDF payslips accessible directly from employee self-service portals.",
        },
      ],
    },
    {
      category: "Time, Shifts & Absence Management",
      description: "Accurately record employee hours, shifts, and absence without manual paper logs.",
      items: [
        {
          title: "Biometric & Campus Attendance",
          description: "Capture accurate clock-in times using integrated biometric hardware, office network detection, or authorized supervisor logbooks.",
        },
        {
          title: "Shift Scheduling & Rosters",
          description: "Plan recurring shift rotations for operational teams, weekend duties, and overtime allocations with automated conflict detection.",
        },
        {
          title: "Leave Management & Balances",
          description: "Manage annual, sick, compassionate, and maternity leave with real-time balance deductions and automated approval routing to managers.",
        },
        {
          title: "Tardiness & Overtime Integration",
          description: "Seamlessly feed attendance anomalies directly into monthly payroll computations to adjust allowances or deductions automatically.",
        },
      ],
    },
    {
      category: "Approvals, Procurement & Financial Controls",
      description: "Enforce institutional financial discipline and transparent sign-off workflows.",
      items: [
        {
          title: "Configurable Approval Chains",
          description: "Route purchase requests, travel advances, and expenditure claims through sequential management tiers based on departmental budget rules.",
        },
        {
          title: "Expense Requisitions & Vouchers",
          description: "Submit expense claims with supporting receipt uploads, cost-center tags, and two-step verification prior to cash disbursement.",
        },
        {
          title: "Departmental Budget Tracking",
          description: "Monitor departmental expenditures in real time against approved quarterly budgets to prevent budget overruns.",
        },
        {
          title: "Immutable Operational Audit Trail",
          description: "Every approval, voucher creation, and payroll sign-off is indelibly timestamped with user identification for regulatory review.",
        },
      ],
    },
  ];

  return (
    <PublicLayout activePath="/features">
      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-6">
          Platform Capabilities
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Comprehensive tools for modern operations
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Every capability in Stanforte Edge is built to streamline institutional workflows, improve administrative accountability, and eliminate operational bottlenecks.
        </p>
      </section>

      {/* Feature Suites */}
      <section className="px-6 max-w-7xl mx-auto pb-20 space-y-16">
        {suites.map((suite, idx) => (
          <div key={idx} className="border-t border-slate-200 pt-10">
            <div className="max-w-2xl mb-8">
              <h2 className="text-xl font-bold text-slate-900 font-headline">
                {suite.category}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {suite.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suite.items.map((item, itemIdx) => (
                <div key={itemIdx} className="p-6 border border-slate-200 rounded-lg bg-white">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Conversion Banner */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 font-headline">
            Ready to evaluate Stanforte Edge for your organization?
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Get started with our free tier or request a guided demonstration with our solution team.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-md font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Start Free Workspace
            </Link>
            <a
              href="mailto:demo@stanforteedge.com"
              className="px-6 py-3 rounded-md font-semibold text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Schedule Consultation
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
