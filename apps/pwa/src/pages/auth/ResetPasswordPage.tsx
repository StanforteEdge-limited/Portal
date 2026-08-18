import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { authApi } from "@/shared/lib/core";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasLength = newPassword.length >= 12;
  const hasComplex = /[A-Z]/.test(newPassword) && /\d/.test(newPassword);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-12">
      <div className="pointer-events-none absolute left-[-120px] top-8 h-80 w-80 rounded-full bg-primary-fixed/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-secondary-fixed/35 blur-3xl" />

      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-card backdrop-blur-xl lg:grid-cols-[1fr_1.2fr]">
        <aside className="hidden bg-primary-container p-8 text-white lg:block">
          <img src={brandLogo} alt="Stanforte Edge" className="h-11 w-auto object-contain" />
          <h2 className="mt-8 font-headline text-2xl font-bold leading-tight">Security Protocol</h2>
          <p className="mt-2 text-sm leading-6 text-white/90">
            Please ensure your new password meets the security requirements for professional access.
          </p>
        </aside>

        <div className="p-8">
          <h1 className="font-headline text-2xl font-bold text-on-surface">Reset Password</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Create a new, strong password to secure your account.
          </p>

          {error ? (
            <div role="alert" className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {success ? (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {success}
            </div>
          ) : null}

          <form
            className="mt-6 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setSuccess(null);

              if (!token) {
                setError("Missing reset token. Please use the link from your email.");
                return;
              }

              if (newPassword.length < 8) {
                setError("Password must be at least 8 characters.");
                return;
              }

              if (newPassword !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }

              setLoading(true);
              try {
                await authApi.resetPassword(token, newPassword);
                setSuccess("Password updated successfully. Redirecting to login...");
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => {
                  navigate("/login");
                }, 2000);
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
              } finally {
                setLoading(false);
              }
            }}
            noValidate
          >
            <label className="block">
              <span className="field-label">New Password</span>
              <div className="relative">
                <input
                  className="input-base pr-11"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter at least 12 characters"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
                </button>
              </div>
            </label>

            <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
              <p className="mb-2 font-semibold text-on-surface">Password requirements</p>
              <p className="flex items-center gap-2">
                <Icon name={hasLength ? "check_circle" : "radio_button_unchecked"} className={hasLength ? "text-success" : "text-outline"} />
                At least 12 characters
              </p>
              <p className="mt-1 flex items-center gap-2">
                <Icon name={hasComplex ? "check_circle" : "radio_button_unchecked"} className={hasComplex ? "text-success" : "text-outline"} />
                Include uppercase and number
              </p>
            </div>

            <label className="block">
              <span className="field-label">Confirm Password</span>
              <div className="relative">
                <input
                  className="input-base pr-11"
                  autoComplete="new-password"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-type your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <Icon name={showConfirm ? "visibility_off" : "visibility"} className="text-[20px]" />
                </button>
              </div>
            </label>

            <Button type="submit" className="w-full justify-center py-4 text-base" disabled={loading}>
              {loading ? "Saving..." : "Save New Password"}
              {!loading ? <Icon name="arrow_forward" className="ml-2 text-[18px]" /> : null}
            </Button>
          </form>

          <div className="mt-5 text-sm text-slate-500">
            <Link className="font-semibold text-brand-900" to="/login">
              Return to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
