import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { authApi } from "@/shared/lib/core";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  Building2,
  User,
  Mail,
  Phone,
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[640px]">
        {/* Left Column: Dark Navy Brand Section */}
        <div className="relative bg-[#070e20] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* Top Brand Logo */}
          <div className="relative z-10">
            <Link to="/" className="inline-block">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          {/* Center Content: Create Your Account & 3 Bullet Benefits */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline">
                Create Your Account
              </h1>
              <p className="text-sm text-slate-300">
                Get started with Stanforte Edge in just a few steps.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Manage your workforce</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Automate payroll</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 text-[#ff6900] flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Streamline approvals</span>
              </div>
            </div>
          </div>

          {/* Bottom Tagline & Decorative Orange Lines */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Built for Modern Businesses</span>
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6900]/40 -mr-4 -mb-4 opacity-50" />
          </div>
        </div>

        {/* Right Column: Clean White Registration Form */}
        <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-5">
            {/* Register as Segmented Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Register as</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountType("organization")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
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
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
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

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Organization / Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {accountType === "organization" ? "Organization Name" : "Full Name"}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={accountType === "organization" ? "e.g. Acme Ltd" : "e.g. Daniel Owonikoko"}
                    required
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              {/* Business Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-xs text-slate-600 font-medium pointer-events-none">
                    <span>&#127475;&#127468;</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="801 234 5678"
                    className="w-full pl-20 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
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

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 leading-tight">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                  />
                  <span>
                    I agree to the{" "}
                    <a href="#" className="font-semibold text-[#ff6900] hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="font-semibold text-[#ff6900] hover:underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="text-center text-xs text-slate-500 pt-2">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-[#ff6900] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
