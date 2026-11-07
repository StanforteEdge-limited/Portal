import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { authApi } from "@/shared/lib/core";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<"organization" | "individual">("organization");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(accountType === "organization" ? "Please enter your organization name." : "Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your business email.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      await authApi.createWorkspace({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row selection:bg-[#ff6900] selection:text-white">
      {/* 1. Left Half: Full-Bleed Dark Navy Visual (50% on desktop) */}
      <div className="relative w-full lg:w-1/2 bg-[#070e20] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden min-h-[420px] lg:min-h-screen">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

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

        {/* Center: Create Your Account & 3 Bullet Items with Orange Checks */}
        <div className="relative z-10 my-auto py-10 max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-headline leading-tight">
              Create Your Account
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Get started with Stanforte Edge in just a few steps.
            </p>
          </div>

          {/* 3 Bullet Items with Solid Orange Checks */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#ff6900] text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-100">Manage your workforce</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#ff6900] text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-100">Automate payroll</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#ff6900] text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-100">Streamline approvals</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Built for Modern Businesses</span>
        </div>
      </div>

      {/* 2. Right Half: Full-Bleed Clean White Registration Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 min-h-screen">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Register as Segmented Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Register as</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setAccountType("organization")}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  accountType === "organization"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="h-4 w-4 text-slate-700" />
                <span>Organization</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  accountType === "individual"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-4 w-4 text-slate-700" />
                <span>Individual</span>
              </button>
            </div>
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
            {/* Organization / Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {accountType === "organization" ? "Organization Name" : "Full Name"}
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={accountType === "organization" ? "e.g. Acme Ltd" : "e.g. Daniel Owonikoko"}
                  required
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-[#ff6900] focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Business Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Business Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-[#ff6900] focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Phone Number with Nigerian Flag */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Phone Number</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1.5 text-xs text-slate-700 font-semibold pointer-events-none select-none">
                  <span>&#127475;&#127468;</span>
                  <span>+234</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="801 234 5678"
                  className="w-full pl-22 pr-4 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl outline-none transition focus:border-[#ff6900] focus:ring-4 focus:ring-orange-500/10 font-mono placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
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

            {/* Terms of Service Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 leading-normal select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                />
                <span>
                  I agree to the{" "}
                  <a href="#" className="font-bold text-[#ff6900] hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-bold text-[#ff6900] hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 mt-2"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Sign In Footer */}
          <div className="text-center text-xs text-slate-500 pt-2">
            Already have an account?{" "}
            <Link to="/login" className="font-extrabold text-[#ff6900] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
