import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";

type LegalDocKey = "privacy" | "terms";

interface LegalSection {
  heading: string;
  body: string;
}

const LEGAL_CONTENT: Record<
  LegalDocKey,
  {
    title: string;
    updated: string;
    intro: string;
    sections: LegalSection[];
  }
> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: November 2026",
    intro:
      "Stanforte Edge Limited protects organizational and employee data processed within the Stanforte Edge Portal in accordance with the Nigeria Data Protection Act (NDPA) and enterprise security standards.",
    sections: [
      {
        heading: "1. Information we collect",
        body: "We process account registration details (name, work email, organization workspace), HR and payroll records uploaded by your organization administrator, attendance timestamps, and security audit logs required to operate the portal.",
      },
      {
        heading: "2. Multi-tenant data isolation",
        body: "Each organization workspace operates inside strict tenant isolation. Data belonging to your workspace is logically segregated and accessible only to authorized members with valid role-based permissions.",
      },
      {
        heading: "3. Security and encryption",
        body: "Traffic is encrypted in transit via TLS, passwords are hashed with strong salting, session tokens are stored in HttpOnly cookies with CSRF protections, and sensitive credentials are encrypted at rest.",
      },
      {
        heading: "4. Data retention and access rights",
        body: "Workspace administrators may export or request deletion of tenant data at any time. Staff members may contact their administrator or privacy@stanforteedge.com to exercise data access or correction rights.",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: November 2026",
    intro:
      "These Terms of Service govern your organization's access to and use of the Stanforte Edge Portal software, APIs, and workforce and finance administration services.",
    sections: [
      {
        heading: "1. Workspace accounts and eligibility",
        body: "You must register with an accurate, non-disposable work or personal email address and protect your login credentials. Workspace owners are responsible for managing user roles and permissions inside their tenant.",
      },
      {
        heading: "2. Acceptable use",
        body: "You agree not to misuse the platform, attempt unauthorized access to other tenants, bypass rate limits or security controls, or upload unlawful or malicious files.",
      },
      {
        heading: "3. Subscriptions and billing",
        body: "Paid subscription plans are billed according to the selected tier and interval. Organizations may upgrade, downgrade, or cancel subscriptions according to their billing cycle.",
      },
      {
        heading: "4. Service availability and support",
        body: "We maintain automated backups and active monitoring. For support, security disclosures, or enterprise SLA inquiries, contact support@stanforteedge.com.",
      },
    ],
  },
};

export default function LegalPage({ doc }: { doc: LegalDocKey }) {
  const content = LEGAL_CONTENT[doc];
  const otherDoc: LegalDocKey = doc === "privacy" ? "terms" : "privacy";

  return (
    <PublicLayout activePath={`/${doc}`}>
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        <article className="max-w-3xl mx-auto px-6 py-16 sm:py-20 space-y-10">
          <header className="space-y-3 border-b border-[#E2E8F0] pb-8">
            <h1 className="text-[34px] sm:text-[42px] font-semibold text-[#0F172A] leading-[1.15] tracking-[-0.015em] font-headline">
              {content.title}
            </h1>
            <p className="text-[13px] font-medium text-[#475569] font-mono">
              {content.updated}
            </p>
            <p className="text-[16px] text-[#475569] leading-[1.65] pt-2">
              {content.intro}
            </p>
          </header>

          <div className="space-y-8">
            {content.sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h2 className="text-[20px] font-semibold text-[#0F172A] leading-[1.3] font-headline">
                  {section.heading}
                </h2>
                <p className="text-[16px] text-[#475569] leading-[1.65]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <footer className="pt-8 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
            <Link
              to={`/${otherDoc}`}
              className="min-h-[44px] inline-flex items-center text-[15px] font-semibold text-[#0F172A] hover:text-[#C2410C] transition-colors"
            >
              Read {otherDoc === "privacy" ? "Privacy Policy" : "Terms of Service"}
            </Link>
            <Link
              to="/register"
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[14px] font-semibold inline-flex items-center transition-colors"
            >
              Create a workspace
            </Link>
          </footer>
        </article>
      </div>
    </PublicLayout>
  );
}
