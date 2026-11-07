import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Building2,
  TrendingUp,
} from "lucide-react";

type LocationState = {
  from?: string;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
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
      const signedInUser = await signIn(trimmedEmail, password);
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[640px]">
        {/* Left Column: Dark Navy Corporate Visual */}
        <div className="relative bg-[#070e20] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* Skyscraper Background Image with Dark Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
              alt="Corporate Headquarters"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070e20] via-[#070e20]/80 to-[#070e20]/60" />
          </div>

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <Link to="/" className="inline-block">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          {/* Center Content: Welcome Back & 3 Feature Badges */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-300">
                Sign in to access your enterprise workspace.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Secure & Reliable</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Multi-Branch Support</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Real-Time Insights</span>
              </div>
            </div>
          </div>

          {/* Bottom Tagline & Decorative Curve */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Smarter Operations. Greater Productivity.</span>
            {/* Subtle orange accent curve */}
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6900]/40 -mr-4 -mb-4 opacity-50" />
          </div>
        </div>

        {/* Right Column: Clean White Sign In Form */}
        <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-headline">
                Sign In
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to continue
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
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

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#ff6900] hover:text-[#ea580c] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Social Logins Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                or continue with
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`${apiBase}/auth/google`}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
              >
                <GoogleIcon />
                <span>Google</span>
              </a>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
              >
                <MicrosoftIcon />
                <span>Microsoft</span>
              </button>
            </div>

            {/* Register Link */}
            <div className="text-center text-xs text-slate-500 pt-2">
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-[#ff6900] hover:underline">
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
