import { SelectBox } from "@/components/ui/select";
import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";
import {
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  ArrowRight,
  Play,
  TrendingUp,
  Check,
  ShieldCheck,
  CheckCircle2,
  Download,
  Plus,
  DollarSign,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  Lock,
  X,
  Filter,
  CheckCircle,
  Building,
  Briefcase,
  Sliders,
  Calendar,
  AlertCircle,
} from "lucide-react";

type ProductTab = "roster" | "payroll" | "approvals" | "attendance" | "procurement";

interface DemoEmployee {
  id: string;
  name: string;
  email: string;
  staffId: string;
  department: string;
  role: string;
  status: "Active" | "On Leave" | "Probation";
  campus: "Victoria Island Campus" | "Abuja Office";
}

const INITIAL_DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: "1",
    name: "Oluwaseun Adeleke",
    email: "o.adeleke@stanforteedge.com",
    staffId: "STE-2024-001",
    department: "Finance & Accounts",
    role: "Chief Financial Officer",
    status: "Active",
    campus: "Victoria Island Campus",
  },
  {
    id: "2",
    name: "Fatima Olarinwaju",
    email: "f.olarinwaju@stanforteedge.com",
    staffId: "STE-2024-014",
    department: "People & Culture",
    role: "Head of Human Resources",
    status: "Active",
    campus: "Victoria Island Campus",
  },
  {
    id: "3",
    name: "Chinedu Ibeawuchi",
    email: "c.ibeawuchi@stanforteedge.com",
    staffId: "STE-2024-032",
    department: "Supply Chain",
    role: "Logistics Manager",
    status: "On Leave",
    campus: "Abuja Office",
  },
  {
    id: "4",
    name: "Amina Yusuf",
    email: "a.yusuf@stanforteedge.com",
    staffId: "STE-2024-045",
    department: "Engineering",
    role: "Senior Systems Engineer",
    status: "Active",
    campus: "Abuja Office",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ProductTab>("roster");
  const [selectedFeature, setSelectedFeature] = useState<ProductTab | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [voucherStatus, setVoucherStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [campusFilter, setCampusFilter] = useState<"all" | "vi" | "abuja">("all");
  const [employees, setEmployees] = useState<DemoEmployee[]>(INITIAL_DEMO_EMPLOYEES);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("People & Culture");
  const [newEmpRole, setNewEmpRole] = useState("Operations Associate");

  // Headcount ROI Calculator State
  const [headcount, setHeadcount] = useState(35);

  const handleFeatureClick = (tab: ProductTab) => {
    if (selectedFeature === tab) {
      setSelectedFeature(null);
    } else {
      setSelectedFeature(tab);
      setActiveTab(tab);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent =
      "Staff ID,Employee Name,Bank Name,Account Number,Gross Salary,PAYE Tax,Pension,Net Disbursal\n" +
      "STE-2024-001,Oluwaseun Adeleke,Access Bank,0029384721,1200000,185000,96000,919000\n" +
      "STE-2024-014,Fatima Olarinwaju,Zenith Bank,1012938492,850000,127500,68000,654500\n" +
      "STE-2024-032,Chinedu Ibeawuchi,GTBank,0123984712,650000,97500,52000,500500\n" +
      "STE-2024-045,Amina Yusuf,First Bank,3029184719,950000,142500,76000,731500\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stanforte_salary_disbursement_nov2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTimesheet = () => {
    const csvContent =
      "Date,Staff ID,Employee Name,Department,Clock In,Clock Out,Verification,Status\n" +
      "2026-11-11,STE-2024-001,Oluwaseun Adeleke,Finance,08:04 AM,05:15 PM,Polygon Geofence,Present\n" +
      "2026-11-11,STE-2024-014,Fatima Olarinwaju,HR,08:12 AM,05:02 PM,Biometric Terminal 1,Present\n" +
      "2026-11-11,STE-2024-032,Chinedu Ibeawuchi,Supply Chain,-,-,Leave Approved,On Leave\n" +
      "2026-11-11,STE-2024-045,Amina Yusuf,Engineering,08:21 AM,05:30 PM,Biometric Terminal 2,Present\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stanforte_campus_timesheet_today.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    const newEmp: DemoEmployee = {
      id: Date.now().toString(),
      name: newEmpName.trim(),
      email: newEmpEmail.trim() || `${newEmpName.toLowerCase().replace(/\s+/g, ".")}@stanforteedge.com`,
      staffId: `STE-2024-0${Math.floor(Math.random() * 90) + 10}`,
      department: newEmpDept,
      role: newEmpRole,
      status: "Active",
      campus: "Victoria Island Campus",
    };

    setEmployees((prev) => [newEmp, ...prev]);
    setNewEmpName("");
    setNewEmpEmail("");
    setAddEmployeeModalOpen(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (campusFilter === "vi") return emp.campus === "Victoria Island Campus";
    if (campusFilter === "abuja") return emp.campus === "Abuja Office";
    return true;
  });

  return (
    <PublicLayout activePath="/">
      {/* 1. Hero Section (Clean, authoritative, high-impact) */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 space-y-7">
            <p className="text-xs font-medium text-[#c2410c]">
              Workforce, payroll, and spend operations
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-medium tracking-[-0.03em] text-neutral-900 leading-[1.06] font-headline">
              Run your organization <br />
              on one operational ledger
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
              Unify HR records, geofenced attendance, Nigerian statutory payroll, and tiered purchase approvals in one workspace.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/register"
                className="h-11 px-6 rounded-lg font-medium text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white transition-colors duration-150 inline-flex items-center gap-2"
              >
                <span>Start workspace</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              </Link>
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="h-11 px-5 rounded-lg font-medium text-sm border border-neutral-900/[0.12] bg-white hover:bg-neutral-50 text-neutral-900 transition-colors duration-150 inline-flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5 text-[#ff6900]" strokeWidth={1.5} />
                <span>Product walkthrough</span>
              </button>
            </div>

            {/* 5 Feature Module Controls */}
            <div className="pt-4">
              <div className="text-xs font-medium text-neutral-500 mb-2.5">
                Core workspaces
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-2xl">
                <button
                  type="button"
                  onClick={() => handleFeatureClick("roster")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors duration-150 text-center ${
                    selectedFeature === "roster"
                      ? "border-[#ff6900] bg-orange-50/60"
                      : "border-neutral-900/[0.08] bg-white hover:border-neutral-900/[0.18]"
                  }`}
                >
                  <Users className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "roster" ? "text-[#ff6900]" : "text-neutral-600"}`} strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">HR & Workforce</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("attendance")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors text-center ${
                    selectedFeature === "attendance"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs"
                  }`}
                >
                  <Clock className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "attendance" ? "text-[#ff6900]" : "text-neutral-600"}`} />
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">Time & Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("payroll")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors text-center ${
                    selectedFeature === "payroll"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs"
                  }`}
                >
                  <CreditCard className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "payroll" ? "text-[#ff6900]" : "text-neutral-600"}`} />
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">Payroll & Tax</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("procurement")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors text-center ${
                    selectedFeature === "procurement"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs"
                  }`}
                >
                  <Building2 className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "procurement" ? "text-[#ff6900]" : "text-neutral-600"}`} />
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">Budgets & Spend</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("approvals")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-colors text-center col-span-2 sm:col-span-1 ${
                    selectedFeature === "approvals"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs"
                  }`}
                >
                  <FileCheck className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "approvals" ? "text-[#ff6900]" : "text-neutral-600"}`} />
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">Approval Chains</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Default Image Design, dynamically changes to Dashboard Preview when user clicks any feature */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end items-center">
            {/* When NO feature is clicked: DEFAULT IMAGE DESIGN */}
            {selectedFeature === null && (
              <div className="relative flex justify-center lg:justify-end w-full animate-in fade-in duration-200">
                {/* Orange Curved Graphic Backdrop */}
                <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-6 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] bg-gradient-to-tr from-[#ff6900] via-[#ff8800] to-[#ffa500] rounded-full -z-0 opacity-90 blur-0" />

                {/* Real Portal Product Screenshot Container */}
                <div className="relative z-10 w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-[#141415]">
                  <img
                    src="/screenshots/01-dashboard-dark.png"
                    alt="Stanforte Edge live workspace dashboard"
                    decoding="sync"
                    className="w-full h-auto block [image-rendering:-webkit-optimize-contrast]"
                  />
                </div>

                {/* Floating Metric Card 1: Total Employees */}
                <div className="absolute -top-3 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Total Personnel</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-semibold text-neutral-900">1,240</span>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> +12%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Metric Card 2: On Time Today */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:left-0 z-20 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">On Time Today</div>
                    <div className="text-base font-semibold text-neutral-900 mt-0.5">96.4%</div>
                  </div>
                </div>

                {/* Floating Metric Card 3: Payroll Ready */}
                <div className="absolute bottom-6 left-2 sm:left-8 z-20 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Payroll Status</div>
                    <div className="text-xs font-medium text-emerald-600 mt-0.5 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Tax & Pension Audited</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* When a feature IS clicked: DYNAMIC DASHBOARD PREVIEW */}
            {selectedFeature !== null && (
              <div className="relative z-10 w-full max-w-[520px] animate-in fade-in zoom-in-95 duration-200">
                {/* Layered Under-Card Sheen */}
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-[#ff6900]/20 via-neutral-100 to-amber-100/40 blur-xs -z-10" />

                {/* Main Window */}
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/90 bg-white">
                  {/* Browser / App Window Top Chrome Bar */}
                  <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-neutral-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      <div className="ml-2 bg-neutral-800/90 rounded-md px-2.5 py-0.5 flex items-center gap-1.5 text-xs font-mono text-neutral-300 border border-neutral-700/60">
                        <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                        <span>
                          app.stanforteedge.com/
                          {selectedFeature === "roster"
                            ? "hr/directory"
                            : selectedFeature === "attendance"
                            ? "attendance/geofence"
                            : selectedFeature === "payroll"
                            ? "payroll/nov-2026"
                            : selectedFeature === "procurement"
                            ? "finance/budgets"
                            : "requests/matrix"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFeature(null)}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors"
                      title="Return to default photo"
                    >
                      <X className="h-3 w-3" />
                      <span>Default view</span>
                    </button>
                  </div>

                  {/* Real Portal Screenshot Preview (Mixed Light & Dark Mode) */}
                  <div className="bg-[#141415]">
                    {(() => {
                      const previews: Record<string, { src: string; alt: string; mode: string; label: string }> = {
                        roster: { src: "/screenshots/05-hr-employees.png", alt: "HR Workforce Directory (Light Mode)", mode: "Light Mode", label: "HR & Workforce Directory" },
                        attendance: { src: "/screenshots/06-attendance.png", alt: "Time & Attendance (Dark Mode)", mode: "Dark Mode", label: "Time & Attendance Tracking" },
                        payroll: { src: "/screenshots/04-payroll.png", alt: "Nigerian Payroll Engine (Dark Mode)", mode: "Dark Mode", label: "Automated PAYE & PenCom Payroll" },
                        procurement: { src: "/screenshots/11-procurement.png", alt: "Procurement & Requisitions (Light Mode)", mode: "Light Mode", label: "Procurement & Vendor Orders" },
                        approvals: { src: "/screenshots/12-approvals-dark.png", alt: "Multi-Tier Approvals (Dark Mode)", mode: "Dark Mode", label: "Multi-Tier Approval Workflows" },
                      };
                      const current = previews[selectedFeature || "roster"] ?? previews.roster;
                      return (
                        <>
                          <div className="w-full overflow-hidden bg-[#141415]">
                            <img src={current.src} alt={current.alt} decoding="sync" className="w-full h-auto block [image-rendering:-webkit-optimize-contrast]" />
                          </div>
                          <div className="px-4 py-3 bg-white border-t border-neutral-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-900">{current.label}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${current.mode === "Dark Mode" ? "bg-[#141415] text-white" : "bg-neutral-100 text-neutral-700"}`}>{current.mode}</span>
                            </div>
                            <button type="button" onClick={() => setSelectedFeature(null)} className="font-medium text-[#ff6900] hover:underline flex items-center gap-1 cursor-pointer">
                              <span>Close preview</span>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Core Capabilities Strip */}
        <div className="mt-16 pt-8 border-t border-neutral-900/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">Included in every workspace</span>
            <div className="flex flex-wrap items-center gap-6">
              <span>Role-based access control</span>
              <span>Tenant-isolated records</span>
              <span>PAYE &amp; PenCom schedules</span>
              <span>Approval audit log</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Live Product Experience */}
      <section id="interactive-demo" className="py-20 px-6 bg-neutral-50 border-t border-neutral-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="text-xs font-medium text-[#ff6900]">
              Live Platform Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight font-headline">
              A Single Workspace for Your Whole Organization
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
              Explore how Stanforte Edge unifies staff records, monthly salary disbursements, daily clock-in logs, and internal purchase approvals in one intuitive workspace.
            </p>
          </div>

          {/* Interactive Window Container */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xl overflow-hidden">
            {/* Top Window Bar */}
            <div className="border-b border-neutral-200 bg-neutral-100/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs font-mono text-neutral-500 font-medium">app.stanforteedge.com/workspace</span>
              </div>

              {/* Tab Selector Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200 shadow-xs text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "roster"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Staff Directory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "payroll"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Payroll Engine
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("approvals")}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "approvals"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Approval Queue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "attendance"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Daily Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("procurement")}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "procurement"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Procurement
                </button>
              </div>
            </div>

            {/* Real Application Screenshots (Light & Dark Mode Mix) */}
            <div className="bg-[#141415]">
              {(() => {
                const tabViews: Record<string, { src: string; alt: string; title: string; subtitle: string; mode: string }> = {
                  roster: { src: "/screenshots/05-hr-employees.png", alt: "Enterprise Workforce Directory", title: "Enterprise Workforce Directory", subtitle: "Live employee profiles, departments, and role assignments", mode: "Light Mode" },
                  payroll: { src: "/screenshots/04-payroll.png", alt: "Automated Nigerian Payroll Engine", title: "Automated Payroll & Statutory Tax Engine", subtitle: "PAYE, PenCom pension schedules, and commercial bank disbursement files", mode: "Dark Mode" },
                  approvals: { src: "/screenshots/12-approvals.png", alt: "Multi-Tier Approval Queue", title: "Multi-Tier Request & Payment Approvals", subtitle: "Department lead and finance sign-offs with immutable audit logs", mode: "Light Mode" },
                  attendance: { src: "/screenshots/06-attendance.png", alt: "Daily Time and Attendance", title: "Geofenced Time & Attendance Tracking", subtitle: "Real-time daily clock-in logs, late policies, and correction approvals", mode: "Dark Mode" },
                  procurement: { src: "/screenshots/11-procurement-dark.png", alt: "Procurement and Purchase Orders", title: "Procurement, Vendors & Purchase Orders", subtitle: "End-to-end requisitions, vendor quotes, and payment voucher reconciliation", mode: "Dark Mode" },
                };
                const view = tabViews[activeTab] ?? tabViews.roster;
                return (
                  <>
                    <div className="w-full overflow-hidden bg-[#141415]">
                      <img src={view.src} alt={view.alt} decoding="sync" className="w-full h-auto block [image-rendering:-webkit-optimize-contrast]" />
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 font-headline">{view.title}</h3>
                        <p className="text-xs text-neutral-500">{view.subtitle}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono ${view.mode === "Dark Mode" ? "bg-[#141415] text-white" : "bg-neutral-100 text-neutral-700 border border-neutral-200"}`}>
                        {view.mode} · Live Capture
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep Operational Capabilities (6 Pillar Grid with functional links) */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-medium text-[#ff6900]">
              Enterprise Architecture & Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight font-headline">
              Engineered for Real-World Organizational Complexity
            </h2>
            <p className="text-neutral-600 text-base leading-relaxed">
              Every workflow in Stanforte Edge addresses the exact compliance, payroll, and administrative friction points experienced by growing institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <Link
              to="/features#payroll"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Automated Salary & Tax Remittances
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Compute monthly payroll with statutory PAYE tax schedules, pension administrator remittances, and NHF contributions with zero calculation errors.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore payroll suite <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 2 */}
            <Link
              to="/features#attendance"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Biometric & Polygon Geofence Tracking
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Eliminate proxy attendance with GPS coordinate verification and physical biometric machine integration across all branches.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore attendance suite <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 3 */}
            <Link
              to="/features#approvals"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Multi-Tier Approval Guardrails
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Enforce sign-off hierarchies for leave, travel allowances, and purchase vouchers with full audit history and notification routing.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore approval matrices <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 4 */}
            <Link
              to="/security"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                PostgreSQL Row-Level Multi-Tenancy
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Protect sensitive corporate records with strict database-level row isolation, custom roles, and HttpOnly session architecture.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore security architecture <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 5 */}
            <Link
              to="/features#selfservice"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Staff Self-Service & Tasks
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Give employees instant access to download digital payslips, check accrued leave balances, and manage tasks in Kanban or Table view.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore self-service tools <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 6 */}
            <Link
              to="/features#workforce"
              className="p-8 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-colors space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-neutral-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Multi-Subsidiary & Branch Network
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Operate across multiple holding entities, state branches, and cost centers with centralized executive oversight.
              </p>
              <div className="pt-2 text-xs font-medium text-[#ff6900] flex items-center gap-1">
                Explore workforce structure <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Interactive Headcount & Value Estimator */}
      <section className="py-20 px-6 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-medium text-[#ff6900]">
              Organizational Efficiency Calculator
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 font-headline">
              Calculate Your Operational Efficiency
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
              Drag the headcount slider to see how much administrative time and compliance overhead Stanforte Edge saves your business each month.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-2xl bg-white border border-neutral-200/80 shadow-xl space-y-8">
            {/* Slider control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="headcount-slider" className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#ff6900]" /> Total Active Workforce:
                </label>
                <span className="text-2xl font-semibold text-[#ff6900] font-headline">
                  {headcount} Employees
                </span>
              </div>
              <input
                id="headcount-slider"
                type="range"
                min="5"
                max="350"
                step="5"
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#ff6900]"
              />
              <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                <span>5 (Early Stage)</span>
                <span>50 (Mid-Market)</span>
                <span>150 (Enterprise)</span>
                <span>350+ (Multi-Branch)</span>
              </div>
            </div>

            {/* Calculations Output Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-1">
                <div className="text-xs font-medium text-[#ff6900]">HR Admin Time Saved</div>
                <div className="text-2xl font-semibold text-neutral-900 font-headline">
                  ~{Math.round(headcount * 0.85)} hrs / mo
                </div>
                <div className="text-xs text-neutral-500">Automated clock-in, leave & roster reconciliation</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <div className="text-xs font-medium text-neutral-500">Payroll Run Duration</div>
                <div className="text-2xl font-semibold text-emerald-600 font-headline">
                  &lt; 30 Minutes
                </div>
                <div className="text-xs text-neutral-500">Down from 4-5 manual spreadsheet days</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <div className="text-xs font-medium text-neutral-500">Recommended Plan</div>
                <div className="text-xl font-semibold text-neutral-900 font-headline">
                  {headcount <= 15 ? "Starter Free" : headcount <= 100 ? "Growth Tier" : "Enterprise"}
                </div>
                <div className="text-xs text-neutral-500">
                  {headcount <= 15
                    ? "Free for up to 15 staff forever"
                    : `₦${(headcount * 1200).toLocaleString()} / month total`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                <span>No setup fee • 15-day full feature trial • Cancel anytime</span>
              </span>
              <Link
                to="/register"
                className="px-6 py-2.5 rounded-full text-xs font-medium bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md transition-colors flex items-center gap-1.5"
              >
                <span>Provision Workspace for {headcount} Staff</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Enterprise Impact Metrics */}
      <section className="py-16 px-6 bg-white border-t border-neutral-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-semibold text-[#ff6900] font-headline">4.8x</div>
            <div className="text-xs font-medium text-neutral-900">Faster Salary Runs</div>
            <div className="text-xs text-neutral-500">From 4 days to under 45 minutes</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-medium text-neutral-900 font-headline">PAYE &amp; PenCom</div>
            <div className="text-sm font-medium text-neutral-800">Statutory payroll schedules</div>
            <div className="text-xs text-neutral-500">Tax tables, pension deductions, and downloadable payslips</div>
          </div>
          <div className="space-y-1.5">
            <div className="text-2xl font-medium text-neutral-900 font-headline">Audit trail</div>
            <div className="text-sm font-medium text-neutral-800">Voucher and approval history</div>
            <div className="text-xs text-neutral-500">Every requisition, review step, and disbursement recorded</div>
          </div>
          <div className="space-y-1.5">
            <div className="text-2xl font-medium text-neutral-900 font-headline">Multi-entity</div>
            <div className="text-sm font-medium text-neutral-800">Tenant-scoped isolation</div>
            <div className="text-xs text-neutral-500">Separate organizations, roles, and budgets in one portal</div>
          </div>
        </div>
      </section>

      {/* 6. Operational Architecture */}
      <section className="py-20 px-6 bg-[#fafafa] border-t border-neutral-900/[0.08]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-medium text-neutral-900 font-headline tracking-tight">
              Built for multi-branch operations
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              One workspace for HR records, geofenced attendance, procurement approvals, and general ledger reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
              <h3 className="text-base font-medium text-neutral-900 font-headline">Attendance to payroll</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Reconcile branch check-ins, leave balances, and overtime directly into monthly payroll runs and statutory schedules.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
              <h3 className="text-base font-medium text-neutral-900 font-headline">Tiered spend approvals</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Route requisitions and payment vouchers through departmental review and budget checks before funds are disbursed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
              <h3 className="text-base font-medium text-neutral-900 font-headline">Staff self-service</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Employees submit leave requests, review policies, and download monthly payslips from one account without email back-and-forth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call to Action */}
      <section className="py-20 px-6 bg-white border-t border-neutral-900/[0.08]">
        <div className="max-w-5xl mx-auto rounded-2xl bg-neutral-900 text-white p-10 sm:p-14 space-y-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium text-orange-400">Workspace setup</p>
            <h2 className="text-2xl sm:text-4xl font-medium tracking-tight font-headline leading-tight">
              Run your organization from one operational ledger
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              Create your workspace, configure departments and approval tiers, and invite your team.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="h-11 px-6 rounded-lg font-medium text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white transition-colors duration-150 inline-flex items-center gap-2"
            >
              <span>Create workspace</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              to="/pricing"
              className="h-11 px-6 rounded-lg font-medium text-sm border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors duration-150 inline-flex items-center"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* VIDEO / DEMO MODAL */}
      {/* ============================================================ */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-neutral-100 relative">
            <button
              type="button"
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <span className="text-xs font-medium text-[#ff6900] bg-orange-50 px-2.5 py-1 rounded-full">
                Interactive Product Walkthrough
              </span>
              <h3 className="text-xl font-medium text-neutral-900 font-headline">
                Stanforte Edge Enterprise Platform Tour
              </h3>
              <p className="text-xs text-neutral-600">
                Watch how multi-branch organizations streamline statutory payroll, geofenced clock-in, and multi-tier purchase approvals in minutes.
              </p>
            </div>

            {/* Video Preview Frame */}
            <div className="w-full aspect-video rounded-2xl bg-neutral-900 overflow-hidden relative flex flex-col items-center justify-center text-center p-6 text-white">
              <div className="w-16 h-16 rounded-full bg-[#ff6900] text-white flex items-center justify-center mb-3 shadow-lg cursor-pointer transition-transform">
                <Play className="h-7 w-7 fill-white ml-1" />
              </div>
              <h4 className="text-base font-medium font-headline">Stanforte Edge System Overview</h4>
              <p className="text-xs text-neutral-400 max-w-sm mt-1">
                Full 4-minute interactive walk-through covering staff management, PAYE schedules, and mobile self-service.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setVideoModalOpen(false);
                  setActiveTab("payroll");
                }}
                className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                <span>Switch to Live Interactive Sandbox</span>
              </button>
              <Link
                to="/register"
                onClick={() => setVideoModalOpen(false)}
                className="px-6 py-2.5 rounded-full text-xs font-medium bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md transition-colors flex items-center gap-1.5"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD EMPLOYEE DEMO MODAL */}
      {/* ============================================================ */}
      {addEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-100 relative">
            <button
              type="button"
              onClick={() => setAddEmployeeModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-medium text-neutral-900 font-headline">Add Personnel (Demo)</h3>
              <p className="text-xs text-neutral-500">
                Add a test staff record to experience instant directory indexing and automated payroll integration.
              </p>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Babatunde Fashola"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Official Email</label>
                <input
                  type="email"
                  placeholder="e.g. b.fashola@stanforteedge.com"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700">Department</label>
                  <SelectBox
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                  >
                    <option value="People & Culture">People & Culture</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Supply Chain">Supply Chain</option>
                  </SelectBox>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700">Role</label>
                  <input
                    type="text"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                  >
                  </input>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-sm"
                >
                  Add to Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
