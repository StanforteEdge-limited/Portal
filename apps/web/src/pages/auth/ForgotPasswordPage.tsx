import { type FormEvent, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { authApi } from "@/shared/lib/core";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await authApi.requestPasswordReset(email.trim());
      setSuccess("Password reset instructions have been sent to your email address.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
        {/* Left Column: Dark Navy Corporate Visual */}
        <div className="relative bg-[#070e20] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          <div className="relative z-10">
            <Link to="/" className="inline-block">
              <StanforteLogo variant="dark" className="h-8" />
            </Link>
          </div>

          <div className="relative z-10 my-auto py-8 space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight font-headline">
              Password Recovery
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Enter your registered work email to receive secure password reset instructions.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Enterprise Account Security</span>
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6900]/40 -mr-4 -mb-4 opacity-50" />
          </div>
        </div>

        {/* Right Column: Clean White Form */}
        <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-headline">
                Forgot Password?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your work email address below
              </p>
            </div>

            {success ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Check your inbox</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    We&apos;ve sent reset instructions to <span className="font-semibold text-slate-900">{email}</span>
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-block pt-2 text-xs font-bold text-[#ff6900] hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
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
                  {loading ? "Sending link..." : "Send Reset Link"}
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
