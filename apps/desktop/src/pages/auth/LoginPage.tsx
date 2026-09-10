import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    return state?.from && state.from.startsWith("/") ? state.from : "/requests";
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      await signIn(trimmedEmail, password);
      navigate(redirectPath, { replace: true });
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-primary-fixed/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-secondary-fixed/40 blur-3xl" />

      <section className="mx-auto hidden w-full max-w-7xl items-center justify-between px-8 py-8 md:flex">
        <div className="flex items-center gap-4">
          <img
            src={brandLogo}
            alt="Stanforte Edge"
            className="h-11 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-6 text-sm font-semibold text-slate-500">
          <span>Support</span>
          <span>Documentation</span>
        </div>
      </section>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pb-12 pt-4 md:px-10">
        <div className="hidden w-full items-stretch gap-8 md:grid md:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-10 shadow-card backdrop-blur-xl">
            <h1 className="font-headline text-2xl font-bold text-primary">
              Staff Portal Access
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Secure login for authorized Stanforte Edge personnel.
            </p>

            {error ? (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            ) : null}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
              <label className="block">
                <span className="field-label">Work Email</span>
                <div className="relative">
                  <Icon
                    name="mail"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="input-base pl-10"
                    autoComplete="email"
                    type="email"
                    placeholder="name@stanforteedge.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="field-label mb-0">Password</span>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="input-base pl-10 pr-11"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon
                      name={showPassword ? "visibility_off" : "visibility"}
                      className="text-[20px]"
                    />
                  </button>
                </div>
              </label>

              <Button
                type="submit"
                className="w-full justify-center py-4 text-base"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Log In"}
                {!loading ? (
                  <Icon name="arrow_forward" className="ml-2 text-[18px]" />
                ) : null}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <a
                href={`${apiBase}/auth/google`}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
              >
                <GoogleIcon />
                Sign in with Google
              </a>
            </form>
          </div>

          <aside className="rounded-3xl border border-white/60 bg-gradient-to-br from-primary-fixed/40 to-secondary-fixed/30 p-8 shadow-soft">
            <div className="rounded-2xl bg-white/80 p-6 backdrop-blur">
              <h2 className="font-headline text-2xl font-bold text-primary">
                One Portal, Daily Workflows
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Handle staff requests, attendance, and approvals in one secure
                workspace built for multi-organization teams.
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  {
                    icon: "assignment",
                    title: "Requests & Approvals",
                    text: "Submit, review, and track request decisions end-to-end.",
                  },
                  {
                    icon: "pending_actions",
                    title: "Attendance Ops",
                    text: "Clock-in, corrections, and exceptions with clear audit trails.",
                  },
                  {
                    icon: "security",
                    title: "Security by Default",
                    text: "Session protection, role controls, and monitored access.",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl bg-white px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed/40 text-primary">
                        <Icon name={item.icon} className="text-[18px]" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-on-surface">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mx-auto w-full max-w-sm md:hidden">
          <div className="mb-10 text-center">
            <img
              src={brandLogo}
              alt="Stanforte Edge"
              className="mx-auto h-14 w-auto object-contain"
            />
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-soft">
            <h2 className="font-headline text-xl font-semibold text-on-surface">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Please enter your credentials to continue
            </p>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <label className="block">
                <span className="field-label">Corporate Email</span>
                <div className="relative">
                  <Icon
                    name="mail"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    className="input-base h-14 pl-10"
                    autoComplete="email"
                    type="email"
                    placeholder="name@stanforte.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="field-label mb-0">Security Key</span>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    className="input-base h-14 pl-10 pr-11"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon
                      name={showPassword ? "visibility_off" : "visibility"}
                      className="text-[20px]"
                    />
                  </button>
                </div>
              </label>

              <Button
                type="submit"
                className="h-14 w-full justify-center text-base"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Log In"}
                {!loading ? (
                  <Icon name="arrow_forward" className="ml-2 text-[18px]" />
                ) : null}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <a
                href={`${apiBase}/auth/google`}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
              >
                <GoogleIcon />
                Sign in with Google
              </a>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
