import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";
import {
  Shield,
  Lock,
  Key,
  FileText,
  Database,
  Server,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function SecurityPage() {
  const pillars = [
    {
      title: "Tenant Data Isolation",
      subtitle: "Database Partitioning",
      icon: Database,
      iconColor: "text-blue-600 bg-blue-50",
      description: "Every organization operates within an isolated tenant context. PostgreSQL row-level security policies ensure that database queries are strictly scoped to the authenticated tenant, preventing any cross-tenant data exposure.",
    },
    {
      title: "Encrypted Data Transmission & Storage",
      subtitle: "TLS 1.3 & AES-256",
      icon: Lock,
      iconColor: "text-[#ff6900] bg-orange-50",
      description: "All web and mobile traffic is encrypted in transit using industry-standard TLS 1.3. Stored database records, sensitive payroll figures, and document attachments are protected with AES-256 encryption at rest.",
    },
    {
      title: "Role-Based Access Governance",
      subtitle: "Granular RBAC",
      icon: Key,
      iconColor: "text-amber-600 bg-amber-50",
      description: "Fine-grained permission matrices determine exactly what each staff member, department head, HR officer, or finance administrator can view, edit, or approve. Administrative privileges are strictly compartmentalized.",
    },
    {
      title: "Tamper-Evident Audit Trails",
      subtitle: "Regulatory Accountability",
      icon: FileText,
      iconColor: "text-purple-600 bg-purple-50",
      description: "Critical events—such as payroll batch approvals, employee profile alterations, permission changes, and expenditure approvals—are permanently recorded with timestamped user attribution for internal and external auditors.",
    },
    {
      title: "Secure Session Architecture",
      subtitle: "HttpOnly Cookie Security",
      icon: Shield,
      iconColor: "text-emerald-600 bg-emerald-50",
      description: "Authentication tokens are delivered via encrypted, HttpOnly cookies with SameSite strict protection, guarding your organization against client-side cross-site scripting (XSS) and credential theft.",
    },
    {
      title: "Automated Backups & Continuity",
      subtitle: "Disaster Recovery",
      icon: Server,
      iconColor: "text-indigo-600 bg-indigo-50",
      description: "Continuous database snapshots and point-in-time recovery ensure your employee records and financial data remain protected against hardware failures and data corruption.",
    },
  ];

  return (
    <PublicLayout activePath="/security">
      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-4">
        <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
          Institutional Security & Data Isolation
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-headline">
          Security and Compliance <br className="hidden sm:inline" />
          <span className="text-[#ff6900]">by Design</span>
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          We protect sensitive personnel records, salary schedules, and operational workflows with rigorous security architecture and governance standards.
        </p>
      </section>

      {/* Security Pillars Grid */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-2xs hover:border-slate-200/80 transition-all space-y-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pillar.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {pillar.subtitle}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compliance Standards Notice */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="p-8 rounded-3xl border border-slate-100 bg-white shadow-2xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ff6900]">
              Regulatory Alignment
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-headline">
              Data Privacy & Statutory Governance
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stanforte Edge is engineered in alignment with national and regional data privacy standards, including the Nigeria Data Protection Act (NDPA / NDPR) and international data governance best practices. We never monetize, sell, or share organizational personnel or financial data with third-party advertisers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#ff6900] shrink-0" />
                <span>ISO 27001-certified hosting</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#ff6900] shrink-0" />
                <span>Full data portability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#ff6900] shrink-0" />
                <span>Mandatory administrative 2FA</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Provision Secure Workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
