import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CreditCard,
  Clock,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function FeaturesPage() {
  const suites = [
    {
      category: "Workforce & People Operations",
      icon: Users,
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
      icon: CreditCard,
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
      icon: Clock,
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
      icon: FileCheck,
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
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-4">
        <Badge variant="outline" className="px-3 py-1 font-semibold text-xs tracking-wide">
          Platform Capabilities
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Comprehensive tools for modern operations
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Every capability in Stanforte Edge is built to streamline institutional workflows, improve administrative accountability, and eliminate operational bottlenecks.
        </p>
      </section>

      {/* Feature Suites with shadcn Cards */}
      <section className="px-6 max-w-7xl mx-auto pb-20 space-y-16">
        {suites.map((suite, idx) => {
          const Icon = suite.icon;
          return (
            <div key={idx} className="border-t border-slate-200 pt-10">
              <div className="max-w-2xl mb-8 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-900">
                    <Icon className="h-4 w-4" />
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
                  <Card key={itemIdx}>
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed pt-1 text-slate-600">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Conversion Banner with shadcn Card & Button */}
      <section className="border-t border-slate-200 bg-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <Badge variant="outline">Get Started</Badge>
          <h2 className="text-2xl font-bold text-slate-900 font-headline">
            Ready to evaluate Stanforte Edge for your organization?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Get started with our free tier or request a guided consultation with our solution architecture team.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register" className="flex items-center gap-2">
                Start Free Workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:demo@stanforteedge.com">Schedule Consultation</a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
