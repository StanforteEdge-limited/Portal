import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  ChevronDown,
  Users,
  Clock,
  CreditCard,
  FileCheck,
  Smartphone,
  Shield,
  ShieldCheck,
  FolderOpen,
  HelpCircle,
  ArrowRight,
  Menu,
  X,
  Building,
  Briefcase,
  Layers,
  ChevronRight,
  FileText,
  BadgePercent,
  Play,
  CheckCircle2,
} from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

type DropdownKey = "product" | "solutions" | "resources" | null;

export function PublicLayout({ children, activePath }: PublicLayoutProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMouseEnter = (key: DropdownKey) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const toggleDropdown = (key: "product" | "solutions" | "resources") => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  };

  const closeAll = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between selection:bg-[#ff6900] selection:text-white">
      {/* Top Navigation Bar */}
      <header
        ref={navRef}
        onMouseLeave={handleMouseLeave}
        className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-all"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" onClick={closeAll} className="flex items-center gap-2">
            <StanforteLogo variant="light" className="h-9" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-700">
            {/* Product Trigger */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("product")}
            >
              <button
                type="button"
                onClick={() => toggleDropdown("product")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                  activeDropdown === "product"
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "hover:text-slate-900 hover:bg-slate-50"
                }`}
                aria-expanded={activeDropdown === "product"}
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-slate-400 ${
                    activeDropdown === "product" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
            </div>

            {/* Solutions Trigger */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("solutions")}
            >
              <button
                type="button"
                onClick={() => toggleDropdown("solutions")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                  activeDropdown === "solutions"
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "hover:text-slate-900 hover:bg-slate-50"
                }`}
                aria-expanded={activeDropdown === "solutions"}
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-slate-400 ${
                    activeDropdown === "solutions" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
            </div>

            {/* Resources Trigger */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("resources")}
            >
              <button
                type="button"
                onClick={() => toggleDropdown("resources")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                  activeDropdown === "resources"
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "hover:text-slate-900 hover:bg-slate-50"
                }`}
                aria-expanded={activeDropdown === "resources"}
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-slate-400 ${
                    activeDropdown === "resources" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
            </div>

            {/* Pricing Link */}
            <Link
              to="/pricing"
              onClick={closeAll}
              className={`px-3 py-2 rounded-xl transition-all ${
                activePath === "/pricing"
                  ? "text-[#ff6900] font-semibold bg-orange-50/60"
                  : "hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DESKTOP MEGA DROPDOWN PANELS */}
        {/* ============================================================ */}

        {/* 1. PRODUCT MEGA MENU */}
        {activeDropdown === "product" && (
          <div
            onMouseEnter={() => handleMouseEnter("product")}
            className="absolute top-full left-0 w-full bg-white border-b border-slate-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Main Capabilities Grid (8 cols) */}
                <div className="col-span-8">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Core Enterprise Platform Capabilities
                    </span>
                    <Link
                      to="/features"
                      onClick={closeAll}
                      className="text-xs font-semibold text-[#ff6900] hover:underline flex items-center gap-1"
                    >
                      View all capabilities <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Item 1: Workforce & HR */}
                    <Link
                      to="/features#workforce"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          HR & Workforce Directory
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Centralized employee dossiers, department hierarchies, structured onboarding and digital records.
                        </p>
                      </div>
                    </Link>

                    {/* Item 2: Time & Attendance */}
                    <Link
                      to="/features#attendance"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          Time, Shifts & Attendance
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Polygon geofencing, biometric device sync, shift rosters, and real-time campus timesheets.
                        </p>
                      </div>
                    </Link>

                    {/* Item 3: Payroll & Compliance */}
                    <Link
                      to="/features#payroll"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          Automated Payroll & Tax
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Statutory PAYE computations, pension remittances, and 1-click commercial bank disbursement batches.
                        </p>
                      </div>
                    </Link>

                    {/* Item 4: Approvals & Governance */}
                    <Link
                      to="/features#approvals"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          Multi-Tier Approval Matrix
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Sequential sign-off guardrails for expense vouchers, purchase requisitions, and leave applications.
                        </p>
                      </div>
                    </Link>

                    {/* Item 5: Self-Service & Tasks */}
                    <Link
                      to="/features#selfservice"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          Employee Self-Service Portal
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Instant digital payslip downloads, personal tasks (Kanban & Table), and leave requests.
                        </p>
                      </div>
                    </Link>

                    {/* Item 6: Document & Policy Center */}
                    <Link
                      to="/documents"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center gap-1.5">
                          Knowledge & Document Hub
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Company policies, SOPs, and secure document sharing with integrated in-app chat & email notifications.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right Promo / Demo Card (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-slate-100 flex flex-col justify-between">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-50/80 via-amber-50/40 to-slate-50 border border-orange-200/60 space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#ff6900]">
                      Interactive Demo
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 font-headline">
                        Experience Stanforte Edge Live
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Explore our live interactive dashboard tabs: Staff Roster, Automated Payroll, Approval Queues, and Campus Attendance.
                      </p>
                    </div>
                    <a
                      href="/#interactive-demo"
                      onClick={closeAll}
                      className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#ff6900] hover:bg-[#ea580c] px-4 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" /> Launch Live Demo
                    </a>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>15-day free organizational trial</span>
                    <Link to="/register" onClick={closeAll} className="font-bold text-[#ff6900] hover:underline flex items-center gap-1">
                      <span>Create Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SOLUTIONS MEGA MENU */}
        {activeDropdown === "solutions" && (
          <div
            onMouseEnter={() => handleMouseEnter("solutions")}
            className="absolute top-full left-0 w-full bg-white border-b border-slate-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Column 1: By Organization Scale (4 cols) */}
                <div className="col-span-4 space-y-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-2 border-b border-slate-100">
                    By Organizational Size
                  </span>
                  <div className="space-y-3">
                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center justify-between">
                        <span>Startups & Emerging Teams</span>
                        <span className="text-[10px] text-slate-400 font-medium">1 - 25 Staff</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Zero-complexity onboarding, staff directories, and essential attendance tracking without heavy setup.
                      </p>
                    </Link>

                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center justify-between">
                        <span>Growing Mid-Market</span>
                        <span className="text-[10px] text-slate-400 font-medium">25 - 250 Staff</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Automate statutory PAYE payroll runs, multi-tier purchase approvals, and polygon campus geofencing.
                      </p>
                    </Link>

                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors flex items-center justify-between">
                        <span>Large Corporate Enterprises</span>
                        <span className="text-[10px] text-slate-400 font-medium">250+ Staff</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Multi-branch cost centers, granular RBAC permissions, PostgreSQL row-level multi-tenancy, and dedicated SLAs.
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Column 2: By Department & Role (4 cols) */}
                <div className="col-span-4 space-y-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-2 border-b border-slate-100">
                    By Operational Role
                  </span>
                  <div className="space-y-3">
                    <Link
                      to="/features#workforce"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                        For HR & People Operations
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Consolidate personnel files, manage leave quotas, issue company policies, and monitor team records.
                      </p>
                    </Link>

                    <Link
                      to="/features#payroll"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                        For Finance & Accounts
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Streamline payroll tax schedules, generate commercial bank payment batches, and enforce expense voucher caps.
                      </p>
                    </Link>

                    <Link
                      to="/features#approvals"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all block group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                        For Department Heads & Executives
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unified managerial sign-offs, daily campus attendance digests, and complete operational audit history.
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Column 3: Enterprise Security Highlight (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-slate-100 flex flex-col justify-between">
                  <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Enterprise Security</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white font-headline">
                        Built for Compliance & Data Isolation
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Every organization operates within an isolated tenant partition with strict row-level security and TLS 1.3 encryption.
                      </p>
                    </div>
                    <Link
                      to="/security"
                      onClick={closeAll}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#ff6900] hover:bg-[#ea580c] px-4 py-2.5 rounded-xl transition-all"
                    >
                      Read Security Architecture <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>99.9% Platform Availability</span>
                    <Link to="/features" onClick={closeAll} className="font-bold text-[#ff6900] hover:underline flex items-center gap-1">
                      <span>Explore Full Stack</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. RESOURCES DROPDOWN MENU */}
        {activeDropdown === "resources" && (
          <div
            onMouseEnter={() => handleMouseEnter("resources")}
            className="absolute top-full left-0 w-full bg-white border-b border-slate-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Main Resources Links (8 cols) */}
                <div className="col-span-8">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-2 mb-4 border-b border-slate-100">
                    Resources & Compliance Documentation
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Resource 1: Security & Compliance */}
                    <Link
                      to="/security"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                          Security & Compliance Guide
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Learn about tenant data isolation, AES-256 encryption, HttpOnly sessions, and audit logging.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 2: Pricing Plans */}
                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                          Headcount Pricing & Tiers
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Transparent per-seat pricing with zero surprise implementation fees or hidden charges.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 3: Documentation & Policies */}
                    <Link
                      to="/documents"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                          Organizational Documents & Policies
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Upload, distribute, and track employee acknowledgements for company handbooks and SOPs.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 4: Help & Support Center */}
                    <Link
                      to="/help"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                          Help Center & Support Desk
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          Step-by-step guides, CSV roster import templates, and direct access to our technical specialists.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right Promo / Support Card (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-slate-100 flex flex-col justify-between">
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Need Personalized Onboarding?
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Schedule an Assisted Setup Session
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Our customer operations specialists will help you migrate your employee roster, configure statutory PAYE tax brackets, and verify payroll in 48 hours.
                    </p>
                    <Link
                      to="/register"
                      onClick={closeAll}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ff6900] hover:underline pt-1"
                    >
                      Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Questions? hello@stanforteedge.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MOBILE NAVIGATION DRAWER */}
        {/* ============================================================ */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-6 space-y-4 shadow-xl max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Accordion: Product */}
            <div className="border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "product" ? null : "product")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-bold text-slate-900"
              >
                <span>Product Capabilities</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    mobileAccordion === "product" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "product" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/features#workforce"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>HR & Workforce Directory</span>
                  </Link>
                  <Link
                    to="/features#attendance"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Time & Attendance Tracking</span>
                  </Link>
                  <Link
                    to="/features#payroll"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <CreditCard className="h-4 w-4 text-[#ff6900]" />
                    <span>Automated Payroll & Tax</span>
                  </Link>
                  <Link
                    to="/features#approvals"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <FileCheck className="h-4 w-4 text-purple-600" />
                    <span>Multi-Tier Approvals</span>
                  </Link>
                  <Link
                    to="/features#selfservice"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>Staff Self-Service & Tasks</span>
                  </Link>
                  <Link
                    to="/documents"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <FolderOpen className="h-4 w-4 text-indigo-600" />
                    <span>Knowledge & Document Hub</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion: Solutions */}
            <div className="border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "solutions" ? null : "solutions")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-bold text-slate-900"
              >
                <span>Solutions & Use Cases</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    mobileAccordion === "solutions" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "solutions" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Building className="h-4 w-4 text-slate-600" />
                    <span>Startups & Growing Teams (1-25)</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Layers className="h-4 w-4 text-slate-600" />
                    <span>Mid-Market Organizations (25-250)</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Briefcase className="h-4 w-4 text-slate-600" />
                    <span>Large Corporate Enterprises (250+)</span>
                  </Link>
                  <Link
                    to="/security"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Security & Compliance</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion: Resources */}
            <div className="border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "resources" ? null : "resources")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-bold text-slate-900"
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    mobileAccordion === "resources" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "resources" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/security"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span>Security Architecture</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <BadgePercent className="h-4 w-4 text-orange-600" />
                    <span>Plans & Pricing</span>
                  </Link>
                  <Link
                    to="/documents"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Company Policies & Documents</span>
                  </Link>
                  <Link
                    to="/help"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-slate-700 hover:text-[#ff6900]"
                  >
                    <HelpCircle className="h-4 w-4 text-purple-600" />
                    <span>Help Center & FAQs</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Pricing direct */}
            <Link
              to="/pricing"
              onClick={closeAll}
              className="block py-2 text-sm font-bold text-slate-900 hover:text-[#ff6900]"
            >
              Pricing
            </Link>

            {/* Mobile CTAs */}
            <div className="pt-4 space-y-2.5">
              <Link
                to="/register"
                onClick={closeAll}
                className="w-full py-3 rounded-full text-center text-sm font-bold bg-[#ff6900] text-white block shadow-md shadow-orange-500/25"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                onClick={closeAll}
                className="w-full py-2.5 rounded-full text-center text-sm font-semibold border border-slate-200 text-slate-700 block hover:bg-slate-50"
              >
                Sign In to Workspace
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Modern Comprehensive Public Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Column 1: Brand Info */}
            <div className="md:col-span-2 space-y-4">
              <StanforteLogo variant="light" className="h-8" />
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                Stanforte Edge is the integrated multi-tenant enterprise operating system for modern African institutions. Unify workforce dossiers, geofenced attendance, automated statutory payroll, and multi-tier purchase approvals in one workspace.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>All systems operational &bull; ISO-compliant infrastructure</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-3 text-xs">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Product</h5>
              <ul className="space-y-2 text-slate-600">
                <li><Link to="/features#workforce" className="hover:text-slate-900">Workforce Directory</Link></li>
                <li><Link to="/features#attendance" className="hover:text-slate-900">Time & Attendance</Link></li>
                <li><Link to="/features#payroll" className="hover:text-slate-900">Automated Payroll</Link></li>
                <li><Link to="/features#approvals" className="hover:text-slate-900">Approval Workflows</Link></li>
                <li><Link to="/features#selfservice" className="hover:text-slate-900">Staff Self-Service</Link></li>
                <li><Link to="/pricing" className="hover:text-slate-900">Pricing Plans</Link></li>
              </ul>
            </div>

            {/* Column 3: Solutions */}
            <div className="space-y-3 text-xs">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Solutions</h5>
              <ul className="space-y-2 text-slate-600">
                <li><Link to="/pricing" className="hover:text-slate-900">Early-Stage Teams</Link></li>
                <li><Link to="/pricing" className="hover:text-slate-900">Mid-Sized Enterprises</Link></li>
                <li><Link to="/pricing" className="hover:text-slate-900">Large Holding Companies</Link></li>
                <li><Link to="/security" className="hover:text-slate-900">Row-Level Multi-Tenancy</Link></li>
                <li><Link to="/features#payroll" className="hover:text-slate-900">PAYE & Pension Compliance</Link></li>
              </ul>
            </div>

            {/* Column 4: Resources & Trust */}
            <div className="space-y-3 text-xs">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Resources & Trust</h5>
              <ul className="space-y-2 text-slate-600">
                <li><Link to="/security" className="hover:text-slate-900">Security & Encryption</Link></li>
                <li><Link to="/documents" className="hover:text-slate-900">Document Management</Link></li>
                <li><Link to="/help" className="hover:text-slate-900">Help & Support</Link></li>
                <li><Link to="/login" className="hover:text-slate-900">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-slate-900">Create Free Workspace</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved. Built for high-reliability organizational administration.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/security" className="hover:text-slate-900">Security Architecture</Link>
              <Link to="/pricing" className="hover:text-slate-900">Pricing</Link>
              <Link to="/features" className="hover:text-slate-900">Capabilities</Link>
              <Link to="/login" className="hover:text-slate-900">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
