import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  getTenantSlugFromHostname,
  getProjectBaseDomain,
  formatWorkspaceSlug,
  buildTenantUrl,
} from "@/shared/lib/tenant-subdomain";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Building2,
  TrendingUp,
  Globe,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

type LocationState = {
  from?: string;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true" className="shrink-0">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  // 1. Detect Tenant Subdomain (e.g. acme.stanforteedge.com -> "acme")
  const detectedSubdomain = useMemo(() => getTenantSlugFromHostname(), []);
  const baseDomain = useMemo(() => getProjectBaseDomain(), []);

  const [customWorkspaceSlug, setCustomWorkspaceSlug] = useState("");
  const [showWorkspacePrompt, setShowWorkspacePrompt] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') || 'http://localhost:3000/v1';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err === 'no_account') setError('No portal account found for this Google account. Contact your administrator.');
    else if (err === 'account_inactive') setError('Your account is inactive. Contact your administrator.');
    else if (err === 'account_locked') setError('Your account is temporarily locked. Try again later.');
    else if (err === 'google_failed') setError('Google sign-in failed. Please try again.');
  }, [location.search]);

  const redirectPath = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from && state.from.startsWith("/") ? state.from : "/dashboard";
  }, [location.state]);

  function handleGoToWorkspace(e: FormEvent) {
    e.preventDefault();
    const cleanSlug = formatWorkspaceSlug(customWorkspaceSlug);
    if (!cleanSlug) return;
    const targetUrl = buildTenantUrl(cleanSlug, "/login");
    window.location.href = targetUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your work email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid work email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // If user is on a dedicated workspace subdomain (e.g. acme.stanforteedge.com),
      // detectedSubdomain is automatically passed so login is scoped to that organization.
      // If on the generic domain, no organization code is passed, allowing backend to auto-resolve.
      const signedInUser = await signIn(trimmedEmail, password, detectedSubdomain || undefined);
      const onboardingStatuses = new Set(["invited", "accepted", "profile_pending", "forms_pending"]);
      navigate(onboardingStatuses.has(String(signedInUser.onboarding_status)) ? "/onboarding" : redirectPath, { replace: true });
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row selection:bg-[#ff6900] selection:text-white">
      {/* 1. Left Half: Full-Bleed Dark Navy Visual (50% on desktop) */}
      <div className="relative w-full lg:w-1/2 bg-[#070e20] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden min-h-[420px] lg:min-h-screen">
        {/* Modern Skyscraper Dusk Background Photo */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85"
            alt="Corporate Headquarters"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070e20] via-[#070e20]/85 to-[#070e20]/75" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#070e20]/90" />
        </div>

        {/* Decorative Orange Arc Concentric Lines at Bottom Left */}
        <svg
          className="absolute -bottom-16 -left-16 w-64 h-64 pointer-events-none z-10"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="20" cy="180" r="140" stroke="#ff6900" strokeWidth="2" strokeOpacity="0.3" />
          <circle cx="20" cy="180" r="100" stroke="#ff6900" strokeWidth="2" strokeOpacity="0.4" />
          <circle cx="20" cy="180" r="60" stroke="#ff6900" strokeWidth="2.5" strokeOpacity="0.55" />
        </svg>

        {/* Top Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <StanforteLogo variant="dark" className="h-9" />
          </Link>
        </div>

        {/* Center: Welcome Back & 3 Feature Badges */}
        <div className="relative z-10 my-auto py-10 max-w-md space-y-8">
          <div className="space-y-3">
            {detectedSubdomain && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-[#ff6900] text-xs font-bold border border-orange-500/30">
                <Globe className="h-3.5 w-3.5" />
                <span>{detectedSubdomain}.{baseDomain}</span>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-headline leading-tight">
              {detectedSubdomain ? `Sign In to ${detectedSubdomain.toUpperCase()}` : "Welcome Back"}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {detectedSubdomain
                ? `Enter your enterprise credentials for the ${detectedSubdomain} workspace.`
                : "Sign in to access your enterprise workspace."}
            </p>
          </div>

          {/* 3 Badges */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#ff6900] flex items-center justify-center shrink-0 border border-orange-500/30">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Secure & Reliable</span>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#ff6900] flex items-center justify-center shrink-0 border border-orange-500/30">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Multi-Branch Support</span>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#ff6900] flex items-center justify-center shrink-0 border border-orange-500/30">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Real-Time Insights</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Smarter Operations. Greater Productivity.</span>
        </div>
      </div>

      {/* 2. Right Half: Full-Bleed Clean White Generic Sign In Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 min-h-screen">
        <div className="max-w-md w-full mx-auto space-y-7">
          {/* Subdomain Workspace Pill (if on subdomain) */}
          {detectedSubdomain ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/70 border border-orange-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff6900] text-white flex items-center justify-center font-bold text-xs">
                  {detectedSubdomain.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 capitalize leading-tight">
                    {detectedSubdomain} Workspace
                  </div>
                  <div className="text-[11px] font-medium text-orange-700/80">
                    {detectedSubdomain}.{baseDomain}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin.includes(detectedSubdomain)
                    ? window.location.origin.replace(`${detectedSubdomain}.`, "") + "/login"
                    : "/login";
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
              >
                Switch
              </button>
            </div>
          ) : null}

          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 font-headline">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {detectedSubdomain
                ? `Enter your enterprise credentials for ${detectedSubdomain}`
                : "Enter your work credentials to access your organization"}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600 font-medium"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-[#ff6900] focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-[#ff6900] focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="font-bold text-[#ff6900] hover:text-[#ea580c] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Dedicated Subdomain Navigation for Root Domain Users */}
          {!detectedSubdomain && (
            <div className="pt-1">
              {!showWorkspacePrompt ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowWorkspacePrompt(true)}
                    className="text-xs text-slate-500 hover:text-[#ff6900] font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    <span>Sign in with your organization workspace URL</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGoToWorkspace} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Enter Organization Subdomain</label>
                    <button
                      type="button"
                      onClick={() => setShowWorkspacePrompt(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        value={customWorkspaceSlug}
                        onChange={(e) => setCustomWorkspaceSlug(formatWorkspaceSlug(e.target.value))}
                        placeholder="your-company"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] font-medium"
                      />
                      <span className="absolute right-3 text-[11px] text-slate-400 pointer-events-none">
                        .{baseDomain}
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={!customWorkspaceSlug.trim()}
                      className="px-3.5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Go</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Social Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
              or continue with
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3.5">
            <a
              href={`${apiBase}/auth/google`}
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs"
            >
              <GoogleIcon />
              <span>Google</span>
            </a>
            <button
              type="button"
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs"
            >
              <MicrosoftIcon />
              <span>Microsoft</span>
            </button>
          </div>

          {/* Register Footer */}
          <div className="text-center text-xs text-slate-500 pt-1">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-extrabold text-[#ff6900] hover:underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
