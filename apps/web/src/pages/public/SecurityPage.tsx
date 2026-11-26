import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";
import { ArrowRight, Check } from "lucide-react";

const SECURITY_PILLARS = [
  {
    label: "Data Isolation",
    title: "Tenant-scoped database context",
    description:
      "Every organization runs inside a strictly scoped tenant context. Queries filter by the authenticated organization so records never cross workspace boundaries.",
  },
  {
    label: "Encryption",
    title: "TLS 1.3 in transit and AES-256 at rest",
    description:
      "Web and API traffic is enforced over HTTPS with HSTS. Stored database volumes, payroll figures, and file attachments are encrypted at rest.",
  },
  {
    label: "Access Control",
    title: "Role-based permissions",
    description:
      "Granular permissions define exactly what each employee, department lead, HR manager, or finance officer can view, edit, or approve.",
  },
  {
    label: "Accountability",
    title: "Timestamped audit logs",
    description:
      "Payroll approvals, permission updates, voucher sign-offs, and failed login spikes are recorded with user attribution for internal and external audits.",
  },
  {
    label: "Sessions",
    title: "HttpOnly cookies and CSRF defense",
    description:
      "Session tokens live in HttpOnly, SameSite cookies with atomic refresh rotation and Origin validation on state-changing requests.",
  },
  {
    label: "Continuity",
    title: "Automated backups and recovery",
    description:
      "Scheduled PostgreSQL snapshots and point-in-time recovery protect personnel records and financial ledgers against hardware failure.",
  },
];

export default function SecurityPage() {
  return (
    <PublicLayout activePath="/security">
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        {/* Header */}
        <section className="pt-16 pb-14 sm:pt-20 px-6 text-center max-w-4xl mx-auto space-y-5">
          <h1 className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] font-headline">
            How we protect your <span className="text-[#C2410C]">security</span> and payroll data.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#475569] max-w-[60ch] mx-auto leading-[1.6]">
            Personnel records, salary schedules, and approval histories are guarded by strict tenant isolation, audited sessions, and least-privilege access.
          </p>
        </section>

        {/* Pillars Hairline Grid (No identical icon-tile boxes) */}
        <section className="px-6 max-w-5xl mx-auto pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {SECURITY_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="pt-5 border-t border-[#E2E8F0] space-y-2"
              >
                <div className="text-[13px] font-medium text-[#475569] font-mono">
                  {pillar.label}
                </div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] leading-[1.3] font-headline">
                  {pillar.title}
                </h2>
                <p className="text-[15px] text-[#475569] leading-[1.6]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance & Disclosure */}
        <section className="border-t border-[#E2E8F0] bg-white py-20 px-6">
          <div className="max-w-4xl mx-auto rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] p-8 sm:p-10 space-y-6">
            <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] leading-[1.2] font-headline">
              Data privacy and statutory alignment
            </h2>
            <p className="text-[16px] text-[#475569] leading-[1.6]">
              Stanforte Edge is built to align with the Nigeria Data Protection Act (NDPA) and enterprise governance requirements. We never sell or share customer personnel or financial records with third parties.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-[15px] text-[#0F172A]">
              {[
                "NDPA aligned processing",
                "Strict file-upload validation",
                "Responsible disclosure channel",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="h-[18px] w-[18px] text-[#15803D] shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/contact"
                className="min-h-[44px] px-5 py-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Report a security issue</span>
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                to="/privacy"
                className="min-h-[44px] px-5 py-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-[15px] font-semibold inline-flex items-center transition-colors"
              >
                Read privacy policy
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
