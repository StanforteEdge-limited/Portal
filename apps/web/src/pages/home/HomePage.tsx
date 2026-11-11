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
            <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
              Enterprise Workforce Infrastructure
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-slate-900 leading-[1.12] font-headline">
              Run Your Organization <br />
              Smarter with <br />
              <span className="text-[#ff6900]">Stanforte Edge</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Unify HR records, geofenced biometric attendance, automated PAYE payroll, and sequential purchase approvals in one intuitive enterprise platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-full font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="px-7 py-3.5 rounded-full font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-2.5 shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-[#ff6900] text-white flex items-center justify-center shadow-xs">
                  <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
                </div>
                <span>Watch Video Walkthrough</span>
              </button>
            </div>

            {/* 5 Feature Module Pills Row (Interactive feature trigger) */}
            <div className="pt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Explore Core Workspaces:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-2xl">
                <button
                  type="button"
                  onClick={() => handleFeatureClick("roster")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    selectedFeature === "roster"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <Users className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "roster" ? "text-[#ff6900]" : "text-slate-600"}`} />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">HR & Workforce</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("attendance")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    selectedFeature === "attendance"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <Clock className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "attendance" ? "text-[#ff6900]" : "text-slate-600"}`} />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Time & Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("payroll")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    selectedFeature === "payroll"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <CreditCard className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "payroll" ? "text-[#ff6900]" : "text-slate-600"}`} />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Payroll & Tax</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("procurement")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                    selectedFeature === "procurement"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <Building2 className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "procurement" ? "text-[#ff6900]" : "text-slate-600"}`} />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Budgets & Spend</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeatureClick("approvals")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center col-span-2 sm:col-span-1 ${
                    selectedFeature === "approvals"
                      ? "border-[#ff6900] bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <FileCheck className={`h-4 w-4 mb-1.5 transition-colors ${selectedFeature === "approvals" ? "text-[#ff6900]" : "text-slate-600"}`} />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Approval Chains</span>
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

                {/* Hero Photo Container */}
                <div className="relative z-10 w-[310px] sm:w-[380px] h-[400px] sm:h-[480px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                    alt="Executive using Stanforte Edge"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Floating Metric Card 1: Total Employees */}
                <div className="absolute -top-3 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Personnel</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">1,240</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> +12%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Metric Card 2: On Time Today */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:left-0 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">On Time Today</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">96.4%</div>
                  </div>
                </div>

                {/* Floating Metric Card 3: Payroll Ready */}
                <div className="absolute bottom-6 left-2 sm:left-8 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payroll Status</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1.5">
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
                <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-tr from-[#ff6900]/20 via-slate-100 to-amber-100/40 blur-xs -z-10" />

                {/* Main Window */}
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200/90 bg-white">
                  {/* Browser / App Window Top Chrome Bar */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      <div className="ml-2 bg-slate-800/90 rounded-md px-2.5 py-0.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-300 border border-slate-700/60">
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
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-md transition-colors"
                      title="Return to default photo"
                    >
                      <X className="h-3 w-3" />
                      <span>Default view</span>
                    </button>
                  </div>

                  {/* Dashboard Screen Content */}
                  <div className="p-5 sm:p-6 bg-slate-50/50 min-h-[400px] flex flex-col justify-between">
                    {/* TAB 1: HR & Workforce Directory */}
                    {selectedFeature === "roster" && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-blue-600" />
                              <span>Workforce Directory</span>
                            </div>
                            <div className="text-[10px] text-slate-500">1,240 Personnel • 6 Departments</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            All Records Synced
                          </span>
                        </div>

                        {/* Staff Cards Mini-List */}
                        <div className="space-y-2">
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                OA
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Oluwaseun Adeleke</div>
                                <div className="text-[10px] text-slate-400">Chief Financial Officer • Finance</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6900] font-bold flex items-center justify-center text-xs">
                                FO
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Fatima Olarinwaju</div>
                                <div className="text-[10px] text-slate-400">Head of People • HR & Culture</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                                CI
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Chinedu Ibeawuchi</div>
                                <div className="text-[10px] text-slate-400">Logistics Manager • Supply Chain</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              On Leave
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs">
                                AY
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Amina Yusuf</div>
                                <div className="text-[10px] text-slate-400">Senior Systems Engineer • Tech</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          </div>
                        </div>

                        {/* Mini Metric footer */}
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-center justify-between text-[11px]">
                          <span className="text-blue-900 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            <span>Automated Onboarding & KYC</span>
                          </span>
                          <span className="font-bold text-blue-700">100% Complete</span>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Time & Attendance */}
                    {selectedFeature === "attendance" && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              <span>Geofence & Campus Clock-In</span>
                            </div>
                            <div className="text-[10px] text-slate-500">Victoria Island Campus • 200m Polygon</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>GPS Verified</span>
                          </span>
                        </div>

                        {/* Attendance Stats Cards */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">On-Time Rate</div>
                            <div className="text-xl font-black text-emerald-600 mt-0.5">96.4%</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">45 / 48 verified present</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Clock-In</div>
                            <div className="text-xl font-black text-slate-900 mt-0.5">08:14 AM</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Zero proxy check-ins</div>
                          </div>
                        </div>

                        {/* Live Feed */}
                        <div className="space-y-1.5 text-xs">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Check-In Stream</div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">Oluwaseun Adeleke</span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">08:04 AM • Geofence</span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">Fatima Olarinwaju</span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">08:12 AM • Biometric #1</span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">Amina Yusuf</span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">08:21 AM • Biometric #2</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 flex items-center justify-between font-medium">
                          <span>Biometric Hardware Synced</span>
                          <span className="font-bold">2 Online Terminals</span>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Payroll & Tax */}
                    {selectedFeature === "payroll" && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-[#ff6900]" />
                              <span>November 2026 Salary Run</span>
                            </div>
                            <div className="text-[10px] text-slate-500">Automated PAYE Tax & PenCom Compliance</div>
                          </div>
                          <span className="text-[10px] font-bold text-white bg-emerald-600 px-2.5 py-0.5 rounded-full shadow-xs">
                            Ready for Payment
                          </span>
                        </div>

                        {/* Payroll Financial Breakdown */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Gross Payroll</div>
                            <div className="text-base font-black text-slate-900 mt-0.5">₦18,450,000</div>
                            <div className="text-[10px] text-slate-500">48 staff members</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">PAYE Tax Deductions</div>
                            <div className="text-base font-black text-slate-900 mt-0.5">₦2,860,000</div>
                            <div className="text-[10px] text-slate-500">State IRS schedule ready</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Pension Remittances</div>
                            <div className="text-base font-black text-slate-900 mt-0.5">₦1,476,000</div>
                            <div className="text-[10px] text-slate-500">PFA distribution set</div>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                            <div className="text-[10px] font-bold text-[#ff6900] uppercase">Net Salary Disbursal</div>
                            <div className="text-base font-black text-[#ff6900] mt-0.5">₦14,114,000</div>
                            <div className="text-[10px] text-orange-700/80">Bank batch file ready</div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
                          <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Commercial Bank Batch (CSV)</span>
                          </span>
                          <span className="font-bold text-emerald-700">Generated</span>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: Budgets & Procurement */}
                    {selectedFeature === "procurement" && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-blue-600" />
                              <span>Departmental Budgets & POs</span>
                            </div>
                            <div className="text-[10px] text-slate-500">Q4 Allocation: ₦22.6M Total</div>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            64% Utilized
                          </span>
                        </div>

                        {/* Budget bars */}
                        <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-700">Operations & Logistics</span>
                              <span className="text-slate-900 font-bold">₦8.2M / ₦11.4M (72%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className="bg-[#ff6900] h-2 rounded-full w-[72%]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-700">Information Technology</span>
                              <span className="text-slate-900 font-bold">₦3.45M / ₦7.2M (48%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full w-[48%]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-700">People & Culture</span>
                              <span className="text-slate-900 font-bold">₦1.2M / ₦4.0M (30%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className="bg-emerald-600 h-2 rounded-full w-[30%]" />
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                          <span className="text-slate-700">Recent PO #2026-042: Hardware Upgrade</span>
                          <span className="font-bold text-emerald-600">₦420,000 • Approved</span>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: Approval Chains */}
                    {selectedFeature === "approvals" && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                              <span>Sequential Approval Matrix</span>
                            </div>
                            <div className="text-[10px] text-slate-500">Tiered Authority & Expenditure Caps</div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Pending CFO Review
                          </span>
                        </div>

                        {/* Approval Stepper Card */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                          <div className="text-xs font-bold text-slate-900">Voucher: IT Server Rack Upgrade</div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-bold text-slate-900">₦420,000</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Requested by Zainab Bello (IT)</span>
                          </div>

                          {/* Visual Workflow Steps with real Lucide check icons */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-semibold text-center">
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1">
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>1. Requisition</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1">
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>2. Dept Head</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                              <span>3. CFO Sign-off</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Action simulation */}
                        <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-600">Simulate Decision:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVoucherStatus("rejected")}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setVoucherStatus("approved")}
                              className="px-3 py-1 text-[11px] font-bold bg-[#ff6900] text-white rounded-lg hover:bg-[#ea580c] shadow-xs"
                            >
                              Approve Voucher
                            </button>
                          </div>
                        </div>

                        {voucherStatus === "approved" && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-bold flex items-center justify-between animate-in fade-in duration-150">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Authorized by CFO • Indelibly Logged</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setVoucherStatus("pending")}
                              className="text-slate-500 hover:underline font-normal text-[10px]"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Interactive Footnote */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Click another feature to explore</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFeature(null)}
                        className="font-bold text-[#ff6900] hover:underline flex items-center gap-1"
                      >
                        <span>Close preview</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social Proof / Trusted By Bar */}
        <div className="mt-20 pt-8 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              &mdash; Trusted by forward thinking African organizations
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-700">AccessBank</span>
              <span className="font-black text-sm sm:text-base tracking-widest text-slate-700">DANGOTE</span>
              <span className="font-black text-sm sm:text-base tracking-tighter text-red-600">UBA&#9650;</span>
              <span className="font-extrabold text-sm sm:text-base text-slate-700">Nestle</span>
              <div className="w-10 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center">
                MTN
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Live Product Experience */}
      <section id="interactive-demo" className="py-20 px-6 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
              Live Platform Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-headline">
              A Single Workspace for Your Whole Organization
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore how Stanforte Edge unifies staff records, monthly salary disbursements, daily clock-in logs, and internal purchase approvals in one intuitive workspace.
            </p>
          </div>

          {/* Interactive Window Container */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
            {/* Top Window Bar */}
            <div className="border-b border-slate-200 bg-slate-100/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs font-mono text-slate-500 font-medium">app.stanforteedge.com/workspace</span>
              </div>

              {/* Tab Selector Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "roster"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Staff Directory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "payroll"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Payroll Engine
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("approvals")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "approvals"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Approval Queue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "attendance"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daily Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("procurement")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "procurement"
                      ? "bg-[#ff6900] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Procurement
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-6 sm:p-8">
              {/* Tab 1: Staff Directory */}
              {activeTab === "roster" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Enterprise Workforce Directory</h3>
                      <p className="text-xs text-slate-500">{employees.length} personnel displayed &bull; Multi-campus directory</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={campusFilter}
                        onChange={(e) => setCampusFilter(e.target.value as any)}
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white font-medium focus:outline-hidden"
                      >
                        <option value="all">All Campus Locations</option>
                        <option value="vi">Victoria Island Campus</option>
                        <option value="abuja">Abuja Office</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setAddEmployeeModalOpen(true)}
                        className="text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold rounded-lg px-3.5 py-1.5 flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Staff (Demo)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="py-3">Employee Name</th>
                          <th className="py-3">Staff ID</th>
                          <th className="py-3">Department</th>
                          <th className="py-3">Role</th>
                          <th className="py-3">Campus</th>
                          <th className="py-3">Status</th>
                          <th className="py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 font-bold text-slate-900 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6900] font-bold flex items-center justify-center text-xs">
                                {emp.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <div>{emp.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{emp.email}</div>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-slate-500">{emp.staffId}</td>
                            <td className="py-3.5">{emp.department}</td>
                            <td className="py-3.5 font-medium">{emp.role}</td>
                            <td className="py-3.5 text-slate-500">{emp.campus}</td>
                            <td className="py-3.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  emp.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {emp.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-semibold text-[#ff6900] cursor-pointer hover:underline">
                              <Link to="/register">Manage</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Payroll Engine */}
              {activeTab === "payroll" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Monthly Salary Run &bull; November 2026</h3>
                      <p className="text-xs text-slate-500">Automated statutory computations (PAYE Tax, Pension Reform Act 2014, NHF)</p>
                    </div>
                    <span className="text-xs bg-emerald-600 text-white font-bold rounded-lg px-3 py-1.5 shadow-sm">
                      Ready for Disbursement
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Salaries</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;18,450,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">48 active payroll profiles</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PAYE Tax Deductions</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;2,860,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">State IRS schedule ready</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pension Contributions</div>
                      <div className="text-xl font-black text-slate-900 mt-1">&#8358;1,476,000</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">PFA allocation breakdown</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                      <div className="text-[10px] uppercase font-bold text-[#ff6900] tracking-wider">Net Salary Disbursal</div>
                      <div className="text-xl font-black text-[#ff6900] mt-1">&#8358;14,114,000</div>
                      <div className="text-[10px] text-orange-700/80 mt-0.5">Ready for bank batch upload</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Zero calculation errors &bull; Fully audited against daily attendance
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="text-xs font-bold text-[#ff6900] hover:text-[#ea580c] flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100/70 px-3.5 py-1.5 rounded-xl border border-orange-200 transition-all"
                    >
                      <Download className="h-4 w-4" /> Download Bank Disbursement Schedule (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Approval Queue */}
              {activeTab === "approvals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Multi-Tier Approval Matrix</h3>
                      <p className="text-xs text-slate-500">Sequential sign-offs preventing unauthorized departmental expenditures</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
                      {voucherStatus === "pending" ? "1 Pending Sign-Off" : "All Sign-Offs Cleared"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Purchase Voucher &bull; Office IT Hardware Upgrade</span>
                          {voucherStatus === "pending" && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Pending CFO Approval
                            </span>
                          )}
                          {voucherStatus === "approved" && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Approved by CFO
                            </span>
                          )}
                          {voucherStatus === "rejected" && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              Rejected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Requisitioned by: <span className="font-semibold text-slate-700">Zainab Bello</span> (IT) &bull; Amount: <span className="font-bold text-slate-900">&#8358;420,000</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {voucherStatus === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setVoucherStatus("rejected")}
                              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-all"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setVoucherStatus("approved")}
                              className="px-4 py-1.5 text-xs font-bold bg-[#ff6900] hover:bg-[#ea580c] text-white rounded-lg shadow-sm transition-all"
                            >
                              Approve Voucher
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVoucherStatus("pending")}
                            className="text-xs text-slate-400 hover:text-slate-600 underline"
                          >
                            Reset Demo State
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Annual Leave Application &bull; 10 Days</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Supervisor Approved
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Requisitioned by: <span className="font-semibold text-slate-700">Emeka Okonkwo</span> &bull; Starting: Dec 1, 2026 &bull; Leave balance remaining: 14 days
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Cleared for HR Record</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Attendance Digest */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Live Campus Attendance Digest</h3>
                      <p className="text-xs text-slate-500">Real-time clock-in records synchronized with biometric devices and polygon geofencing</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTimesheet}
                      className="text-xs border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-1.5 font-semibold text-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" /> Export Today&apos;s Timesheet
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Present On-Site Today</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">45 / 48 (93.7%)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Average clock-in time: 08:18 AM</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Approved Leave / Off-site</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">3 Employees</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">2 Annual Leave, 1 Field Operation</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tardiness Rate</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">0% Discrepancies</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Automatically synced with payroll deductions</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Procurement */}
              {activeTab === "procurement" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-headline">Departmental Budgets & Procurement Vouchers</h3>
                      <p className="text-xs text-slate-500">Track quarterly spending allocations against live purchase orders</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                      Q4 Budget: 64% Utilized
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Operations & Logistics</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;8,200,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-[#ff6900] h-1.5 rounded-full w-[72%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">72% of &#8358;11.4M limit</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Information Technology</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;3,450,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-600 h-1.5 rounded-full w-[48%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">48% of &#8358;7.2M limit</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Human Resources</div>
                      <div className="text-lg font-black text-slate-900 mt-1">&#8358;1,200,000</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-600 h-1.5 rounded-full w-[30%]" />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">30% of &#8358;4.0M limit</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep Operational Capabilities (6 Pillar Grid with functional links) */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
              Enterprise Architecture & Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-headline">
              Engineered for Real-World Organizational Complexity
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Every workflow in Stanforte Edge addresses the exact compliance, payroll, and administrative friction points experienced by growing institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <Link
              to="/features#payroll"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Automated Salary & Tax Remittances
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compute monthly payroll with statutory PAYE tax schedules, pension administrator remittances, and NHF contributions with zero calculation errors.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore payroll suite <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 2 */}
            <Link
              to="/features#attendance"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Biometric & Polygon Geofence Tracking
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eliminate proxy attendance with GPS coordinate verification and physical biometric machine integration across all branches.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore attendance suite <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 3 */}
            <Link
              to="/features#approvals"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Multi-Tier Approval Guardrails
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enforce sign-off hierarchies for leave, travel allowances, and purchase vouchers with full audit history and notification routing.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore approval matrices <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 4 */}
            <Link
              to="/security"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                PostgreSQL Row-Level Multi-Tenancy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Protect sensitive corporate records with strict database-level row isolation, custom roles, and HttpOnly session architecture.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore security architecture <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 5 */}
            <Link
              to="/features#selfservice"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Staff Self-Service & Tasks
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Give employees instant access to download digital payslips, check accrued leave balances, and manage tasks in Kanban or Table view.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore self-service tools <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Pillar 6 */}
            <Link
              to="/features#workforce"
              className="p-8 rounded-3xl border border-slate-200/80 bg-white hover:border-[#ff6900] hover:shadow-lg transition-all space-y-3 group block"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-headline group-hover:text-[#ff6900] transition-colors">
                Multi-Subsidiary & Branch Network
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operate across multiple holding entities, state branches, and cost centers with centralized executive oversight.
              </p>
              <div className="pt-2 text-xs font-bold text-[#ff6900] flex items-center gap-1">
                Explore workforce structure <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Interactive Headcount & Value Estimator */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
              Organizational Efficiency Calculator
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-headline">
              Calculate Your Operational Efficiency
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Drag the headcount slider to see how much administrative time and compliance overhead Stanforte Edge saves your business each month.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-xl space-y-8">
            {/* Slider control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="headcount-slider" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#ff6900]" /> Total Active Workforce:
                </label>
                <span className="text-2xl font-black text-[#ff6900] font-headline">
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
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ff6900]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>5 (Early Stage)</span>
                <span>50 (Mid-Market)</span>
                <span>150 (Enterprise)</span>
                <span>350+ (Multi-Branch)</span>
              </div>
            </div>

            {/* Calculations Output Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#ff6900] tracking-wider">HR Admin Time Saved</div>
                <div className="text-2xl font-black text-slate-900 font-headline">
                  ~{Math.round(headcount * 0.85)} hrs / mo
                </div>
                <div className="text-[11px] text-slate-500">Automated clock-in, leave & roster reconciliation</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payroll Run Duration</div>
                <div className="text-2xl font-black text-emerald-600 font-headline">
                  &lt; 30 Minutes
                </div>
                <div className="text-[11px] text-slate-500">Down from 4-5 manual spreadsheet days</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recommended Plan</div>
                <div className="text-xl font-black text-slate-900 font-headline">
                  {headcount <= 15 ? "Starter Free" : headcount <= 100 ? "Growth Tier" : "Enterprise"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {headcount <= 15
                    ? "Free for up to 15 staff forever"
                    : `₦${(headcount * 1200).toLocaleString()} / month total`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                <span>No setup fee • 15-day full feature trial • Cancel anytime</span>
              </span>
              <Link
                to="/register"
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5"
              >
                <span>Provision Workspace for {headcount} Staff</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Enterprise Impact Metrics */}
      <section className="py-16 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">4.8x</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Faster Salary Runs</div>
            <div className="text-[11px] text-slate-500">From 4 days to under 45 minutes</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">99.8%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Calculation Accuracy</div>
            <div className="text-[11px] text-slate-500">Zero PAYE or pension discrepancies</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">100%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Audit Trail Integrity</div>
            <div className="text-[11px] text-slate-500">Every voucher and approval logged</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-black text-[#ff6900] font-headline">99.9%</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform Availability</div>
            <div className="text-[11px] text-slate-500">ISO-certified high availability</div>
          </div>
        </div>
      </section>

      {/* 6. Executive Customer Testimonials */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
              Trusted by Operational Leaders
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              See how corporate leaders streamline their workforce administration with Stanforte Edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;Before Stanforte Edge, reconciling attendance from three branches with monthly salaries took a week. Now payroll is compiled in under an hour with complete tax compliance.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">IB</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Ibrahim Balogun</div>
                  <div className="text-[10px] text-slate-500">Director of Operations, West Africa Logistics</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;The multi-tier purchase approval system stopped budget overruns dead in their tracks. Every requisition requires departmental approval before cash is disbursed.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6900] font-bold flex items-center justify-center text-xs">CN</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Chioma Nnamdi</div>
                  <div className="text-[10px] text-slate-500">Chief Financial Officer, Apex Holdings</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <p className="text-xs text-slate-600 leading-relaxed italic">
                &ldquo;Our staff love the self-service portal. They can apply for leave and immediately download their monthly payslips without contacting HR every single month.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">TA</div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Tolulope Adeleke</div>
                  <div className="text-[10px] text-slate-500">Head of Human Resources, Zenith Tech</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. High-Conversion Bottom Call to Action */}
      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#070e20] to-[#0a1128] text-white p-10 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Enterprise Deployment
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-headline max-w-2xl mx-auto leading-tight">
            Run your organization with clarity and confidence.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Provision your organization workspace in less than 60 seconds. Free for up to 15 employees with zero credit card required.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-full font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-xl shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Start Free Workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="px-7 py-4 rounded-full font-semibold text-sm border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            >
              View Headcount Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* VIDEO / DEMO MODAL */}
      {/* ============================================================ */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff6900] bg-orange-50 px-2.5 py-1 rounded-full">
                Interactive Product Walkthrough
              </span>
              <h3 className="text-xl font-bold text-slate-900 font-headline">
                Stanforte Edge Enterprise Platform Tour
              </h3>
              <p className="text-xs text-slate-600">
                Watch how multi-branch organizations streamline statutory payroll, geofenced clock-in, and multi-tier purchase approvals in minutes.
              </p>
            </div>

            {/* Video Preview Frame */}
            <div className="w-full aspect-video rounded-2xl bg-slate-900 overflow-hidden relative flex flex-col items-center justify-center text-center p-6 text-white shadow-inner">
              <div className="w-16 h-16 rounded-full bg-[#ff6900] text-white flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30 cursor-pointer hover:scale-105 transition-transform">
                <Play className="h-7 w-7 fill-white ml-1" />
              </div>
              <h4 className="text-base font-bold font-headline">Stanforte Edge System Overview</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Full 4-minute interactive walk-through covering staff management, PAYE schedules, and mobile self-service.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setVideoModalOpen(false);
                  setActiveTab("payroll");
                }}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                <span>Switch to Live Interactive Sandbox</span>
              </button>
              <Link
                to="/register"
                onClick={() => setVideoModalOpen(false)}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setAddEmployeeModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-headline">Add Personnel (Demo)</h3>
              <p className="text-xs text-slate-500">
                Add a test staff record to experience instant directory indexing and automated payroll integration.
              </p>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Babatunde Fashola"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Official Email</label>
                <input
                  type="email"
                  placeholder="e.g. b.fashola@stanforteedge.com"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <select
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                  >
                    <option value="People & Culture">People & Culture</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Supply Chain">Supply Chain</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <input
                    type="text"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#ff6900]"
                  >
                  </input>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-sm"
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
