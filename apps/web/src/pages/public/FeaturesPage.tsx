import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";

export default function FeaturesPage() {
  const modules = [
    {
      id: "tenancy",
      icon: "domain",
      title: "Workspace Multi-Tenancy",
      badge: "Core Platform",
      description: "Self-serve workspace registration with strict row-level PostgreSQL data isolation, custom domain branding, and sub-organization hierarchies.",
      bullets: ["Zero cross-tenant data leakage", "Automatic template cloning", "Custom theme branding"],
    },
    {
      id: "payroll",
      icon: "payments",
      title: "Automated Monthly Payroll",
      badge: "Finance & HR",
      description: "Complete end-to-end salary processing with automated PAYE tax tables, statutory pension calculations, loan repayments, and PDF payslip generation.",
      bullets: ["Statutory tax deductions (PAYE, NHF, Pension)", "Background BullMQ batch payslip email delivery", "Exportable bank disbursement CSVs"],
    },
    {
      id: "attendance",
      icon: "fingerprint",
      title: "GPS-Geofenced Attendance",
      badge: "People Operations",
      description: "Eliminate attendance fraud with polygon GPS geofencing around corporate offices, biometric reconciliation, and supervisor shift digests.",
      bullets: ["Multiple office coordinate perimeters", "Manager correction reviews", "Automated overtime & tardiness computation"],
    },
    {
      id: "finance",
      icon: "account_balance",
      title: "General Ledger & Chart of Accounts",
      badge: "Financial Accounting",
      description: "Full double-entry general ledger tracking corporate debits and credits, journal vouchers, vendor payments, and asset disposals.",
      bullets: ["Multi-tier chart of accounts (48+ ledgers)", "Real-time debit/credit reconciliation", "Audit trail with immutable timestamps"],
    },
    {
      id: "workflows",
      icon: "account_tree",
      title: "Dynamic Request Workflows",
      badge: "Operations",
      description: "Visual approval routing that directs leave, travel advances, and expense reimbursements through custom multi-tiered management hierarchies.",
      bullets: ["Configurable approval thresholds", "Line supervisor & finance clearances", "Email action token clearance"],
    },
    {
      id: "procurement",
      icon: "shopping_cart",
      title: "Procurement & B2B Vendor Portal",
      badge: "Supply Chain",
      description: "External vendor bidding portal allowing suppliers to submit quotations, track purchase orders, and confirm goods deliveries.",
      bullets: ["External vendor quotation bidding", "Automated PDF purchase order dispatch", "Supplier performance tiering"],
    },
    {
      id: "tasks",
      icon: "view_kanban",
      title: "Agile Kanban Tasks & Sprints",
      badge: "Productivity",
      description: "Manage corporate initiatives with agile sprint cycles, drag-and-drop Kanban boards, daily activity logs, and story point tracking.",
      bullets: ["Multi-project sprint boards", "Daily team activity logs", "Priority tags and milestone tracking"],
    },
    {
      id: "storage",
      icon: "cloud_upload",
      title: "Secure S3 Cloud Storage & Policies",
      badge: "Document Management",
      description: "Centralized corporate document repository partitioned by tenant on AWS S3 with employee e-acknowledgements and quota controls.",
      bullets: ["Tenant-partitioned S3 storage", "Mandatory policy acknowledgements", "Plan-based storage quota metering"],
    },
    {
      id: "mail",
      icon: "mail",
      title: "Integrated Webmail Client",
      badge: "Communications",
      description: "Full-featured webmail interface supporting background IMAP/SMTP synchronization, multi-account management, and thread rendering.",
      bullets: ["Background IMAP synchronization", "Cryptographic credential storage", "Attachments & rich HTML composing"],
    },
  ];

  return (
    <PublicLayout activePath="/features">
      {/* Header */}
      <section className="pt-20 pb-12 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          14 Integrated Suites
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Everything Your Enterprise Needs in One Unified Cloud
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          Replace disjointed tools with a unified suite. Manage people, money, workflows, and documents from a single, high-performance interface.
        </p>
      </section>

      {/* Modules Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((m) => (
            <div
              key={m.id}
              className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-blue-500/50 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">{m.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {m.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{m.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">{m.description}</p>

                <ul className="space-y-2 border-t border-slate-800/80 pt-4">
                  {m.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="material-symbols-outlined text-xs text-emerald-400">check</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Explore in Free Workspace <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}

