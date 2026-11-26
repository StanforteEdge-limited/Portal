import { useState, type FormEvent } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import { ArrowRight, Check, AlertCircle } from "lucide-react";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000/v1").replace(
    /\/+$/,
    "",
  );

const CATEGORIES = [
  { id: "support", label: "Technical support" },
  { id: "bug_report", label: "Report a bug" },
  { id: "security", label: "Security disclosure" },
  { id: "sales", label: "Enterprise sales" },
  { id: "billing", label: "Billing & payments" },
] as const;

export default function ContactPage() {
  const [category, setCategory] = useState<string>("support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/platform/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organization: organization.trim() || undefined,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.error?.message ||
          json?.message ||
          "Unable to submit your request. Please check your details.";
        throw new Error(msg);
      }
      const ref = json?.data?.reference || json?.reference || "SUP-RECEIVED";
      setSubmittedRef(ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout activePath="/contact">
      <div className="bg-[#FAFAFA] text-[#0F172A]">
        <section className="pt-16 pb-12 sm:pt-20 px-6 text-center max-w-3xl mx-auto space-y-5">
          <h1 className="text-[34px] sm:text-[48px] font-semibold text-[#0F172A] leading-[1.12] tracking-[-0.015em] font-headline">
            Talk to the <span className="text-[#C2410C]">Stanforte Edge</span> team.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#475569] max-w-[60ch] mx-auto leading-[1.6]">
            Report a technical issue, disclose a security concern, or schedule an onboarding walkthrough for your organization.
          </p>
        </section>

        <section className="px-6 max-w-5xl mx-auto pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8">
              {submittedRef ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-11 h-11 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
                    <Check className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] font-mono text-[#475569]">
                      Reference: {submittedRef}
                    </p>
                    <h2 className="text-[24px] font-semibold text-[#0F172A] font-headline">
                      Message received
                    </h2>
                    <p className="text-[15px] text-[#475569] max-w-md mx-auto leading-[1.6]">
                      Your report is logged in our operations queue. We will reply to{" "}
                      <span className="font-semibold text-[#0F172A]">{email}</span>{" "}
                      within one business day.
                    </p>
                  </div>
                  <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedRef(null);
                        setSubject("");
                        setMessage("");
                      }}
                      className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[14px] font-semibold transition-colors"
                    >
                      Submit another report
                    </button>
                    <Link
                      to="/help"
                      className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-[14px] font-semibold inline-flex items-center"
                    >
                      Open Help Center
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <span className="block text-[14px] font-semibold text-[#0F172A]">
                      Topic
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => {
                        const active = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setCategory(cat.id)}
                            className={`min-h-[44px] px-4 py-2 rounded-lg border text-[14px] font-medium transition-colors ${
                              active
                                ? "border-[#0F172A] bg-[#0F172A] text-white"
                                : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F1F5F9]"
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B91C1C] font-medium flex items-center gap-2"
                    >
                      <AlertCircle className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-name" className="block text-[14px] font-medium text-[#0F172A]">
                        Full name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Adebayo Okafor"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-[16px] bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="contact-email" className="block text-[14px] font-medium text-[#0F172A]">
                        Work email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-[16px] bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-org" className="block text-[14px] font-medium text-[#0F172A]">
                        Organization (optional)
                      </label>
                      <input
                        id="contact-org"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Acme Nigeria Ltd"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-[16px] bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="contact-subject" className="block text-[14px] font-medium text-[#0F172A]">
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your request"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-[16px] bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-message" className="block text-[14px] font-medium text-[#0F172A]">
                      Details
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share steps to reproduce, workspace subdomain, or how we can help..."
                      className="w-full p-3.5 text-[16px] bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 hover:-translate-y-[1px] disabled:opacity-50"
                  >
                    <span>{loading ? "Submitting..." : "Send message"}</span>
                    <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </form>
              )}
            </div>

            {/* Direct Channels */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-[#0F172A] text-[#F8FAFC] rounded-xl p-6 space-y-4">
                <h2 className="text-[20px] font-semibold font-headline">
                  Direct channels
                </h2>
                <p className="text-[14px] text-[#CBD5E1] leading-[1.6]">
                  Every submission generates a tracking reference in our operations queue. Response target is within one business day.
                </p>
                <div className="divide-y divide-[#1E293B] border-t border-[#1E293B] pt-2 text-[14px]">
                  <div className="py-3 flex flex-col gap-0.5">
                    <span className="text-[#94A3B8]">Technical support</span>
                    <a
                      href="mailto:support@stanforteedge.com"
                      className="text-white hover:underline font-mono text-[13px]"
                    >
                      support@stanforteedge.com
                    </a>
                  </div>
                  <div className="py-3 flex flex-col gap-0.5">
                    <span className="text-[#94A3B8]">Security disclosure</span>
                    <a
                      href="mailto:security@stanforteedge.com"
                      className="text-white hover:underline font-mono text-[13px]"
                    >
                      security@stanforteedge.com
                    </a>
                  </div>
                  <div className="py-3 flex flex-col gap-0.5">
                    <span className="text-[#94A3B8]">Enterprise sales</span>
                    <a
                      href="mailto:sales@stanforteedge.com"
                      className="text-white hover:underline font-mono text-[13px]"
                    >
                      sales@stanforteedge.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
                <h3 className="text-[18px] font-semibold text-[#0F172A] font-headline">
                  Self-service guides
                </h3>
                <p className="text-[15px] text-[#475569] leading-[1.55]">
                  Browse onboarding checklists, PAYE payroll setup, and approval routing docs.
                </p>
                <Link
                  to="/help"
                  className="min-h-[44px] inline-flex items-center gap-2 text-[15px] font-semibold text-[#0F172A] hover:text-[#C2410C] transition-colors"
                >
                  <span>Open Help Center</span>
                  <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
