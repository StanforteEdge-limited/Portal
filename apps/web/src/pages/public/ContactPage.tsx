import { useState, type FormEvent } from "react";
import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "./PublicLayout";
import {
  Mail,
  MessageSquare,
  ShieldAlert,
  Bug,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000/v1").replace(
    /\/+$/,
    "",
  );

const CATEGORIES = [
  { id: "support", label: "Technical Support", icon: MessageSquare },
  { id: "bug_report", label: "Report a Bug", icon: Bug },
  { id: "security", label: "Security Report", icon: ShieldAlert },
  { id: "sales", label: "Enterprise Sales", icon: Building2 },
  { id: "billing", label: "Billing & Payments", icon: Mail },
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
      <section className="pt-16 pb-10 px-6 text-center max-w-3xl mx-auto space-y-4">
        <div className="text-xs font-medium text-[#ff6900]">
          Support, Reports & Enterprise Inquiries
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold text-neutral-900 tracking-tight font-headline">
          Contact <span className="text-[#ff6900]">Stanforte Edge</span>
        </h1>
        <p className="text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Report a technical issue, disclose a security concern, or connect with
          our engineering and enterprise onboarding teams.
        </p>
      </section>

      <section className="px-6 max-w-6xl mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Form */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-6 sm:p-8">
            {submittedRef ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-mono text-neutral-500">
                    Reference: {submittedRef}
                  </p>
                  <h2 className="text-xl font-semibold text-neutral-900 font-headline">
                    Message received
                  </h2>
                  <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                    Your inquiry has been logged directly into our operations
                    queue. Our team will respond to{" "}
                    <span className="font-medium text-neutral-900">{email}</span>{" "}
                    within one business day.
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRef(null);
                      setSubject("");
                      setMessage("");
                    }}
                    className="h-10 px-5 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Submit another report
                  </button>
                  <Link
                    to="/help"
                    className="h-10 px-5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium inline-flex items-center"
                  >
                    Visit Help Center
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Pills */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-700">
                    How can we help?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                            active
                              ? "border-[#ff6900] bg-orange-50/70 text-[#c2410c]"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <IconComp className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-600/20 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-medium flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Full name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adebayo Okafor"
                      className="w-full h-10 px-3.5 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Work email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full h-10 px-3.5 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-org"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Organization (optional)
                    </label>
                    <input
                      id="contact-org"
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Acme Nigeria Ltd"
                      className="w-full h-10 px-3.5 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Subject *
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your report or request"
                      className="w-full h-10 px-3.5 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-medium text-neutral-700"
                  >
                    Details *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share steps to reproduce, workspace slug, or how our team can help..."
                    className="w-full p-3.5 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "Submitting..." : "Send Report / Inquiry"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>

          {/* Right: Direct Channels & SLA */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-[#141415] text-[#ededed] rounded-2xl p-6 space-y-4 border border-white/[0.08]">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.06] text-xs font-mono text-[#ff6900]">
                <Clock className="h-3.5 w-3.5" />
                <span>Response SLA</span>
              </div>
              <h2 className="text-lg font-medium font-headline">
                Direct Engineering & Support Channels
              </h2>
              <p className="text-xs text-[#a1a1a6] leading-relaxed">
                Every report submitted here is routed directly into the platform
                executive & operations queue with a unique tracking reference.
              </p>
              <div className="divide-y divide-white/[0.08] border-t border-white/[0.08] pt-2 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-[#a1a1a6]">Technical Support</span>
                  <a
                    href="mailto:support@stanforteedge.com"
                    className="text-white hover:text-[#ff6900] font-mono"
                  >
                    support@stanforteedge.com
                  </a>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-[#a1a1a6]">Security Disclosure</span>
                  <a
                    href="mailto:security@stanforteedge.com"
                    className="text-white hover:text-[#ff6900] font-mono"
                  >
                    security@stanforteedge.com
                  </a>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-[#a1a1a6]">Enterprise Sales</span>
                  <a
                    href="mailto:sales@stanforteedge.com"
                    className="text-white hover:text-[#ff6900] font-mono"
                  >
                    sales@stanforteedge.com
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 space-y-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                Looking for self-service guides?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Browse onboarding guides, Nigerian PAYE payroll setup, and
                multi-tier approval docs in the Help Center.
              </p>
              <Link
                to="/help"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff6900] hover:underline pt-1"
              >
                <span>Open Help Center</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
