import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "@/shared/router-adapter";
import { authApi } from "@/shared/lib/core";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  getProjectBaseDomain,
  buildTenantUrl,
} from "@/shared/lib/tenant-subdomain";
import { Mail, CheckCircle2, ArrowLeft, Globe, Building2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const slug = params.get("slug");
  const baseDomain = useMemo(() => getProjectBaseDomain(), []);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    setLoading(true);
    authApi
      .verifyEmail(token)
      .then(() => setMessage("Email verified successfully! You can now sign in to your workspace."))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to verify email."))
      .finally(() => setLoading(false));
  }, [params]);

  async function resend(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Please enter the email address used to create your workspace.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resendVerification(email.trim().toLowerCase());
      setMessage("If the account is awaiting verification, a new link has been sent to your email.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  const workspaceLoginUrl = slug ? buildTenantUrl(slug, "/login") : "/login";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#ff6900] selection:text-white">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        {/* Left Column: Dark Navy Brand Section */}
        <div className="relative bg-[#070e20] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* Background Skyscraper */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85"
              alt="Corporate"
              className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070e20] via-[#070e20]/90 to-[#070e20]/80" />
          </div>

          <div className="relative z-10">
            <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          <div className="relative z-10 my-auto py-8 space-y-4">
            {slug && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-[#ff6900] text-xs font-bold border border-orange-500/30">
                <Globe className="h-3.5 w-3.5" />
                <span>{slug}.{baseDomain}</span>
              </div>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight font-headline">
              Verify Your Email
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              We&apos;ve sent a verification link to ensure the security of your new enterprise workspace.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Enterprise Workspace Activation</span>
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6900]/40 -mr-4 -mb-4 opacity-50" />
          </div>
        </div>

        {/* Right Column: Clean White Form */}
        <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-headline">
                Check Your Inbox
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Click the link sent to your email address to activate your account.
              </p>
            </div>

            {slug && (
              <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-3">
                <Building2 className="h-5 w-5 text-[#ff6900] shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Your Dedicated Workspace URL</div>
                  <div className="text-orange-700 font-mono font-medium">
                    https://{slug}.{baseDomain}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={resend} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </button>

              <div className="pt-2 text-center">
                <a
                  href={workspaceLoginUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to {slug ? `${slug} Sign In` : "Sign In"}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
