import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  CreditCard,
  Clock,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Building2,
  Download,
  Plus,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("roster");

  return (
    <PublicLayout activePath="/">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto">
        <div className="max-w-3xl space-y-6">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs tracking-wide">
            Enterprise Workforce Platform
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 font-headline leading-[1.12]">
            Workforce, payroll, and operations for modern organizations.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-body">
            Stanforte Edge unifies staff directory, automated salary disbursement, biometric attendance tracking, and multi-tier approval workflows in a single, dependable portal.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/register" className="flex items-center gap-2">
                Start Free Workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">View Pricing & Plans</Link>
            </Button>
            <span className="text-xs text-slate-500 pl-2">
              Free for up to 15 employees &bull; No credit card needed
            </span>
          </div>
        </div>

        {/* Realistic Product Mockup UI built with shadcn/ui Card, Tabs, and Table */}
        <div className="mt-14">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            {/* Top Bar of Window */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="ml-3 text-xs font-mono text-slate-500">app.stanforteedge.com/workspace</span>
              </div>

              {/* shadcn Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-slate-200/60">
                  <TabsTrigger value="roster" className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Staff Directory</span>
                  </TabsTrigger>
                  <TabsTrigger value="payroll" className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Payroll Summary</span>
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Approvals</span>
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Attendance</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <CardContent className="p-6">
              {activeTab === "roster" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Active Staff Directory</h3>
                      <p className="text-xs text-slate-500">Showing 48 total verified team members across 4 departments</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Filter by Department</Button>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Employee
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Staff ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-slate-900 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">OA</div>
                          Oluwaseun Adeleke
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">STE-2024-001</TableCell>
                        <TableCell>Finance & Accounts</TableCell>
                        <TableCell>Chief Financial Officer</TableCell>
                        <TableCell>
                          <Badge variant="success">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Manage</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-slate-900 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">FO</div>
                          Fatima Olarinwaju
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">STE-2024-014</TableCell>
                        <TableCell>Human Resources</TableCell>
                        <TableCell>HR Business Partner</TableCell>
                        <TableCell>
                          <Badge variant="success">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Manage</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-slate-900 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">CI</div>
                          Chinedu Ibeawuchi
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">STE-2024-032</TableCell>
                        <TableCell>Operations & Logistics</TableCell>
                        <TableCell>Fleet Supervisor</TableCell>
                        <TableCell>
                          <Badge variant="warning">On Leave</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Manage</Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "payroll" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Monthly Payroll Run &bull; November 2026</h3>
                      <p className="text-xs text-slate-500">Statutory deductions (PAYE, NHF, Pension) auto-calculated</p>
                    </div>
                    <Badge variant="success" className="px-2.5 py-1">Batch Approved</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Gross Salaries</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">&#8358;18,450,000</div>
                    </Card>
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">PAYE Tax Remittance</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">&#8358;2,860,000</div>
                    </Card>
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Pension Contributions</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">&#8358;1,476,000</div>
                    </Card>
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Net Disbursed</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">&#8358;14,114,000</div>
                    </Card>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
                    <span>Batch Bank Disbursals: 48 Accounts matched</span>
                    <Button variant="link" size="sm" className="gap-1.5 p-0 h-auto font-semibold">
                      <Download className="h-3.5 w-3.5" /> Download Bank Schedule (CSV)
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "approvals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Multi-Tier Approval Queue</h3>
                      <p className="text-xs text-slate-500">2 pending management sign-offs requiring action</p>
                    </div>
                    <Badge variant="outline">2 Actions Required</Badge>
                  </div>

                  <div className="space-y-3">
                    <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">Expense Claim &bull; Office Tech Upgrade</span>
                          <Badge variant="warning">Pending CFO</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Requested by: Zainab Bello (IT Support) &bull; Amount: &#8358;420,000</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">Reject</Button>
                        <Button size="sm">Approve Voucher</Button>
                      </div>
                    </Card>

                    <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">Annual Leave Request &bull; 10 Days</span>
                          <Badge variant="success">Supervisor Approved</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Requested by: Emeka Okonkwo &bull; Starting: Dec 1, 2026 &bull; Remaining: 14 days</div>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Cleared for HR Record</span>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Today&apos;s Attendance Digest</h3>
                      <p className="text-xs text-slate-500">Real-time clock-in log &bull; Main Corporate Campus</p>
                    </div>
                    <Button variant="outline" size="sm">Export Sheet</Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Present Today</div>
                      <div className="text-lg font-bold text-emerald-700 mt-1">45 / 48 (93.7%)</div>
                    </Card>
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Average Clock-In</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">08:18 AM</div>
                    </Card>
                    <Card className="p-4 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Approved Leave / Off-site</div>
                      <div className="text-lg font-bold text-slate-600 mt-1">3 Employees</div>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Core Capabilities Grid with shadcn Cards */}
      <section className="border-t border-slate-200 bg-white py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline">Core Architecture</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-headline">
              Engineered for everyday corporate operations
            </h2>
            <p className="text-slate-600 text-base">
              Replace disconnected spreadsheets and manual email approvals with structured, auditable workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 mb-2">
                  <CreditCard className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Compliant Salary & Payroll</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Automate monthly payroll calculations with local tax schedules, pension administrator schedules, and downloadable bank disbursement files.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Automatic PAYE tax computations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>PDF payslips generated per employee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Direct bank schedule exports</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 mb-2">
                  <Clock className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Attendance & Shift Records</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Record clock-in times across branches with biometric device integration, office network validation, and automated tardiness calculations.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Shift scheduling and roster management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Automated leave deduction reconciliation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Overtime logs for payroll integration</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 mb-2">
                  <FileCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Multi-Level Approvals</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Configure customized approval chains for leave, purchase vouchers, and cash advances with full traceability and email notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Line manager and finance sign-offs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Spending limit enforcement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Permanent audit log for external review</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust SLA Grid */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 space-y-1">
            <div className="text-3xl font-bold text-slate-900">99.9%</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Service Uptime SLA</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-3xl font-bold text-slate-900">Strict</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tenant Data Isolation</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-3xl font-bold text-slate-900">Full</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Statutory Compliance</div>
          </div>
          <div className="p-4 space-y-1">
            <div className="text-3xl font-bold text-slate-900">24/7</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Enterprise SLA Support</div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
