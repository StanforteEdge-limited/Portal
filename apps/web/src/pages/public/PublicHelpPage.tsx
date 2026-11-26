import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Search } from "lucide-react";

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Workspace setup and onboarding",
    description:
      "Create your organization workspace, configure subdomain routing, and bulk-import staff records via CSV.",
  },
  {
    id: "payroll",
    title: "Payroll, PAYE, and statutory schedules",
    description:
      "Configure salary components, Nigerian PAYE tax tables, PenCom schedules, and commercial bank export files.",
  },
  {
    id: "attendance",
    title: "Attendance, geofencing, and leave",
    description:
      "Set office GPS coordinates, manage daily clock-in rules, approve corrections, and track leave balances.",
  },
  {
    id: "documents",
    title: "Documents and policy sign-offs",
    description:
      "Upload company handbooks and HR policies, distribute them to staff, and track signed acknowledgements.",
  },
  {
    id: "security",
    title: "Roles, permissions, and audit logs",
    description:
      "Assign least-privilege roles, configure multi-tier approval routing, and inspect tenant audit trails.",
  },
  {
    id: "guides",
    title: "Procurement and payment vouchers",
    description:
      "Raise requisitions, issue vendor purchase orders, generate vouchers, and reconcile disbursements.",
  },
];

const FAQS = [
  {
    id: "faq-1",
    question: "How do I create a new workspace for my organization?",
    answer:
      "Select Create workspace, enter your work email, and choose a subdomain such as yourcompany.stanforteedge.com. Verify your email address to activate administrator access.",
  },
  {
    id: "faq-2",
    question: "Can I bulk-import existing employees and salary structures?",
    answer:
      "Yes. Open Administration > Users > Bulk Import, download the CSV template, fill in staff details, departments, and roles, and upload to onboard your team in one pass.",
  },
  {
    id: "faq-3",
    question: "How do multi-tier payment and expense approvals work?",
    answer:
      "Administrators configure approval stages per request type under System Settings > Request Types. Submitted requests route through department leads and finance before disbursement.",
  },
  {
    id: "faq-4",
    question: "How are company policy sign-offs tracked?",
    answer:
      "Upload handbooks in the Documents hub and turn on acknowledgement tracking. Staff receive a task notification and each timestamped sign-off is logged for audits.",
  },
  {
    id: "faq-5",
    question: "How do I contact technical support or report an issue?",
    answer:
      "Submit a report on the Contact page for a tracking reference, or email support@stanforteedge.com directly.",
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
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        {/* Header + Search */}
        <section className="pt-16 pb-12 sm:pt-20 px-6 text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] font-headline">
            How can we <span className="text-[#C2410C]">help</span>?
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#475569] leading-[1.6]">
            Search setup guides for payroll, attendance geofencing, approvals, and workspace security.
          </p>

          <div className="relative max-w-xl mx-auto pt-2">
            <label htmlFor="help-search" className="sr-only">
              Search help topics
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 mt-1 h-[18px] w-[18px] text-[#64748B] pointer-events-none"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search payroll, bulk import, approvals, or policies..."
              className="w-full min-h-[48px] pl-11 pr-4 py-3 rounded-lg border border-[#CBD5E1] bg-white text-[16px] text-[#0F172A] placeholder:text-[#64748B]"
            />
          </div>
        </section>

        {/* Topics Grid */}
        <section className="px-6 max-w-5xl mx-auto pb-16">
          {filteredCategories.length === 0 ? (
            <div className="p-8 rounded-xl border border-[#E2E8F0] bg-white text-center space-y-3">
              <p className="text-[16px] text-[#475569]">
                No guides matched &ldquo;{query}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[14px] font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  id={cat.id}
                  className="pt-5 border-t border-[#E2E8F0] space-y-2 scroll-mt-24"
                >
                  <h2 className="text-[18px] font-semibold text-[#0F172A] leading-[1.3] font-headline">
                    {cat.title}
                  </h2>
                  <p className="text-[15px] text-[#475569] leading-[1.6]">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FAQs */}
        <section className="py-20 px-6 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#0F172A] tracking-[-0.01em] font-headline">
              Common questions
            </h2>

            {filteredFaqs.length === 0 ? (
              <p className="text-[15px] text-[#475569]">
                No FAQ entries matched your search. Contact our support team directly below.
              </p>
            ) : (
              <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            <div className="p-6 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-[18px] font-semibold text-[#0F172A] font-headline">
                  Still need help?
                </h3>
                <p className="text-[15px] text-[#475569]">
                  Send a ticket to our engineering and onboarding team.
                </p>
              </div>
              <Link
                to="/contact"
                className="min-h-[44px] px-5 py-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition-colors"
              >
                <span>Contact support</span>
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
