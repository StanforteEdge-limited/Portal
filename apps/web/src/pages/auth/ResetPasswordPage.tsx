import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "@/shared/router-adapter";
import { authApi } from "@/shared/lib/core";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess("Your password has been successfully reset.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[540px]">
        {/* Left Column: Dark Navy Brand Section */}
        <div className="relative bg-[#070e20] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          <div className="relative z-10">
            <Link to="/" className="inline-block">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          <div className="relative z-10 my-auto py-8 space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight font-headline">
              Set New Password
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Create a strong, unique password to secure your enterprise account access.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Enterprise Security Protocol</span>
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6900]/40 -mr-4 -mb-4 opacity-50" />
          </div>
        </div>

        {/* Right Column: Clean White Form */}
        <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-headline">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your new password below
              </p>
            </div>

            {success ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Password Updated</h3>
                  <p className="text-xs text-slate-600 mt-1">Redirecting to sign in...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none transition focus:border-[#ff6900] focus:ring-2 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
