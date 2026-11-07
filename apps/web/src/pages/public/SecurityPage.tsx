import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";

export default function SecurityPage() {
  const pillars = [
    {
      title: "Tenant Data Isolation",
      subtitle: "Database Partitioning",
      description: "Every organization operates within an isolated tenant context. PostgreSQL row-level security policies ensure that database queries are strictly scoped to the authenticated tenant, preventing any cross-tenant data exposure.",
    },
    {
      title: "Encrypted Data Transmission & Storage",
      subtitle: "TLS 1.3 & AES-256",
      description: "All web and mobile traffic is encrypted in transit using industry-standard TLS 1.3. Stored database records, sensitive payroll figures, and document attachments are protected with AES-256 encryption at rest.",
    },
    {
      title: "Role-Based Access Governance",
      subtitle: "Granular RBAC",
      description: "Fine-grained permission matrices determine exactly what each staff member, department head, HR officer, or finance administrator can view, edit, or approve. Administrative privileges are strictly compartmentalized.",
    },
    {
      title: "Tamper-Evident Audit Trails",
      subtitle: "Regulatory Accountability",
      description: "Critical events—such as payroll batch approvals, employee profile alterations, permission changes, and expenditure approvals—are permanently recorded with timestamped user attribution for internal and external auditors.",
    },
    {
      title: "Secure Session Architecture",
      subtitle: "HttpOnly Cookie Security",
      description: "Authentication tokens are delivered via encrypted, HttpOnly cookies with SameSite strict protection, guarding your organization against client-side cross-site scripting (XSS) and credential theft.",
    },
    {
      title: "Automated Backups & Continuity",
      subtitle: "Disaster Recovery",
      description: "Continuous database snapshots and point-in-time recovery ensure your employee records and financial data remain protected against hardware failures and data corruption.",
    },
  ];

  return (
    <PublicLayout activePath="/security">
      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-6">
          Institutional Security
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Security and compliance by design
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          We protect sensitive personnel records, salary schedules, and operational workflows with rigorous security architecture and governance standards.
        </p>
      </section>

      {/* Security Pillars Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <div key={idx} className="p-6 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {pillar.subtitle}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1 mb-2">
                {pillar.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Standards Notice */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="border border-slate-200 rounded-xl bg-white p-8">
            <h2 className="text-lg font-bold text-slate-900 font-headline mb-3">
              Data Privacy & Statutory Governance
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Stanforte Edge is engineered in alignment with national and regional data privacy standards, including the Nigeria Data Protection Act (NDPA / NDPR) and international data governance best practices. We never monetize, sell, or share organizational personnel or financial data with third-party advertisers.
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>&bull; Data retained on ISO 27001-certified infrastructure</span>
              <span>&bull; Full employee data portability upon request</span>
              <span>&bull; Mandatory administrative multi-factor support</span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/register"
              className="px-6 py-3 rounded-md font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Provision Secure Workspace
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
