import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";
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
      description: "Every organization operates within an isolated tenant context. PostgreSQL row-level security policies ensure that database queries are strictly scoped to the authenticated tenant, preventing any cross-tenant data exposure.",
    },
    {
      title: "Encrypted Data Transmission & Storage",
      subtitle: "TLS 1.3 & AES-256",
      icon: Lock,
      description: "All web and mobile traffic is encrypted in transit using industry-standard TLS 1.3. Stored database records, sensitive payroll figures, and document attachments are protected with AES-256 encryption at rest.",
    },
    {
      title: "Role-Based Access Governance",
      subtitle: "Granular RBAC",
      icon: Key,
      description: "Fine-grained permission matrices determine exactly what each staff member, department head, HR officer, or finance administrator can view, edit, or approve. Administrative privileges are strictly compartmentalized.",
    },
    {
      title: "Tamper-Evident Audit Trails",
      subtitle: "Regulatory Accountability",
      icon: FileText,
      description: "Critical events—such as payroll batch approvals, employee profile alterations, permission changes, and expenditure approvals—are permanently recorded with timestamped user attribution for internal and external auditors.",
    },
    {
      title: "Secure Session Architecture",
      subtitle: "HttpOnly Cookie Security",
      icon: Shield,
      description: "Authentication tokens are delivered via encrypted, HttpOnly cookies with SameSite strict protection, guarding your organization against client-side cross-site scripting (XSS) and credential theft.",
    },
    {
      title: "Automated Backups & Continuity",
      subtitle: "Disaster Recovery",
      icon: Server,
      description: "Continuous database snapshots and point-in-time recovery ensure your employee records and financial data remain protected against hardware failures and data corruption.",
    },
  ];

  return (
    <PublicLayout activePath="/security">
      {/* Header */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-4">
        <Badge variant="outline" className="px-3 py-1 font-semibold text-xs tracking-wide">
          Institutional Security
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-headline">
          Security and compliance by design
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          We protect sensitive personnel records, salary schedules, and operational workflows with rigorous security architecture and governance standards.
        </p>
      </section>

      {/* Security Pillars Grid with shadcn Card */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-900 mb-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {pillar.subtitle}
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-1">
                    {pillar.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-slate-600 leading-relaxed">
                    {pillar.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Compliance Standards Notice with shadcn Card */}
      <section className="border-t border-slate-200 bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="p-8">
            <Badge variant="outline" className="mb-3">
              Regulatory Alignment
            </Badge>
            <h2 className="text-xl font-bold text-slate-900 font-headline mb-3">
              Data Privacy & Statutory Governance
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Stanforte Edge is engineered in alignment with national and regional data privacy standards, including the Nigeria Data Protection Act (NDPA / NDPR) and international data governance best practices. We never monetize, sell, or share organizational personnel or financial data with third-party advertisers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>ISO 27001-certified hosting</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Full data portability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Mandatory administrative 2FA</span>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <Button asChild size="lg">
              <Link to="/register" className="flex items-center gap-2">
                Provision Secure Workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
