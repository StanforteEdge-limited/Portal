import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  FileText,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Users,
  Clock,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Workspace Setup & Onboarding",
    description:
      "Create your organization workspace, configure custom subdomain routing, and bulk-import staff records via CSV.",
    icon: Users,
  },
  {
    id: "payroll",
    title: "Payroll, PAYE & Statutory Deductions",
    description:
      "Configure salary components, Nigerian PAYE tax tables, PenCom pension schedules, and commercial bank export files.",
    icon: CreditCard,
  },
  {
    id: "attendance",
    title: "Attendance, Geofencing & Leave",
    description:
      "Set office GPS coordinates, manage daily clock-in rules, approve attendance corrections, and track leave balances.",
    icon: Clock,
  },
  {
    id: "documents",
    title: "Organizational Documents & Policies",
    description:
      "Upload company handbooks, SOPs, and HR policies, distribute them to staff, and track signed acknowledgements.",
    icon: FileText,
  },
  {
    id: "security",
    title: "Roles, Permissions & Audit Logs",
    description:
      "Assign least-privilege RBAC roles, enforce multi-tier approval routing, and inspect immutable tenant audit trails.",
    icon: ShieldCheck,
  },
  {
    id: "guides",
    title: "Procurement & Payment Vouchers",
    description:
      "Raise requisitions, issue vendor purchase orders, generate payment vouchers, and reconcile finance disbursements.",
    icon: BookOpen,
  },
];

const FAQS = [
  {
    id: "faq-1",
    question: "How do I create a new workspace for my organization?",
    answer:
      "Click 'Create Free Workspace' to register with your work email and choose a workspace subdomain (for example, yourcompany.stanforteedge.com). Verify your email address to activate administrator access.",
  },
  {
    id: "faq-2",
    question: "Can I bulk-import existing employees and salary structures?",
    answer:
      "Yes. From Administration > Users > Bulk Import, download the CSV template, populate staff details, departments, and roles, and upload to onboard dozens or hundreds of employees in one pass.",
  },
  {
    id: "faq-3",
    question: "How do multi-tier payment and expense approvals work?",
    answer:
      "Administrators configure approval stages per request type under System Settings > Request Types. When staff submit a payment or procurement request, it automatically routes through department leads and finance before disbursement.",
  },
  {
    id: "faq-4",
    question: "How are company documents and policy sign-offs tracked?",
    answer:
      "Upload handbooks and policies in the Documents & Policies hub and enable acknowledgement tracking. Staff receive notifications and their timestamped sign-offs are recorded for compliance audits.",
  },
  {
    id: "faq-5",
    question: "How do I contact technical support or schedule an enterprise walkthrough?",
    answer:
      "Email support@stanforteedge.com for technical assistance or sales@stanforteedge.com for dedicated multi-entity onboarding and custom SLA plans.",
  },
];

export default function PublicHelpPage() {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredCategories = q
    ? HELP_CATEGORIES.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
    : HELP_CATEGORIES;

  const filteredFaqs = q
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q),
      )
    : FAQS;

  return (
    <PublicLayout activePath="/help">
      {/* Header & Search */}
      <section className="pt-16 pb-12 px-6 text-center max-w-4xl mx-auto space-y-5">
        <div className="text-xs font-medium text-[#ff6900]">
          Help Center & Documentation
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold text-neutral-900 tracking-tight font-headline">
          How can we help your <span className="text-[#ff6900]">team?</span>
        </h1>
        <p className="text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Guides for workspace setup, Nigerian statutory payroll, multi-tier
          approvals, and organizational document management.
        </p>

        <div className="max-w-lg mx-auto pt-2">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides, payroll, documents, onboarding..."
              className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-neutral-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
            />
          </div>
        </div>
      </section>

      {/* Topic Grid */}
      <section className="px-6 max-w-6xl mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => {
            const IconComp = cat.icon;
            return (
              <div
                key={cat.id}
                id={cat.id}
                className="p-6 rounded-2xl border border-neutral-200/80 bg-white shadow-xs space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center">
                  <IconComp className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h2 className="text-base font-semibold text-neutral-900">
                  {cat.title}
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-neutral-100 bg-neutral-50/60 py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-neutral-500">
              Quick answers for workspace administrators and staff members
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
            {filteredFaqs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-6">
                No matching help articles found for &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Support Contact Strip */}
      <section className="py-16 px-6 bg-white border-t border-neutral-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-neutral-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Mail className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">
              Email Technical Support
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Need help configuring payroll rules, SSO, or tenant permissions?
              Our engineers respond within one business day.
            </p>
            <a
              href="mailto:support@stanforteedge.com"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff6900] hover:underline"
            >
              <span>support@stanforteedge.com</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center">
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">
              Already have a workspace?
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Sign in to access in-app finance & HR guides, live team chat, and
              your organization&apos;s document library.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff6900] hover:underline"
            >
              <span>Sign in to Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
