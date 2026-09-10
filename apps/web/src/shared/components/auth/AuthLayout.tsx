import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({
  title,
  subtitle,
  error,
  success,
  children,
  footer,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  error?: string | null;
  success?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-6 sm:p-10">
      <section className="w-full max-w-md section-card p-6 sm:p-8" aria-labelledby="auth-page-title">
        <div className="mb-6">
          <p className="section-kicker">Stanforte Edge</p>
          <h1 id="auth-page-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>

        {error ? (
          <div role="alert" className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {success ? (
          <div role="status" aria-live="polite" className="mb-4 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {children}
        </form>

        {footer ? <div className="mt-5 text-sm text-slate-500">{footer}</div> : null}

        <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
          Need help? <Link to="/forgot-password" className="font-semibold text-brand-900">Reset password</Link>
        </div>
      </section>
    </main>
  );
}
