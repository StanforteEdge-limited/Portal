import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";
import {
  Users,
  CreditCard,
  Clock,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Smartphone,
} from "lucide-react";

export default function FeaturesPage() {
  const suites = [
    {
      id: "workforce",
      category: "Workforce & People Operations",
      icon: Users,
      iconColor: "text-blue-600 bg-blue-50",
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
      id: "payroll",
      category: "Automated Payroll & Statutory Compliance",
      icon: CreditCard,
      iconColor: "text-[#ff6900] bg-orange-50",
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
      id: "attendance",
      category: "Time, Shifts & Absence Management",
      icon: Clock,
      iconColor: "text-amber-600 bg-amber-50",
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
      id: "approvals",
      category: "Approvals, Procurement & Financial Controls",
      icon: FileCheck,
      iconColor: "text-purple-600 bg-purple-50",
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
    {
      id: "selfservice",
      category: "Employee Self-Service & Team Collaboration",
      icon: Smartphone,
      iconColor: "text-emerald-600 bg-emerald-50",
      description: "Empower staff with self-service tools, daily logs, and peer document sharing.",
      items: [
        {
          title: "Instant Digital Payslips",
          description: "Employees can securely view and download monthly payslips, year-to-date earnings, and statutory tax deductions anytime.",
        },
        {
          title: "Self-Service Leave & Requests",
          description: "Submit leave applications, track balance accruals, and view approval status updates without back-and-forth emails.",
        },
        {
          title: "Task Boards & Daily Logs",
          description: "Switch seamlessly between Kanban and Table views, manage personal tasks, tag collaborators, and log daily milestones.",
        },
        {
          title: "Instant Document & Policy Sharing",
          description: "Access official handbooks and share confidential files with instant in-app chat notifications and direct delivery.",
        },
      ],
    },
  ];

  return (
    <PublicLayout activePath="/features">
      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-[#ff6900] text-xs font-bold uppercase tracking-wider">
          Platform Capabilities
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-headline">
          Comprehensive Tools for <br className="hidden sm:inline" />
          <span className="text-[#ff6900]">Modern Operations</span>
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Every capability in Stanforte Edge is built to streamline institutional workflows, improve administrative accountability, and eliminate operational bottlenecks.
        </p>
      </section>

      {/* Feature Suites */}
      <section className="px-6 max-w-7xl mx-auto pb-20 space-y-16">
        {suites.map((suite, idx) => {
          const Icon = suite.icon;
          return (
            <div key={idx} id={suite.id} className="border-t border-slate-100 pt-10 scroll-mt-24">
              <div className="max-w-2xl mb-8 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${suite.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-headline">
                    {suite.category}
                  </h2>
                </div>
                <p className="text-sm text-slate-600">
                  {suite.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suite.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:border-slate-300 transition-all space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#ff6900] shrink-0" />
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed pl-6">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Conversion Banner */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-black text-slate-900 font-headline">
            Ready to evaluate Stanforte Edge for your organization?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Get started with our free tier or request a guided consultation with our solution architecture team.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="px-7 py-3 rounded-full font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Start Free Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:demo@stanforteedge.com"
              className="px-7 py-3 rounded-full font-semibold text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all"
            >
              Schedule Consultation
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
