import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { authApi } from "@/shared/lib/core";

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
      await authApi.requestPasswordReset(email);
      setSuccess("Password reset instructions have been sent to your email address.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-10">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-primary-fixed/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-secondary-fixed/40 blur-3xl" />

      <section className="hidden w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur-xl md:block">
        <h1 className="text-center font-headline text-2xl font-bold text-primary">Forgot Password?</h1>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Enter your work email and we will send your reset instructions.
        </p>

        {success ? (
          <div role="status" aria-live="polite" className="mt-6 rounded-2xl border border-success/20 bg-success/10 p-5 text-center">
            <h2 className="font-headline text-xl font-bold text-primary">Check your email</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              We&apos;ve sent a password reset link to <span className="font-semibold text-on-surface">{email}</span>
            </p>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div role="alert" className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <label className="block">
              <span className="field-label">Email Address</span>
              <div className="relative">
                <Icon name="mail" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  className="input-base pl-10"
                  autoComplete="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>
            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? "Submitting..." : "Send Reset Link"}
            </Button>
          </form>
        )}
        <div className="mt-5 text-center text-sm text-slate-500">
          <Link className="font-semibold text-brand-900" to="/login">
            Back to sign in
          </Link>
        </div>
      </section>

      <section className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/90 p-6 shadow-soft backdrop-blur-xl md:hidden">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Reset Password</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {success ? (
          <div role="status" aria-live="polite" className="mt-6 rounded-2xl border border-success/20 bg-success/10 p-5">
            <h2 className="font-headline text-2xl font-bold text-primary">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              We&apos;ve sent a password reset link to your registered email address.
            </p>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div role="alert" className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className="field-label">Work Email</span>
              <input
                className="input-base h-14"
                autoComplete="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button type="submit" className="h-14 w-full justify-center text-base" disabled={loading}>
              {loading ? "Submitting..." : "Send Link"}
              {!loading ? <Icon name="arrow_forward" className="ml-2 text-[18px]" /> : null}
            </Button>
          </form>
        )}

        <div className="mt-5 text-center text-sm text-slate-500">
          <Link className="font-semibold text-brand-900" to="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
