import { useEffect, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";
import {
  ArrowRight,
  Check,
  Download,
  Play,
  RotateCcw,
  X,
} from "lucide-react";

type ShowcaseTab =
  | "overview"
  | "directory"
  | "payroll"
  | "attendance"
  | "approvals"
  | "procurement";

interface ShowcaseItem {
  id: ShowcaseTab;
  label: string;
  title: string;
  caption: string;
  screenshot: string;
  alt: string;
  themeLabel: "Dark" | "Light";
  csvAction?: {
    label: string;
    filename: string;
    content: string;
  };
}

const SHOWCASE_TABS: ShowcaseItem[] = [
  {
    id: "overview",
    label: "Workspace",
    title: "Daily operations summary",
    caption:
      "Track active headcount, pending purchase approvals, and monthly payroll readiness from one screen.",
    screenshot: "/screenshots/01-dashboard-dark.png",
    alt: "Stanforte Edge workspace overview dashboard in dark mode",
    themeLabel: "Dark",
  },
  {
    id: "directory",
    label: "Staff Directory",
    title: "Multi-campus employee records",
    caption:
      "Keep staff profiles, departments, reporting lines, and contract documents organized across every branch.",
    screenshot: "/screenshots/05-hr-employees.png",
    alt: "Stanforte Edge staff directory showing employee records in light mode",
    themeLabel: "Light",
  },
  {
    id: "payroll",
    label: "Payroll & Tax",
    title: "PAYE, PenCom, and net salary runs",
    caption:
      "Calculate statutory deductions automatically and export bank-ready disbursement schedules without manual formulas.",
    screenshot: "/screenshots/04-payroll.png",
    alt: "Stanforte Edge payroll run screen showing PAYE and pension schedules in dark mode",
    themeLabel: "Dark",
    csvAction: {
      label: "Download sample bank CSV",
      filename: "stanforte_salary_disbursement_sample.csv",
      content:
        "Staff ID,Employee Name,Bank Name,Account Number,Gross Salary,PAYE Tax,Pension,Net Disbursal\n" +
        "STE-2024-001,Oluwaseun Adeleke,Access Bank,0029384721,1200000,185000,96000,919000\n" +
        "STE-2024-014,Fatima Olarinwaju,Zenith Bank,1012938492,850000,127500,68000,654500\n" +
        "STE-2024-032,Chinedu Ibeawuchi,GTBank,0123984712,650000,97500,52000,500500\n",
    },
  },
  {
    id: "attendance",
    label: "Attendance",
    title: "Geofenced branch check-ins",
    caption:
      "Verify daily clock-ins by campus boundary and feed approved leave and overtime straight into payroll.",
    screenshot: "/screenshots/06-attendance-light.png",
    alt: "Stanforte Edge attendance tracking log in light mode",
    themeLabel: "Light",
    csvAction: {
      label: "Download sample timesheet CSV",
      filename: "stanforte_campus_timesheet_sample.csv",
      content:
        "Date,Staff ID,Employee Name,Department,Clock In,Clock Out,Verification,Status\n" +
        "2026-11-11,STE-2024-001,Oluwaseun Adeleke,Finance,08:04 AM,05:15 PM,Campus Geofence,Present\n" +
        "2026-11-11,STE-2024-014,Fatima Olarinwaju,HR,08:12 AM,05:02 PM,Campus Geofence,Present\n" +
        "2026-11-11,STE-2024-032,Chinedu Ibeawuchi,Supply Chain,-,-,Leave Approved,On Leave\n",
    },
  },
  {
    id: "approvals",
    label: "Approvals",
    title: "Tiered sign-off queues",
    caption:
      "Route leave requests, expense claims, and payment vouchers through line managers and finance with timestamped records.",
    screenshot: "/screenshots/12-approvals-dark.png",
    alt: "Stanforte Edge approval queue in dark mode",
    themeLabel: "Dark",
  },
  {
    id: "procurement",
    label: "Procurement",
    title: "Vendor orders and budget checks",
    caption:
      "Compare vendor quotes against remaining departmental budgets before issuing purchase orders.",
    screenshot: "/screenshots/11-procurement.png",
    alt: "Stanforte Edge procurement and purchase orders screen in light mode",
    themeLabel: "Light",
  },
];

const PROOF_COLUMNS = [
  {
    metric: "100%",
    title: "Tenant-scoped data isolation",
    detail:
      "Every organization operates inside its own isolated records, role permissions, and approval hierarchy.",
  },
  {
    metric: "4 tiers",
    title: "Configurable sign-off chains",
    detail:
      "Require line manager, budget holder, finance, and executive approval based on transaction amount.",
  },
  {
    metric: "PAYE + PFA",
    title: "Nigerian statutory schedules",
    detail:
      "Generate monthly tax, pension, NHF, and bank disbursement files directly from approved payroll runs.",
  },
  {
    metric: "Immutable",
    title: "Timestamped audit trail",
    detail:
      "Every voucher sign-off, salary adjustment, and role change records who acted and when.",
  },
];

function triggerCsvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("overview");
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [headcount, setHeadcount] = useState(85);
  const [voucherState, setVoucherState] = useState<"pending" | "approved" | "returned">("pending");
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const currentShowcase =
    SHOWCASE_TABS.find((item) => item.id === activeTab) ?? SHOWCASE_TABS[0];

  // Quiet ROI calculation grounded in realistic payroll + attendance + voucher hours
  const hoursSavedPerMonth = Math.round(headcount * 0.45 + 12);
  const spreadsheetErrorExposure = Math.max(2, Math.round(headcount * 0.06));
  const manualBaselineHours = Math.round(hoursSavedPerMonth * 1.35);

  useEffect(() => {
    if (!videoModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVideoModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoModalOpen]);

  const handleSampleDownload = () => {
    if (!currentShowcase.csvAction) return;
    triggerCsvDownload(currentShowcase.csvAction.filename, currentShowcase.csvAction.content);
    setDownloadNotice(`Downloaded ${currentShowcase.csvAction.filename}`);
    window.setTimeout(() => setDownloadNotice(null), 3500);
  };

  return (
    <PublicLayout activePath="/">
      <div
        className="bg-[#FAFAFA] text-[#0F172A]"
        style={{ fontFamily: "var(--font-quiet-body)" }}
      >
        {/* ================================================================ */}
        {/* 1. HERO + CENTER PRODUCT SHOWCASE (Product Demo + Features)      */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-6">
          {/* Accent Usage #1 of 3: Subtle ambient hero light wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[760px] h-[320px] rounded-full opacity-[0.07]"
            style={{
              background:
                "radial-gradient(ellipse at center, #C2410C 0%, rgba(194, 65, 12, 0) 70%)",
            }}
          />

          <div className="relative max-w-5xl mx-auto">
            {/* Editorial Hero Copy (No eyebrow badge above H1) */}
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1
                className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] text-balance"
                style={{ fontFamily: "var(--font-quiet-display)" }}
              >
                {/* Accent Usage #2 of 3: One emphasized headline word */}
                Run staff records,{" "}
                <span className="text-[#C2410C]">payroll</span>, and approvals in
                one place.
              </h1>

              <p className="text-[16px] sm:text-[18px] text-[#475569] leading-[1.6] max-w-[60ch] mx-auto">
                Built for multi-campus teams handling monthly PAYE and pension
                schedules, daily attendance, and internal purchase sign-offs
                without spreadsheets.
              </p>

              {/* Primary + Secondary Actions (min 44x44px hit targets) */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                {/* Accent Usage #3 of 3: Primary CTA button */}
                <Link
                  to="/register"
                  className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg bg-[#C2410C] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,transform,box-shadow] duration-150 hover:bg-[#9A3412] hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  <span>Create a workspace</span>
                  <ArrowRight className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  onClick={() => setVideoModalOpen(true)}
                  className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,border-color,transform] duration-150 hover:bg-[#F1F5F9] hover:border-[#94A3B8] hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  <Play className="h-[16px] w-[16px] shrink-0 text-[#0F172A]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Watch walkthrough</span>
                </button>
              </div>
            </div>

            {/* Live Product Showcase */}
            <div className="mt-14 space-y-6">
              {/* Quiet Horizontal Module Switcher (No identical icon-tile grid) */}
              <div
                role="tablist"
                aria-label="Workspace modules"
                className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2"
              >
                {SHOWCASE_TABS.map((tab) => {
                  const isSelected = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      type="button"
                      aria-selected={isSelected}
                      aria-controls={`panel-${tab.id}`}
                      id={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-[14px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] ${
                        isSelected
                          ? "bg-[#0F172A] text-white"
                          : "bg-transparent text-[#475569] hover:bg-[#E2E8F0]/70 hover:text-[#0F172A]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Single-Elevation Product Frame (Crisp 1px border, zero glassmorphism overlays) */}
              <div
                id={`panel-${currentShowcase.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${currentShowcase.id}`}
                className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
              >
                <div className="bg-[#0F172A]">
                  <img
                    src={currentShowcase.screenshot}
                    alt={currentShowcase.alt}
                    width={1280}
                    height={800}
                    decoding="async"
                    className="w-full h-auto block aspect-[16/10] object-cover object-top"
                  />
                </div>

                <div className="px-6 py-5 bg-white border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1 max-w-[65ch]">
                    <div className="flex items-center gap-3">
                      <h2
                        className="text-[18px] font-semibold text-[#0F172A] leading-[1.3]"
                        style={{ fontFamily: "var(--font-quiet-display)" }}
                      >
                        {currentShowcase.title}
                      </h2>
                      <span className="text-[13px] font-medium text-[#475569]">
                        {currentShowcase.themeLabel} view
                      </span>
                    </div>
                    <p className="text-[15px] text-[#475569] leading-[1.5]">
                      {currentShowcase.caption}
                    </p>
                  </div>

                  {currentShowcase.csvAction && (
                    <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleSampleDownload}
                        className="min-h-[44px] px-4 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] text-[14px] font-medium inline-flex items-center gap-2 transition-colors duration-150 hover:bg-[#F1F5F9] hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                      >
                        <Download className="h-[16px] w-[16px]" strokeWidth={1.75} aria-hidden="true" />
                        <span>{currentShowcase.csvAction.label}</span>
                      </button>
                      {downloadNotice && (
                        <span
                          role="status"
                          className="text-[13px] font-medium text-[#15803D]"
                        >
                          {downloadNotice}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 2. EDITORIAL FEATURE ROWS (Alternating 2-col, no 3-card hero)    */}
        {/* ================================================================ */}
        <section className="py-20 sm:py-24 px-6 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto space-y-24">
            {/* Row 1: Payroll */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-5 space-y-5">
                <h2
                  className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] leading-[1.2] tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-quiet-display)" }}
                >
                  Payroll schedules ready for bank upload
                </h2>
                <p className="text-[16px] text-[#475569] leading-[1.6]">
                  Stop rebuilding tax formulas in spreadsheets every month. Run
                  gross-to-net calculations across every branch, verify
                  statutory deductions, and export files formatted for your
                  corporate bank portal.
                </p>
                <ul className="space-y-3 pt-1 text-[15px] text-[#0F172A]">
                  <li className="flex items-start gap-3">
                    <Check
                      className="h-[18px] w-[18px] mt-1 shrink-0 text-[#15803D]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>Automatic PAYE, PenCom, NHF, and NSITF schedules</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check
                      className="h-[18px] w-[18px] mt-1 shrink-0 text-[#15803D]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>Employee self-service payslips published after sign-off</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check
                      className="h-[18px] w-[18px] mt-1 shrink-0 text-[#15803D]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>Month-over-month variance checks before disbursement</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] overflow-hidden">
                  <img
                    src="/screenshots/04-payroll-light.png"
                    alt="Payroll calculation table with PAYE and pension columns in light mode"
                    width={1280}
                    height={800}
                    loading="lazy"
                    className="w-full h-auto block aspect-[16/10] object-cover object-top"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Approvals & Payment Vouchers */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] overflow-hidden">
                  <img
                    src="/screenshots/03-payment-vouchers.png"
                    alt="Payment vouchers queue showing approval tiers and budget verification"
                    width={1280}
                    height={800}
                    loading="lazy"
                    className="w-full h-auto block aspect-[16/10] object-cover object-top"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
                <h2
                  className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] leading-[1.2] tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-quiet-display)" }}
                >
                  Purchase and leave approvals with a clear audit trail
                </h2>
                <p className="text-[16px] text-[#475569] leading-[1.6]">
                  Replace scattered email threads and paper folders. Every
                  payment voucher checks remaining departmental budget and
                  routes to the right approver automatically.
                </p>

                {/* Interactive Approval State Demo (No nested cards, semantic colors only) */}
                <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[15px] font-semibold text-[#0F172A]">
                        PV-2026-084 · Generator Servicing
                      </div>
                      <div
                        className="text-[13px] text-[#475569]"
                        style={{
                          fontFamily: "var(--font-quiet-mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        NGN 420,000 · Facilities Budget
                      </div>
                    </div>
                    <span
                      className={`text-[13px] font-semibold ${
                        voucherState === "approved"
                          ? "text-[#15803D]"
                          : voucherState === "returned"
                          ? "text-[#B91C1C]"
                          : "text-[#475569]"
                      }`}
                    >
                      {voucherState === "approved"
                        ? "Approved"
                        : voucherState === "returned"
                        ? "Returned"
                        : "Pending sign-off"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVoucherState("approved")}
                      disabled={voucherState === "approved"}
                      className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0F172A] text-white text-[14px] font-medium transition-colors duration-150 hover:bg-[#1E293B] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                    >
                      Approve voucher
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoucherState("returned")}
                      disabled={voucherState === "returned"}
                      className="min-h-[44px] px-4 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] text-[14px] font-medium transition-colors duration-150 hover:bg-[#F1F5F9] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                    >
                      Return for edit
                    </button>
                    {voucherState !== "pending" && (
                      <button
                        type="button"
                        onClick={() => setVoucherState("pending")}
                        className="min-h-[44px] px-3 py-2 rounded-lg text-[14px] font-medium text-[#475569] inline-flex items-center gap-1.5 hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                      >
                        <RotateCcw className="h-[15px] w-[15px]" strokeWidth={1.75} aria-hidden="true" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 3. TIME-SAVED ESTIMATOR (One Hero Number Per Screen)             */}
        {/* ================================================================ */}
        <section className="py-20 sm:py-24 px-6 bg-[#FAFAFA] border-t border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <h2
                className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] leading-[1.2] tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-quiet-display)" }}
              >
                Estimate the hours your team saves each month
              </h2>
              <p className="text-[16px] text-[#475569] leading-[1.6]">
                Adjust the team size below to see how much manual reconciliation
                time HR and finance recover across payroll, attendance, and
                voucher approvals.
              </p>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-[15px]">
                  <label htmlFor="team-headcount-slider" className="font-medium text-[#0F172A]">
                    Active staff on payroll
                  </label>
                  <span
                    className="font-semibold text-[#0F172A]"
                    style={{
                      fontFamily: "var(--font-quiet-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {headcount} employees
                  </span>
                </div>

                <input
                  id="team-headcount-slider"
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={headcount}
                  onChange={(e) => setHeadcount(Number(e.target.value))}
                  className="w-full h-11 accent-[#0F172A] cursor-pointer"
                />

                <div className="flex justify-between text-[13px] text-[#475569]">
                  <span>10 staff</span>
                  <span>250 staff</span>
                  <span>500 staff</span>
                </div>
              </div>
            </div>

            {/* Single Hero Number + Semantic Breakdown */}
            <div className="lg:col-span-6 rounded-xl border border-[#E2E8F0] bg-white p-8 space-y-6">
              <div>
                <div
                  className="text-[48px] font-semibold text-[#0F172A] leading-none tracking-[-0.02em]"
                  style={{
                    fontFamily: "var(--font-quiet-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {hoursSavedPerMonth} hrs
                </div>
                <div className="mt-2 text-[13px] font-medium text-[#475569] tracking-[0.01em]">
                  Estimated HR &amp; finance hours recovered every month
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#E2E8F0]">
                <div>
                  <div
                    className="text-[20px] font-semibold text-[#15803D]"
                    style={{
                      fontFamily: "var(--font-quiet-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    -{Math.round((hoursSavedPerMonth / manualBaselineHours) * 100)}%
                  </div>
                  <div className="mt-1 text-[13px] text-[#475569]">
                    Payroll prep time
                  </div>
                </div>

                <div>
                  <div
                    className="text-[20px] font-semibold text-[#B91C1C]"
                    style={{
                      fontFamily: "var(--font-quiet-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {spreadsheetErrorExposure} / mo
                  </div>
                  <div className="mt-1 text-[13px] text-[#475569]">
                    Manual formula risks avoided
                  </div>
                </div>

                <div>
                  <div
                    className="text-[20px] font-semibold text-[#475569]"
                    style={{
                      fontFamily: "var(--font-quiet-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {manualBaselineHours} hrs
                  </div>
                  <div className="mt-1 text-[13px] text-[#475569]">
                    Typical spreadsheet baseline
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 4. OPERATIONAL PROOF STRIP (Typographic hairline grid)           */}
        {/* ================================================================ */}
        <section className="py-20 px-6 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {PROOF_COLUMNS.map((item) => (
                <div
                  key={item.title}
                  className="pt-5 border-t border-[#E2E8F0] space-y-2"
                >
                  <div
                    className="text-[22px] font-semibold text-[#0F172A]"
                    style={{
                      fontFamily: "var(--font-quiet-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.metric}
                  </div>
                  <h3
                    className="text-[18px] font-semibold text-[#0F172A] leading-[1.3]"
                    style={{ fontFamily: "var(--font-quiet-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-[#475569] leading-[1.55]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 5. FINAL CTA BAND (Quiet high-contrast dark slate)               */}
        {/* ================================================================ */}
        <section className="py-20 px-6 bg-[#FAFAFA] border-t border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto rounded-xl bg-[#0F172A] text-[#F8FAFC] p-8 sm:p-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2
                className="text-[26px] sm:text-[32px] font-semibold leading-[1.2] tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-quiet-display)" }}
              >
                Ready to move off spreadsheets?
              </h2>
              <p className="text-[16px] text-[#CBD5E1] leading-[1.6]">
                Set up your organization, invite department heads, and run your
                first payroll cycle in one afternoon.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link
                to="/register"
                className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg bg-[#C2410C] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 hover:bg-[#9A3412] hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span>Create a workspace</span>
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg border border-[#334155] bg-transparent text-[#F8FAFC] text-[15px] font-semibold inline-flex items-center justify-center transition-colors duration-150 hover:bg-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Talk to our team
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* ACCESSIBLE WALKTHROUGH VIDEO MODAL                               */}
        {/* ================================================================ */}
        {videoModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkthrough-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setVideoModalOpen(false);
            }}
          >
            <div className="bg-white rounded-xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-[#E2E8F0] relative">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3
                    id="walkthrough-modal-title"
                    className="text-[20px] font-semibold text-[#0F172A] leading-[1.3]"
                    style={{ fontFamily: "var(--font-quiet-display)" }}
                  >
                    Stanforte Edge workspace walkthrough
                  </h3>
                  <p className="text-[15px] text-[#475569]">
                    A direct look at staff records, PAYE payroll runs, attendance
                    logs, and payment voucher approvals.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close walkthrough modal"
                  onClick={() => setVideoModalOpen(false)}
                  className="min-h-[44px] min-w-[44px] rounded-lg border border-[#E2E8F0] text-[#0F172A] inline-flex items-center justify-center hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
                <video
                  controls
                  playsInline
                  poster="/screenshots/01-dashboard-dark.png"
                  className="w-full aspect-video block"
                >
                  <source src="/video-frames/portal-showcase.mp4" type="video/mp4" />
                  Your browser does not support video playback. You can inspect
                  every module directly in the interactive screenshots on the
                  page.
                </video>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
                <Link
                  to="/contact"
                  onClick={() => setVideoModalOpen(false)}
                  className="min-h-[44px] px-2 text-[14px] font-medium text-[#475569] inline-flex items-center hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  Book a live Q&amp;A with our team
                </Link>
                <Link
                  to="/register"
                  onClick={() => setVideoModalOpen(false)}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#C2410C] text-white text-[14px] font-semibold inline-flex items-center gap-2 transition-colors duration-150 hover:bg-[#9A3412] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  <span>Create a workspace</span>
                  <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
