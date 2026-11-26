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
  const [pinnedDropdown, setPinnedDropdown] = useState<DropdownKey>(null);
  const [hoveredDropdown, setHoveredDropdown] = useState<DropdownKey>(null);
  const activeDropdown = pinnedDropdown || hoveredDropdown;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setPinnedDropdown(null);
        setHoveredDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinnedDropdown(null);
        setHoveredDropdown(null);
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
    setHoveredDropdown(key);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredDropdown(null);
    }, 200);
  };

  const toggleDropdown = (key: "product" | "solutions" | "resources") => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (pinnedDropdown === key) {
      setPinnedDropdown(null);
      setHoveredDropdown(null);
    } else {
      setPinnedDropdown(key);
      setHoveredDropdown(key);
    }
  };

  const closeAll = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setPinnedDropdown(null);
    setHoveredDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col justify-between selection:bg-[#C2410C] selection:text-white">
      {/* Top Navigation Bar */}
      <header
        ref={navRef}
        onMouseLeave={handleMouseLeave}
        className="relative border-b border-neutral-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" onClick={closeAll} className="flex items-center gap-2">
            <StanforteLogo variant="light" className="h-9" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-neutral-700">
            {/* Product Trigger */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("product")}
            >
              <button
                type="button"
                onClick={() => toggleDropdown("product")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
                  activeDropdown === "product"
                    ? "bg-neutral-100 text-neutral-900 font-semibold"
                    : "hover:text-neutral-900 hover:bg-neutral-50"
                }`}
                aria-expanded={activeDropdown === "product"}
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-neutral-400 ${
                    activeDropdown === "product" ? "rotate-180 text-neutral-900" : ""
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
                  activeDropdown === "solutions"
                    ? "bg-neutral-100 text-neutral-900 font-semibold"
                    : "hover:text-neutral-900 hover:bg-neutral-50"
                }`}
                aria-expanded={activeDropdown === "solutions"}
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-neutral-400 ${
                    activeDropdown === "solutions" ? "rotate-180 text-neutral-900" : ""
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
                  activeDropdown === "resources"
                    ? "bg-neutral-100 text-neutral-900 font-semibold"
                    : "hover:text-neutral-900 hover:bg-neutral-50"
                }`}
                aria-expanded={activeDropdown === "resources"}
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 text-neutral-400 ${
                    activeDropdown === "resources" ? "rotate-180 text-neutral-900" : ""
                  }`}
                />
              </button>
            </div>

            {/* Pricing Link */}
            <Link
              to="/pricing"
              onClick={closeAll}
              className={`px-3 py-2 rounded-xl transition-colors ${
                activePath === "/pricing"
                  ? "text-[#C2410C] font-semibold bg-orange-50/60"
                  : "hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="min-h-[44px] px-4 inline-flex items-center text-[15px] font-semibold text-[#475569] hover:text-[#0F172A] transition-colors rounded-lg"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="min-h-[44px] px-5 inline-flex items-center rounded-lg text-[15px] font-semibold bg-[#C2410C] hover:bg-[#9A3412] text-white transition-[background-color,transform] duration-150 hover:-translate-y-[1px] active:translate-y-0"
            >
              Create workspace
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="min-h-[44px] px-3 inline-flex items-center text-[14px] font-semibold text-[#475569] hover:text-[#0F172A]"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
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
            className="absolute top-full left-0 w-full bg-white border-b border-neutral-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Main Capabilities Grid (8 cols) */}
                <div className="col-span-8">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
                    <span className="text-xs font-medium text-neutral-400">
                      Core Enterprise Platform Capabilities
                    </span>
                    <Link
                      to="/features"
                      onClick={closeAll}
                      className="text-xs font-semibold text-[#C2410C] hover:underline flex items-center gap-1"
                    >
                      View all capabilities <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Item 1: Workforce & HR */}
                    <Link
                      to="/features#workforce"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 transition-transform">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          HR & Workforce Directory
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Centralized employee dossiers, department hierarchies, structured onboarding and digital records.
                        </p>
                      </div>
                    </Link>

                    {/* Item 2: Time & Attendance */}
                    <Link
                      to="/features#attendance"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 transition-transform">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          Time, Shifts & Attendance
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Polygon geofencing, biometric device sync, shift rosters, and real-time campus timesheets.
                        </p>
                      </div>
                    </Link>

                    {/* Item 3: Payroll & Compliance */}
                    <Link
                      to="/features#payroll"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0 transition-transform">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          Automated Payroll & Tax
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Statutory PAYE computations, pension remittances, and 1-click commercial bank disbursement batches.
                        </p>
                      </div>
                    </Link>

                    {/* Item 4: Approvals & Governance */}
                    <Link
                      to="/features#approvals"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 transition-transform">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          Multi-Tier Approval Matrix
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Sequential sign-off guardrails for expense vouchers, purchase requisitions, and leave applications.
                        </p>
                      </div>
                    </Link>

                    {/* Item 5: Self-Service & Tasks */}
                    <Link
                      to="/features#selfservice"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 transition-transform">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          Employee Self-Service Portal
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Instant digital payslip downloads, personal tasks (Kanban & Table), and leave requests.
                        </p>
                      </div>
                    </Link>

                    {/* Item 6: Document & Policy Center */}
                    <Link
                      to="/help#documents"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 transition-transform">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center gap-1.5">
                          Knowledge & Document Hub
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Company policies, SOPs, and secure document sharing with integrated in-app chat & email notifications.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right Promo / Demo Card (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-neutral-100 flex flex-col justify-between">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50/80 via-amber-50/40 to-neutral-50 border border-orange-200/60 space-y-4">
                    <div className="text-xs font-medium text-[#C2410C]">
                      Interactive Demo
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-medium text-neutral-900 font-headline">
                        Experience Stanforte Edge Live
                      </h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Explore our live interactive dashboard tabs: Staff Roster, Automated Payroll, Approval Queues, and Campus Attendance.
                      </p>
                    </div>
                    <a
                      href="/#interactive-demo"
                      onClick={closeAll}
                      className="inline-flex items-center gap-2 text-xs font-medium text-white bg-[#C2410C] hover:bg-[#9A3412] px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" /> Launch Live Demo
                    </a>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-neutral-500">
                    <span>15-day free organizational trial</span>
                    <Link to="/register" onClick={closeAll} className="font-medium text-[#C2410C] hover:underline flex items-center gap-1">
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
            className="absolute top-full left-0 w-full bg-white border-b border-neutral-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Column 1: By Organization Scale (4 cols) */}
                <div className="col-span-4 space-y-4">
                  <span className="text-xs font-medium text-neutral-400 block pb-2 border-b border-neutral-100">
                    By Organizational Size
                  </span>
                  <div className="space-y-3">
                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center justify-between">
                        <span>Startups & Emerging Teams</span>
                        <span className="text-xs text-neutral-400 font-medium">1 - 25 Staff</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Zero-complexity onboarding, staff directories, and essential attendance tracking without heavy setup.
                      </p>
                    </Link>

                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center justify-between">
                        <span>Growing Mid-Market</span>
                        <span className="text-xs text-neutral-400 font-medium">25 - 250 Staff</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Automate statutory PAYE payroll runs, multi-tier purchase approvals, and polygon campus geofencing.
                      </p>
                    </Link>

                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors flex items-center justify-between">
                        <span>Large Corporate Enterprises</span>
                        <span className="text-xs text-neutral-400 font-medium">250+ Staff</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Multi-branch cost centers, granular RBAC permissions, PostgreSQL row-level multi-tenancy, and dedicated SLAs.
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Column 2: By Department & Role (4 cols) */}
                <div className="col-span-4 space-y-4">
                  <span className="text-xs font-medium text-neutral-400 block pb-2 border-b border-neutral-100">
                    By Operational Role
                  </span>
                  <div className="space-y-3">
                    <Link
                      to="/features#workforce"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                        For HR & People Operations
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Consolidate personnel files, manage leave quotas, issue company policies, and monitor team records.
                      </p>
                    </Link>

                    <Link
                      to="/features#payroll"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                        For Finance & Accounts
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Streamline payroll tax schedules, generate commercial bank payment batches, and enforce expense voucher caps.
                      </p>
                    </Link>

                    <Link
                      to="/features#approvals"
                      onClick={closeAll}
                      className="p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors block group"
                    >
                      <div className="text-xs font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                        For Department Heads & Executives
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Unified managerial sign-offs, daily campus attendance digests, and complete operational audit history.
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Column 3: Enterprise Security Highlight (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-neutral-100 flex flex-col justify-between">
                  <div className="p-6 rounded-2xl bg-neutral-900 text-white space-y-4 shadow-xl">
                    <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Enterprise Security</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-medium text-white font-headline">
                        Built for Compliance & Data Isolation
                      </h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Every organization operates within an isolated tenant partition with strict row-level security and TLS 1.3 encryption.
                      </p>
                    </div>
                    <Link
                      to="/security"
                      onClick={closeAll}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#C2410C] hover:bg-[#9A3412] px-4 py-2.5 rounded-xl transition-colors"
                    >
                      Read Security Architecture <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-neutral-500">
                    <span>99.9% Platform Availability</span>
                    <Link to="/features" onClick={closeAll} className="font-medium text-[#C2410C] hover:underline flex items-center gap-1">
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
            className="absolute top-full left-0 w-full bg-white border-b border-neutral-200/90 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-12 gap-8">
                {/* Main Resources Links (8 cols) */}
                <div className="col-span-8">
                  <span className="text-xs font-medium text-neutral-400 block pb-2 mb-4 border-b border-neutral-100">
                    Resources & Compliance Documentation
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Resource 1: Security & Compliance */}
                    <Link
                      to="/security"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 transition-transform">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                          Security & Compliance Guide
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Learn about tenant data isolation, AES-256 encryption, HttpOnly sessions, and audit logging.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 2: Pricing Plans */}
                    <Link
                      to="/pricing"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0 transition-transform">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                          Headcount Pricing & Tiers
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Transparent per-seat pricing with zero surprise implementation fees or hidden charges.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 3: Documentation & Policies */}
                    <Link
                      to="/help#documents"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                          Organizational Documents & Policies
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Upload, distribute, and track employee acknowledgements for company handbooks and SOPs.
                        </p>
                      </div>
                    </Link>

                    {/* Resource 4: Help & Support Center */}
                    <Link
                      to="/help"
                      onClick={closeAll}
                      className="p-3.5 rounded-2xl border border-transparent hover:border-neutral-200 hover:bg-neutral-50 transition-colors flex items-start gap-3.5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 transition-transform">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors">
                          Help Center & Support Desk
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          Step-by-step guides, CSV roster import templates, and direct access to our technical specialists.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right Promo / Support Card (4 cols) */}
                <div className="col-span-4 pl-6 border-l border-neutral-100 flex flex-col justify-between">
                  <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                    <span className="text-xs font-medium text-neutral-500">
                      Need Personalized Onboarding?
                    </span>
                    <h4 className="text-sm font-medium text-neutral-900">
                      Schedule an Assisted Setup Session
                    </h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Our customer operations specialists will help you migrate your employee roster, configure statutory PAYE tax brackets, and verify payroll in 48 hours.
                    </p>
                    <Link
                      to="/register"
                      onClick={closeAll}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C2410C] hover:underline pt-1"
                    >
                      Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-neutral-500">
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
          <div className="md:hidden border-t border-neutral-100 bg-white px-6 py-6 space-y-4 shadow-xl max-h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Accordion: Product */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "product" ? null : "product")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-neutral-900"
              >
                <span>Product Capabilities</span>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    mobileAccordion === "product" ? "rotate-180 text-neutral-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "product" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/features#workforce"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Users className="h-4 w-4 text-neutral-700" />
                    <span>HR & Workforce Directory</span>
                  </Link>
                  <Link
                    to="/features#attendance"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Time & Attendance Tracking</span>
                  </Link>
                  <Link
                    to="/features#payroll"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <CreditCard className="h-4 w-4 text-[#C2410C]" />
                    <span>Automated Payroll & Tax</span>
                  </Link>
                  <Link
                    to="/features#approvals"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <FileCheck className="h-4 w-4 text-neutral-700" />
                    <span>Multi-Tier Approvals</span>
                  </Link>
                  <Link
                    to="/features#selfservice"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>Staff Self-Service & Tasks</span>
                  </Link>
                  <Link
                    to="/help#documents"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <FolderOpen className="h-4 w-4 text-neutral-700" />
                    <span>Knowledge & Document Hub</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion: Solutions */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "solutions" ? null : "solutions")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-neutral-900"
              >
                <span>Solutions & Use Cases</span>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    mobileAccordion === "solutions" ? "rotate-180 text-neutral-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "solutions" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Building className="h-4 w-4 text-neutral-600" />
                    <span>Startups & Growing Teams (1-25)</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Layers className="h-4 w-4 text-neutral-600" />
                    <span>Mid-Market Organizations (25-250)</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Briefcase className="h-4 w-4 text-neutral-600" />
                    <span>Large Corporate Enterprises (250+)</span>
                  </Link>
                  <Link
                    to="/security"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Security & Compliance</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion: Resources */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion(mobileAccordion === "resources" ? null : "resources")
                }
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-neutral-900"
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    mobileAccordion === "resources" ? "rotate-180 text-neutral-900" : ""
                  }`}
                />
              </button>
              {mobileAccordion === "resources" && (
                <div className="pl-2 pt-2 space-y-3 text-xs">
                  <Link
                    to="/security"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span>Security Architecture</span>
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <BadgePercent className="h-4 w-4 text-orange-600" />
                    <span>Plans & Pricing</span>
                  </Link>
                  <Link
                    to="/help#documents"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <FileText className="h-4 w-4 text-neutral-700" />
                    <span>Company Policies & Documents</span>
                  </Link>
                  <Link
                    to="/help"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 py-1 text-neutral-700 hover:text-[#C2410C]"
                  >
                    <HelpCircle className="h-4 w-4 text-neutral-700" />
                    <span>Help Center & FAQs</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Pricing direct */}
            <Link
              to="/pricing"
              onClick={closeAll}
              className="block py-2 text-sm font-medium text-neutral-900 hover:text-[#C2410C]"
            >
              Pricing
            </Link>

            {/* Mobile CTAs */}
            <div className="pt-4 space-y-2.5">
              <Link
                to="/register"
                onClick={closeAll}
                className="w-full py-3 rounded-full text-center text-sm font-medium bg-[#C2410C] text-white block shadow-md"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                onClick={closeAll}
                className="w-full py-2.5 rounded-full text-center text-sm font-semibold border border-neutral-200 text-neutral-700 block hover:bg-neutral-50"
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
      <footer className="border-t border-neutral-100 bg-neutral-50 pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Column 1: Brand Info */}
            <div className="md:col-span-2 space-y-4">
              <StanforteLogo variant="light" className="h-8" />
              <p className="text-xs text-neutral-600 max-w-sm leading-relaxed">
                Stanforte Edge is the integrated multi-tenant enterprise operating system for modern African institutions. Unify workforce dossiers, geofenced attendance, automated statutory payroll, and multi-tier purchase approvals in one workspace.
              </p>
              <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>All systems operational &bull; ISO-compliant infrastructure</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-3 text-xs">
              <h5 className="font-medium text-neutral-900 text-xs">Product</h5>
              <ul className="space-y-2 text-neutral-600">
                <li><Link to="/features#workforce" className="hover:text-neutral-900">Workforce Directory</Link></li>
                <li><Link to="/features#attendance" className="hover:text-neutral-900">Time & Attendance</Link></li>
                <li><Link to="/features#payroll" className="hover:text-neutral-900">Automated Payroll</Link></li>
                <li><Link to="/features#approvals" className="hover:text-neutral-900">Approval Workflows</Link></li>
                <li><Link to="/features#selfservice" className="hover:text-neutral-900">Staff Self-Service</Link></li>
                <li><Link to="/pricing" className="hover:text-neutral-900">Pricing Plans</Link></li>
              </ul>
            </div>

            {/* Column 3: Solutions */}
            <div className="space-y-3 text-xs">
              <h5 className="font-medium text-neutral-900 text-xs">Solutions</h5>
              <ul className="space-y-2 text-neutral-600">
                <li><Link to="/pricing" className="hover:text-neutral-900">Early-Stage Teams</Link></li>
                <li><Link to="/pricing" className="hover:text-neutral-900">Mid-Sized Enterprises</Link></li>
                <li><Link to="/pricing" className="hover:text-neutral-900">Large Holding Companies</Link></li>
                <li><Link to="/security" className="hover:text-neutral-900">Row-Level Multi-Tenancy</Link></li>
                <li><Link to="/features#payroll" className="hover:text-neutral-900">PAYE & Pension Compliance</Link></li>
              </ul>
            </div>

            {/* Column 4: Resources & Trust */}
            <div className="space-y-3 text-xs">
              <h5 className="font-medium text-neutral-900 text-xs">Resources & Trust</h5>
              <ul className="space-y-2 text-neutral-600">
                <li><Link to="/security" className="hover:text-neutral-900">Security & Encryption</Link></li>
                <li><Link to="/help#documents" className="hover:text-neutral-900">Document Management</Link></li>
                <li><Link to="/help" className="hover:text-neutral-900">Help & Support</Link></li>
                <li><Link to="/contact" className="hover:text-neutral-900">Contact & Report</Link></li>
                <li><Link to="/login" className="hover:text-neutral-900">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-neutral-900">Create Free Workspace</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-200/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <div>
              &copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved. Built for high-reliability organizational administration.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/security" className="hover:text-neutral-900">Security Architecture</Link>
              <Link to="/pricing" className="hover:text-neutral-900">Pricing</Link>
              <Link to="/features" className="hover:text-neutral-900">Capabilities</Link>
              <Link to="/login" className="hover:text-neutral-900">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
