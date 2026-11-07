import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Check, Minus, Sparkles } from "lucide-react";

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <PublicLayout activePath="/pricing">
      {/* Header */}
      <section className="pt-16 pb-14 px-6 text-center max-w-5xl mx-auto space-y-4">
        <Badge variant="outline" className="px-3 py-1 font-semibold text-xs tracking-wide">
          Transparent Pricing
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Plans designed for organizations of all sizes
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Start with our complimentary tier for smaller teams, or upgrade to complete automated payroll and multi-level approvals as your workforce grows.
        </p>

        {/* Billing Switch */}
        <div className="pt-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <Button
              variant={!annualBilling ? "default" : "ghost"}
              size="sm"
              onClick={() => setAnnualBilling(false)}
            >
              Monthly Billing
            </Button>
            <Button
              variant={annualBilling ? "default" : "ghost"}
              size="sm"
              onClick={() => setAnnualBilling(true)}
              className="gap-1.5"
            >
              Annual Billing
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                Save 20%
              </Badge>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Cards with shadcn Card */}
      <section className="px-6 max-w-7xl mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</div>
              <CardTitle className="text-3xl font-bold text-slate-900 mt-2">
                Free
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                For teams up to 15 employees
              </CardDescription>
              <p className="text-xs text-slate-600 pt-2 leading-relaxed">
                Core tools to organize staff profiles, basic attendance tracking, and employee leave requests.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Included features:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Up to 15 active staff records
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Employee directory & profiles
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Standard leave tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Web-based clock-in / clock-out
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Role-based access permissions
                </li>
              </ul>
            </CardContent>

            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link to="/register">Create Free Account</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Growth (Recommended) */}
          <Card className="flex flex-col justify-between border-2 border-slate-900 relative shadow-md">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider px-3 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" /> Most Popular
              </Badge>
            </div>

            <CardHeader>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Growth</div>
              <CardTitle className="text-3xl font-bold text-slate-900 mt-2">
                {annualBilling ? "$49" : "$59"}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Billed annually (or &#8358;35,000/mo)
              </CardDescription>
              <p className="text-xs text-slate-600 pt-2 leading-relaxed">
                Complete automated payroll with tax calculations, multi-tier approvals, and departmental budgets for scaling firms.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Everything in Starter, plus:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Up to 100 active staff records
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Automated monthly payroll & tax schedules
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Multi-level approval chains
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Biometric & geofenced attendance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Expense & procurement requisitions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Bank disbursement schedule exports
                </li>
              </ul>
            </CardContent>

            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/register">Start Growth Plan</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Enterprise */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</div>
              <CardTitle className="text-3xl font-bold text-slate-900 mt-2">
                Custom
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Multi-branch & holding companies
              </CardDescription>
              <p className="text-xs text-slate-600 pt-2 leading-relaxed">
                Dedicated infrastructure, tailored statutory deductions, ERP integrations, and custom SLA commitments.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Enterprise capabilities:</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Unlimited staff across multiple subsidiaries
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Custom approval hierarchies & budgets
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> 99.9% uptime Service Level Agreement
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Dedicated technical account manager
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" /> Custom payroll tax rule configuration
                </li>
              </ul>
            </CardContent>

            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <a href="mailto:sales@stanforteedge.com">Contact Enterprise Sales</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Feature Comparison Matrix with shadcn Table */}
      <section className="border-t border-slate-200 bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-headline">
              Detailed Plan Comparison
            </h2>
            <p className="text-xs text-slate-500">Compare operational capabilities and governance limits</p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="w-1/2">Capability</TableHead>
                  <TableHead className="text-center">Starter</TableHead>
                  <TableHead className="text-center bg-slate-100/50">Growth</TableHead>
                  <TableHead className="text-center">Enterprise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Included Employee Seats</TableCell>
                  <TableCell className="text-center">Up to 15</TableCell>
                  <TableCell className="text-center font-semibold text-slate-900 bg-slate-50/50">Up to 100</TableCell>
                  <TableCell className="text-center">Unlimited</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Automated Monthly Payroll</TableCell>
                  <TableCell className="text-center"><Minus className="h-4 w-4 text-slate-300 mx-auto" /></TableCell>
                  <TableCell className="text-center bg-slate-50/50"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Statutory Tax & Pension Schedules</TableCell>
                  <TableCell className="text-center"><Minus className="h-4 w-4 text-slate-300 mx-auto" /></TableCell>
                  <TableCell className="text-center bg-slate-50/50"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto font-bold" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Multi-Tier Approval Routing</TableCell>
                  <TableCell className="text-center">Single Level</TableCell>
                  <TableCell className="text-center bg-slate-50/50">Up to 3 Levels</TableCell>
                  <TableCell className="text-center">Custom Hierarchies</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Attendance Clock-in Validation</TableCell>
                  <TableCell className="text-center">Web Portal</TableCell>
                  <TableCell className="text-center bg-slate-50/50">Biometric & GPS Geofence</TableCell>
                  <TableCell className="text-center">Hardware & API Sync</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Audit Trail Retention</TableCell>
                  <TableCell className="text-center">30 Days</TableCell>
                  <TableCell className="text-center bg-slate-50/50">1 Year</TableCell>
                  <TableCell className="text-center font-semibold text-slate-900">Permanent (7+ Years)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Technical Support</TableCell>
                  <TableCell className="text-center">Email</TableCell>
                  <TableCell className="text-center bg-slate-50/50 font-medium text-slate-900">Priority Email & Chat</TableCell>
                  <TableCell className="text-center font-semibold text-slate-900">Dedicated Account Manager</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* Frequently Asked Questions with shadcn Accordion */}
      <section className="bg-slate-50 py-16 px-6 border-t border-slate-200">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-headline">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500">Common questions about plans, billing, and workforce setup</p>
          </div>

          <Card className="p-6 bg-white">
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
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
