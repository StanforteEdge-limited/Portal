import { type FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

type LocationState = {
  from?: string;
};

export default function SessionReauthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, lastKnownEmail } = useAuth();

  const [email, setEmail] = useState(user?.email || lastKnownEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const displayedEmail = user?.email || lastKnownEmail || "";

  const redirectPath = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from && state.from.startsWith("/") ? state.from : "/requests";
  }, [location.state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(redirectPath, { replace: true });
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to re-authenticate.",
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
              Session Expired
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your session timed out or was refreshed elsewhere. Sign in again
              to continue.
            </p>

            {displayedEmail ? (
              <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold text-primary">
                  Signed in as:
                </span>{" "}
                {displayedEmail}
              </div>
            ) : null}

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
                <span className="field-label">Password</span>
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
                {loading ? "Signing In..." : "Unlock Session"}
                {!loading ? (
                  <Icon name="arrow_forward" className="ml-2 text-[18px]" />
                ) : null}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <button
                className="font-medium text-secondary hover:text-primary"
                type="button"
                onClick={() => navigate(-1)}
              >
                Go back
              </button>
              <Link
                className="font-medium text-danger hover:underline"
                to="/login"
              >
                Use login page
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/60 bg-gradient-to-br from-primary-fixed/40 to-secondary-fixed/30 p-8 shadow-soft">
            <div className="rounded-2xl bg-white/80 p-6 backdrop-blur">
              <h2 className="font-headline text-2xl font-bold text-primary">
                Keep Working
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Re-enter your password to restore access without losing your
                place in the portal.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  {
                    icon: "assignment",
                    title: "Requests & Approvals",
                    text: "Return to pending work immediately after sign-in.",
                  },
                  {
                    icon: "pending_actions",
                    title: "Attendance Ops",
                    text: "Recover a live attendance session after token expiry.",
                  },
                  {
                    icon: "security",
                    title: "Protected Session",
                    text: "Expired tokens are handled with a secure re-auth flow.",
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
              Session Expired
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Sign in again to restore access.
            </p>

            {displayedEmail ? (
              <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold text-primary">
                  Signed in as:
                </span>{" "}
                {displayedEmail}
              </div>
            ) : null}

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
                <span className="field-label">Work Email</span>
                <input
                  className="input-base"
                  autoComplete="email"
                  type="email"
                  placeholder="name@stanforteedge.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="field-label">Password</span>
                <div className="relative">
                  <input
                    className="input-base pr-11"
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
                className="w-full justify-center"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Unlock Session"}
                {!loading ? (
                  <Icon name="arrow_forward" className="ml-2 text-[18px]" />
                ) : null}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <button
                className="font-medium text-secondary hover:text-primary"
                type="button"
                onClick={() => navigate(-1)}
              >
                Go back
              </button>
              <Link
                className="font-medium text-danger hover:underline"
                to="/login"
              >
                Use login page
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
