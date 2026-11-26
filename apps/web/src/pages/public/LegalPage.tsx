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
    badge: string;
    title: string;
    updated: string;
    intro: string;
    sections: LegalSection[];
  }
> = {
  privacy: {
    badge: "Legal & Data Protection",
    title: "Privacy Policy",
    updated: "Last updated: November 2026",
    intro:
      "Stanforte Edge Limited is committed to protecting organizational and employee data processed within the Stanforte Edge Portal in accordance with the Nigeria Data Protection Act (NDPA) and international security standards.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "We process account registration details (name, work email, organization workspace), HR and payroll records uploaded by your organization administrator, attendance timestamps, and security audit logs necessary to deliver portal services.",
      },
      {
        heading: "2. Multi-Tenant Data Isolation",
        body: "Each organization workspace operates under strict tenant isolation. Data belonging to your workspace is logically segregated and accessible only to authorized members with valid role-based permissions.",
      },
      {
        heading: "3. Security & Encryption",
        body: "All traffic is encrypted in transit via TLS, passwords are hashed with bcrypt, session tokens are stored in httpOnly cookies with strict CSRF protections, and sensitive credentials are encrypted at rest.",
      },
      {
        heading: "4. Data Retention & Access Rights",
        body: "Workspace administrators may export or request deletion of tenant data at any time. Staff members may contact their organization administrator or privacy@stanforteedge.com to exercise data access or correction rights.",
      },
    ],
  },
  terms: {
    badge: "Legal & Acceptable Use",
    title: "Terms of Service",
    updated: "Last updated: November 2026",
    intro:
      "These Terms of Service govern your organization's access to and use of the Stanforte Edge Portal software, APIs, and related workforce and finance administration services.",
    sections: [
      {
        heading: "1. Workspace Accounts & Eligibility",
        body: "You must register with an accurate, non-disposable business or personal email address and maintain the confidentiality of your login credentials. Workspace owners are responsible for managing user roles and permissions within their tenant.",
      },
      {
        heading: "2. Acceptable Use",
        body: "You agree not to misuse the platform, attempt unauthorized access to other tenants, bypass rate limits or security controls, or upload unlawful or malicious content.",
      },
      {
        heading: "3. Subscriptions & Billing",
        body: "Paid subscription plans are billed according to the selected tier and billing interval. Organizations may upgrade, downgrade, or cancel subscriptions according to their active billing cycle.",
      },
      {
        heading: "4. Service Availability & Support",
        body: "We strive to maintain high availability and regular backups. For support, security disclosures, or enterprise SLA inquiries, contact support@stanforteedge.com.",
      },
    ],
  },
};

export default function LegalPage({ doc }: { doc: LegalDocKey }) {
  const content = LEGAL_CONTENT[doc];
  const otherDoc: LegalDocKey = doc === "privacy" ? "terms" : "privacy";

  return (
    <PublicLayout activePath={`/${doc}`}>
      <article className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3 border-b border-neutral-200/80 pb-8">
          <div className="text-xs font-medium text-[#ff6900]">
            {content.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight font-headline">
            {content.title}
          </h1>
          <p className="text-xs text-neutral-500">{content.updated}</p>
          <p className="text-sm text-neutral-600 leading-relaxed pt-2">
            {content.intro}
          </p>
        </header>

        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold text-neutral-900">
                {section.heading}
              </h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="pt-8 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
          <Link
            to={`/${otherDoc}`}
            className="font-medium text-[#ff6900] hover:underline"
          >
            Read {LEGAL_CONTENT[otherDoc].title}
          </Link>
          <Link
            to="/register"
            className="font-medium text-neutral-700 hover:text-neutral-900"
          >
            Return to Registration
          </Link>
        </footer>
      </article>
    </PublicLayout>
  );
}
