import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Activity,
  Server,
  TrendingUp,
} from "lucide-react";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000/v1").replace(
    /\/+$/,
    "",
  );

export default function CeoLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ceo/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.error?.message || json?.message || "Invalid executive credentials",
        );
      }
      navigate("/ceo", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#fafafa] flex flex-col lg:flex-row selection:bg-[#C2410C] selection:text-white">
      {/* Left Executive Panel */}
      <div className="w-full lg:w-1/2 bg-[#141415] text-[#ededed] p-8 sm:p-12 lg:p-16 flex flex-col justify-between min-h-[340px] lg:min-h-screen border-r border-white/[0.08]">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <StanforteLogo variant="dark" className="h-8" />
          </Link>
          <span className="px-2.5 py-1 rounded-md bg-[#C2410C]/15 text-[#ff6900] text-xs font-mono border border-[#ff6900]/30">
            EXECUTIVE CONSOLE
          </span>
        </div>

        <div className="my-auto py-10 max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#ededed] font-headline leading-[1.15]">
              Platform Command &amp; Executive Telemetry
            </h1>
            <p className="text-sm sm:text-base text-[#a1a1a6] leading-relaxed">
              Dedicated, isolated super-administrator console for real-time
              platform revenue, multi-tenant organizations, deployment pipeline
              health, and security audit logs.
            </p>
          </div>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            <div className="flex items-center gap-3 py-3.5">
              <TrendingUp className="h-4 w-4 text-[#ff6900] shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-[#ededed]">
                Live MRR, Paystack subscriptions &amp; tenant growth charts
              </span>
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <Server className="h-4 w-4 text-[#ff6900] shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-[#ededed]">
                Deployment history, last release status &amp; runtime health
              </span>
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <Shield className="h-4 w-4 text-[#ff6900] shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-[#ededed]">
                Dedicated `sta_platform_admins` auth &amp; live security logs
              </span>
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <Activity className="h-4 w-4 text-[#ff6900] shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-[#ededed]">
                Organization suspension controls &amp; support report triage
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#85858b]">
          <span>Stanforte Edge Platform Operations</span>
          <span className="font-mono">Isolated JWT · HS256</span>
        </div>
      </div>

      {/* Right Sign In Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 min-h-screen">
        <div className="max-w-md w-full mx-auto space-y-7">
          <div className="space-y-1.5">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-[#0F172A] font-headline">
              CEO Executive Sign In
            </h2>
            <p className="text-[15px] text-[#475569]">
              Sign in with your dedicated platform administrator credentials.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-600/20 bg-rose-50 p-3 text-xs text-rose-700 font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="ceo-email"
                className="block text-xs font-medium text-neutral-700"
              >
                Executive email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  id="ceo-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ceo@stanforteedge.com"
                  className="w-full h-10 pl-10 pr-3 text-sm bg-white border border-neutral-900/[0.12] rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ceo-password"
                className="block text-xs font-medium text-neutral-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  id="ceo-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Executive password"
                  className="w-full h-10 pl-10 pr-10 text-sm bg-white border border-neutral-900/[0.12] rounded-lg outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold text-[15px] bg-[#C2410C] hover:bg-[#9A3412] text-white transition-[background-color,transform] duration-150 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Authenticating..." : "Enter Executive Console"}
            </button>
          </form>

          <div className="text-center text-[14px] text-[#475569] pt-2">
            Looking for a tenant workspace?{" "}
            <Link to="/login" className="font-semibold text-[#C2410C] hover:underline">
              Standard Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
